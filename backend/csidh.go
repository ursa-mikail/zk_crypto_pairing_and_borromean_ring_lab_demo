package main

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/cloudflare/circl/dh/csidh"
)

func csidhHandler(w http.ResponseWriter, r *http.Request) {
	var as, bs, es [64]byte
	var ap, bp, ep csidh.PrivateKey
	var apub, bpub csidh.PublicKey
	t := time.Now()
	lap := func() float64 { d := time.Since(t); t = time.Now(); return float64(d.Microseconds()) / 1000 }

	csidh.GeneratePrivateKey(&ap, rand.Reader)
	csidh.GeneratePrivateKey(&bp, rand.Reader)
	csidh.GeneratePrivateKey(&ep, rand.Reader)
	csidh.GeneratePublicKey(&apub, &ap, rand.Reader)
	csidh.GeneratePublicKey(&bpub, &bp, rand.Reader)
	keygen := lap()

	csidh.DeriveSecret(&bs, &apub, &bp, rand.Reader) // Bob: Alice's public + Bob's private
	csidh.DeriveSecret(&as, &bpub, &ap, rand.Reader) // Alice: Bob's public + Alice's private
	derive := lap()
	csidh.DeriveSecret(&es, &apub, &ep, rand.Reader) // Eve: Alice's public + Eve's own private

	writeJSON(w, map[string]any{
		"alicePub": fp(apub), "bobPub": fp(bpub),
		"aliceSecret": hex.EncodeToString(as[:]), "bobSecret": hex.EncodeToString(bs[:]), "eveSecret": hex.EncodeToString(es[:]),
		"match": as == bs, "eveMatch": es == as,
		"keygenMs": keygen, "deriveMs": derive,
	})
}
