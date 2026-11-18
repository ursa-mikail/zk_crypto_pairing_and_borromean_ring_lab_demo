package main

import (
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"math/big"
	"net/http"
	"time"
)

// ---------------------------------------------------------------------------
// Borromean ring signatures (Maxwell) over NIST P-256, standard library only.
// A "ring" is one AOS-style Schnorr ring. Borromean links several rings with
// ONE shared challenge e0, so n rings cost 1 hash + (all s values).
// Closest production Go libs: github.com/noot/ring-go (AOS/linkable rings).
// Maxwell's original C code: secp256k1-zkp (no maintained pure-Go port).
// ---------------------------------------------------------------------------

var curve = elliptic.P256()
var N = curve.Params().N

type Pt struct{ X, Y *big.Int }
type Sig struct {
	E0 *big.Int
	S  [][]*big.Int
}

func randScalar() *big.Int {
	for {
		k, _ := rand.Int(rand.Reader, N)
		if k.Sign() > 0 {
			return k
		}
	}
}
func baseMul(k *big.Int) Pt { x, y := curve.ScalarBaseMult(k.Bytes()); return Pt{x, y} }
func mul(p Pt, k *big.Int) Pt { x, y := curve.ScalarMult(p.X, p.Y, k.Bytes()); return Pt{x, y} }
func add(a, b Pt) Pt          { x, y := curve.Add(a.X, a.Y, b.X, b.Y); return Pt{x, y} }
func neg(p Pt) Pt             { return Pt{p.X, new(big.Int).Sub(curve.Params().P, p.Y)} }
func ser(p Pt) []byte         { return elliptic.Marshal(curve, p.X, p.Y) }
func same(a, b Pt) bool       { return a.X.Cmp(b.X) == 0 && a.Y.Cmp(b.Y) == 0 }

func hs(parts ...[]byte) *big.Int {
	h := sha256.New()
	for _, p := range parts {
		h.Write(p)
	}
	return new(big.Int).Mod(new(big.Int).SetBytes(h.Sum(nil)), N)
}
func step(mh []byte, R Pt, i, t int) *big.Int { return hs(ser(R), mh, []byte{byte(i), byte(t)}) }
func closeHash(mh []byte, ends []Pt) *big.Int {
	var parts [][]byte
	for _, e := range ends {
		parts = append(parts, ser(e))
	}
	return hs(append(parts, mh)...)
}

func BorromeanSign(msg []byte, rings [][]Pt, secrets []*big.Int, js []int) *Sig {
	m := sha256.Sum256(msg)
	mh := m[:]
	n := len(rings)
	ends := make([]Pt, n)
	ks := make([]*big.Int, n)
	s := make([][]*big.Int, n)
	for i := range rings { // forward from each signer's slot to the end of its ring
		sz, j := len(rings[i]), js[i]
		s[i] = make([]*big.Int, sz)
		ks[i] = randScalar()
		R := baseMul(ks[i])
		if j == sz-1 {
			ends[i] = R
			continue
		}
		e := step(mh, R, i, j)
		for t := j + 1; t < sz; t++ {
			s[i][t] = randScalar()
			R = add(baseMul(s[i][t]), mul(rings[i][t], e))
			if t == sz-1 {
				ends[i] = R
			} else {
				e = step(mh, R, i, t)
			}
		}
	}
	e0 := closeHash(mh, ends) // ONE challenge ties all rings together
	for i := range rings {    // from slot 0 up to the signer, then close the loop with the secret
		j, e := js[i], e0
		for t := 0; t < j; t++ {
			s[i][t] = randScalar()
			R := add(baseMul(s[i][t]), mul(rings[i][t], e))
			e = step(mh, R, i, t)
		}
		sj := new(big.Int).Sub(ks[i], new(big.Int).Mul(e, secrets[i]))
		s[i][j] = sj.Mod(sj, N)
	}
	return &Sig{e0, s}
}

func BorromeanVerify(msg []byte, rings [][]Pt, sig *Sig) bool {
	if sig == nil || len(sig.S) != len(rings) {
		return false
	}
	m := sha256.Sum256(msg)
	mh := m[:]
	ends := make([]Pt, len(rings))
	for i := range rings {
		if len(sig.S[i]) != len(rings[i]) {
			return false
		}
		e := sig.E0
		for t := range rings[i] {
			R := add(baseMul(sig.S[i][t]), mul(rings[i][t], e))
			if t == len(rings[i])-1 {
				ends[i] = R
			} else {
				e = step(mh, R, i, t)
			}
		}
	}
	return closeHash(mh, ends).Cmp(sig.E0) == 0
}

// ---- group signature (didactic): ring signature + tag encrypted to a manager ----
func bind(msg []byte, c1, c2 Pt) []byte {
	return append(append(append([]byte{}, msg...), ser(c1)...), ser(c2)...)
}
func GroupOpen(mx *big.Int, roster []Pt, c1, c2 Pt) int {
	p := add(c2, neg(mul(c1, mx)))
	for i, q := range roster {
		if same(p, q) {
			return i
		}
	}
	return -1
}

// ---- helpers ----
func short(p Pt) string  { return fmt.Sprintf("%064x", p.X)[:12] }
func shortN(n *big.Int) string { return fmt.Sprintf("%064x", n)[:12] }
func sigOut(s *Sig) ([]string, [][]string) {
	out := make([][]string, len(s.S))
	for i, row := range s.S {
		for _, v := range row {
			out[i] = append(out[i], shortN(v))
		}
	}
	return []string{shortN(s.E0)}, out
}
func randIdx(n int) int { v, _ := rand.Int(rand.Reader, big.NewInt(int64(n))); return int(v.Int64()) }
func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

type keypair struct {
	sec *big.Int
	pub Pt
}

func newKeys(n int) []keypair {
	ks := make([]keypair, n)
	for i := range ks {
		ks[i].sec = randScalar()
		ks[i].pub = baseMul(ks[i].sec)
	}
	return ks
}

func ringHandler(w http.ResponseWriter, r *http.Request) {
	var q struct {
		Message  string `json:"message"`
		Rings    int    `json:"rings"`
		Size     int    `json:"size"`
		Scenario string `json:"scenario"`
	}
	if !decode(r, &q) {
		http.Error(w, "bad json", 400)
		return
	}
	q.Rings, q.Size = clamp(q.Rings, 1, 3), clamp(q.Size, 2, 6)
	pubs := make([][]Pt, q.Rings)
	pubStr := make([][]string, q.Rings)
	secs := make([]*big.Int, q.Rings)
	js := make([]int, q.Rings)
	for i := range pubs {
		ks := newKeys(q.Size)
		js[i] = randIdx(q.Size)
		secs[i] = ks[js[i]].sec
		for _, k := range ks {
			pubs[i] = append(pubs[i], k.pub)
			pubStr[i] = append(pubStr[i], short(k.pub))
		}
	}
	if q.Scenario == "outsider" {
		secs[0] = randScalar() // signer is NOT a member of ring 1
	}
	t := time.Now()
	sig := BorromeanSign([]byte(q.Message), pubs, secs, js)
	vmsg := q.Message
	if q.Scenario == "tamper" {
		vmsg += " (edited)"
	}
	ok := BorromeanVerify([]byte(vmsg), pubs, sig)
	e0, s := sigOut(sig)
	writeJSON(w, map[string]any{"rings": pubStr, "signers": js, "e0": e0[0], "s": s, "valid": ok,
		"scenario": q.Scenario, "ms": float64(time.Since(t).Microseconds()) / 1000})
}

func groupHandler(w http.ResponseWriter, r *http.Request) {
	var q struct {
		Message  string `json:"message"`
		Members  int    `json:"members"`
		Scenario string `json:"scenario"`
	}
	if !decode(r, &q) {
		http.Error(w, "bad json", 400)
		return
	}
	q.Members = clamp(q.Members, 3, 6)
	ks := newKeys(q.Members)
	roster := make([]Pt, len(ks))
	rosterStr := make([]string, len(ks))
	for i, k := range ks {
		roster[i], rosterStr[i] = k.pub, short(k.pub)
	}
	mx := randScalar() // manager (opening authority) key
	M := baseMul(mx)
	j := randIdx(q.Members)
	sec := ks[j].sec
	if q.Scenario == "outsider" {
		sec = randScalar()
	}
	msg := []byte(q.Message)

	// RING signature on the plain message: no tag, no manager.
	ringSig := BorromeanSign(msg, [][]Pt{roster}, []*big.Int{sec}, []int{j})
	ringOK := BorromeanVerify(msg, [][]Pt{roster}, ringSig)

	// GROUP signature: same ring proof, but bound to a tag only the manager can open.
	rr := randScalar()
	c1, c2 := baseMul(rr), add(roster[j], mul(M, rr))
	gSig := BorromeanSign(bind(msg, c1, c2), [][]Pt{roster}, []*big.Int{sec}, []int{j})
	if q.Scenario == "frame" { // attacker swaps the tag to point at someone else
		k := (j + 1) % q.Members
		r2 := randScalar()
		c1, c2 = baseMul(r2), add(roster[k], mul(M, r2))
	}
	gOK := BorromeanVerify(bind(msg, c1, c2), [][]Pt{roster}, gSig)
	opened := -1
	if gOK {
		opened = GroupOpen(mx, roster, c1, c2)
	}
	e0, s := sigOut(gSig)
	re0, rs := sigOut(ringSig)
	writeJSON(w, map[string]any{"roster": rosterStr, "manager": short(M), "signer": j, "scenario": q.Scenario,
		"ringValid": ringOK, "groupValid": gOK, "opened": opened,
		"tag": []string{short(c1), short(c2)}, "groupE0": e0[0], "groupS": s[0], "ringE0": re0[0], "ringS": rs[0]})
}
