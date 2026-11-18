# ◆ Crypto Lab

Interactive demos of four cryptographic ideas. Go backend + React UI, one container.

    ./up       build & start  → http://localhost:8470
    ./down     stop
    ./clean    remove containers, images, volumes

(Windows: run the three commands from WSL or Git Bash.) Requires Docker.

> Teaching code, **not audited**. Do not use it to protect real secrets.

---

## Tabs

### 1. Zero-Knowledge: pairing proof of a quadratic root
Peggy proves she knows an `x` that solves `x² + a·x + b = 0` without revealing `x`.

- Uses the BLS12-381 pairing `ê : G1 × G2 → GT`, with `ê(aU, bV) = ê(U, V)^(ab)`.
- Since `ê(G, G)^k = 1` only when `k = 0`, the equation becomes
  `ê(xG, xG) · ê(xG, aG) · ê(G, bG) = 1`.
- Peggy reveals only `xG`; Victor multiplies the pairings and checks for unity.
  Recovering `x` from `xG` is the discrete-log problem.
- Negative `x`, `a`, `b` are handled by negating the points.
- Example: `x² − x − 42 = 0` has roots `x = 7` and `x = −6`. `x = 5` fails.
- Inputs are whole numbers up to 60 characters, so the large example
  (`a = 1111111110`, `b = 121932631112635269`, `x = −123456789`) works.
- Library: [`github.com/kilic/bls12-381`](https://github.com/kilic/bls12-381)
  (`NewEngine`, `AddPair`, `Check`). The original article calls this "Kryptology", but
  `coinbase/kryptology v1.8.0` has no such package path, so the build uses kilic directly.
- Endpoint: `POST /api/zk` with `{x, a, b}`. The response includes short fingerprints of
  `xG`, `aG` and `bG` (never `x`), the "teacher's view" residual, and timing.

### 2. Ring / Borromean signatures
A signer proves "one of these public keys signed this", with no setup and no manager.

- A ring signature is created by one member using their own secret key and the other
  members' public keys. Nobody can tell which member signed.
  Introduced by Rivest, Shamir and Tauman (2001) with the "White House leak" example.
- **Borromean** rings (Greg Maxwell) sign across several rings at once, with one signer
  per ring and a shared `e0` plus one `s` value per key. It is used for range proofs in
  Confidential Transactions (Elements/Liquid), and ring signatures are used in Monero.
- The demo signs with a valid key and then with a swapped (wrong) key, which must fail
  verification, as in the original article.
- Implementation: Go standard library over **P-256**, in `backend/ring.go`. Maxwell's
  original is C (`secp256k1-zkp`) and the article's Python used `ecpy`/secp256k1.
  For production linkable rings in Go, see `github.com/noot/ring-go`.
- Endpoint: `POST /api/ring`.

### 3. Group vs Ring signatures
Side-by-side comparison on the same message and roster.

| | Ring | Group |
|---|---|---|
| Setup | None, pick any public keys | Manager creates group, enrols members |
| Trusted party | No | Yes, the group manager |
| Signer can be unmasked | Never | Only by the manager ("opening") |
| Join / leave | Instant | Manager admits / revokes |
| Typical use | Whistleblowing, private money | Corporate attestation, V2X, TPM |

- Didactic group signature = ring signature over the roster **plus** an ElGamal tag
  `(C1, C2)` of the signer's public key encrypted to the manager, **bound into the signed
  bytes**.
- Scenarios:
  - **Honest member**: valid. "Manager opens the signature" names the signer.
  - **Frame attempt**: an attacker swaps the tag to point at someone else. The tag is part
    of the signed data, so verification fails, the signature is **Rejected**, and the
    *Open* button is disabled by design (a manager only opens valid signatures).
  - **Outsider**: a non-member signs with a random key and is rejected.
- Production schemes (BBS04, Camenisch–Lysyanskaya) also prove the tag is honest in
  zero knowledge; this demo does not.
- Endpoint: `POST /api/group`.

### 4. Post-Quantum: CSIDH-512 key exchange
Non-interactive Diffie-Hellman using supersingular-isogeny class-group actions
(Castryck, Lange, Martindale, Panny, Renes, 2018).

- Base curve `y² = x³ + x` over a 511-bit prime `p`. The public key is the coefficient `A`
  of `y² = x³ + Ax² + x`; the private key is a vector of small integers in `[−m, m]`.
- Alice and Bob each apply their secret to the other's curve. The action is commutative, so
  both reach the same curve `R`, and `R` is the shared secret (64 bytes). Each side first
  checks that the received curve is supersingular.
- Sizes: private key about 37 bytes, public key 64 bytes, shared secret 64 bytes.
- Library: [`github.com/cloudflare/circl/dh/csidh`](https://github.com/cloudflare/circl)
  (`GeneratePrivateKey`, `GeneratePublicKey`, `DeriveSecret`).
- Endpoint: `POST /api/csidh`.

---

## Layout

    backend/    Go API (main.go, zk.go, ring.go, csidh.go); GET /api/health
    frontend/   React + Vite UI (src/App.jsx, src/styles.css)
    Dockerfile  3 stages: node build → go build → alpine runtime (port 8470)

The Go build step runs `go get github.com/kilic/bls12-381@master && go mod tidy`.
For reproducible builds, run that once locally and commit `go.mod` and `go.sum`.

## Development

    cd frontend && npm i && npm run dev
    cd backend  && go get github.com/kilic/bls12-381@master && go mod tidy && go run .

## Troubleshooting

- **Disabled "Manager opens the signature" button**: the signature was rejected
  (frame/outsider scenario). Run "Honest member signs".
- **`go mod tidy` cannot find a bls12-381 package**: you are on an old copy that imports
  `coinbase/kryptology`; use the `kilic/bls12-381` import in `backend/zk.go`.

## Credits and references

Concepts and sample code are adapted from the articles below.

- Buchanan, W. J. (2026). *Zero-knowledge proof using Crypto Pairing and Kryptology*.
  Asecuritysite.com. https://asecuritysite.com/bls/zk
- Buchanan, W. J. (2026). *CSIDH with Go*. Asecuritysite.com.
  https://asecuritysite.com/circl/go_csidh
- Buchanan, W. J. (2021). *Preserving Privacy: Borromean Ring Signing*. Medium, 7 April 2021.
- Castryck, Lange, Martindale, Panny, Renes. *CSIDH: An Efficient Post-Quantum Commutative
  Group Action*. ASIACRYPT 2018, LNCS 11274, pp. 395–427.
- De Feo, Jao, Plût. *Towards quantum-resistant cryptosystems from supersingular elliptic
  curve isogenies*. J. Math. Cryptology 8(3), 2014.
- Costello, Longa, Naehrig. *Efficient algorithms for supersingular isogeny Diffie-Hellman*.
  CRYPTO 2016.
- Childs, Jao, Soukharev. *Constructing elliptic curve isogenies in quantum subexponential
  time*. J. Math. Cryptology 8(1), 2014.
- Rivest, Shamir, Tauman. *How to Leak a Secret*. 2001.
- Greg Maxwell, Borromean ring signatures (`secp256k1-zkp`).

The Asecuritysite.com pages state that their content must be referenced when used and that
AI/ML bots are not licensed to crawl them; keep these references with any redistribution.
