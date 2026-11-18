package main

import (
	"crypto/sha256"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	bls12381 "github.com/kilic/bls12-381"
)

// fp gives a short, non-reversible fingerprint of any value (for display only).
func fp(v any) string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%v", v)))
	return fmt.Sprintf("%x", h[:8])
}

func parseInt(s string) (*big.Int, bool) {
	s = strings.NewReplacer(",", "", " ", "").Replace(s)
	if len(s) == 0 || len(s) > 60 {
		return nil, false
	}
	return new(big.Int).SetString(s, 10)
}

// pairingCheck verifies  e(xG1,xG2) * e(xG1,aG2) * e(G1,bG2) == 1  <=>  x^2 + a*x + b == 0
// (same construction as the Kryptology page: Peggy only ever reveals xG, never x).
func pairingCheck(x, a, b *big.Int) (bool, string, string, string) {
	bls := bls12381.NewEngine()
	g1, g2 := bls.G1, bls.G2
	G1, G2 := g1.One(), g2.One()
	xG1, xG2, Ga, Gb := g1.New(), g2.New(), g2.New(), g2.New()

	g1.MulScalarBig(xG1, G1, new(big.Int).Abs(x))
	g2.MulScalarBig(xG2, G2, new(big.Int).Abs(x))
	if x.Sign() < 0 {
		g1.Neg(xG1, xG1)
		g2.Neg(xG2, xG2)
	}
	g2.MulScalarBig(Ga, G2, new(big.Int).Abs(a))
	g2.MulScalarBig(Gb, G2, new(big.Int).Abs(b))
	if a.Sign() < 0 {
		g2.Neg(Ga, Ga)
	}
	if b.Sign() < 0 {
		g2.Neg(Gb, Gb)
	}
	bls.AddPair(xG1, xG2)
	bls.AddPair(xG1, Ga)
	bls.AddPair(G1, Gb)
	ok := bls.Check()
	return ok, fp(xG1), fp(Ga), fp(Gb)
}

func zkHandler(w http.ResponseWriter, r *http.Request) {
	var q struct{ X, A, B string }
	if !decode(r, &q) {
		http.Error(w, "bad json", 400)
		return
	}
	x, ok1 := parseInt(q.X)
	a, ok2 := parseInt(q.A)
	b, ok3 := parseInt(q.B)
	if !ok1 || !ok2 || !ok3 {
		http.Error(w, "x, a and b must be whole numbers", 400)
		return
	}
	t := time.Now()
	ok, fx, fa, fb := pairingCheck(x, a, b)
	ms := float64(time.Since(t).Microseconds()) / 1000
	res := new(big.Int).Mul(x, x)
	res.Add(res, new(big.Int).Mul(a, x))
	res.Add(res, b)
	writeJSON(w, map[string]any{"ok": ok, "xG": fx, "aG": fa, "bG": fb, "residual": res.String(), "ms": ms})
}
