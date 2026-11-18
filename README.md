# ◆ Crypto Lab

Interactive demos of four cryptographic ideas. Go backend + React UI, one container.

    ./up       build & start  → http://localhost:8470
    ./down     stop
    ./clean    remove containers, images, volumes

(Windows: run the three commands from WSL or Git Bash.) Requires Docker.

> Teaching code, **not audited**. Do not use it to protect real secrets.

## Contents

1. [How to read the math](#how-to-read-the-math)
2. [Tab 1: Zero-knowledge proof of a quadratic root](#tab-1-zero-knowledge-pairing-proof-of-a-quadratic-root)
3. [Tab 2: Ring / Borromean signatures](#tab-2-ring--borromean-signatures)
4. [Tab 3: Group vs Ring signatures](#tab-3-group-vs-ring-signatures)
5. [Tab 4: Post-quantum CSIDH-512 key exchange](#tab-4-post-quantum-csidh-512-key-exchange)
6. [Layout, development, troubleshooting](#layout)
7. [Credits and references](#credits-and-references)

---

## How to read the math

All four demos work in groups of points on elliptic curves, so a few symbols repeat.

| Symbol | Meaning |
|---|---|
| `G` | A fixed public "generator" point on a curve. Every other point we use is a multiple of it. |
| `k·G` | Add `G` to itself `k` times ("scalar multiplication"). Easy to compute. |
| Discrete log | Given `G` and `k·G`, finding `k`. Believed infeasible for large groups. This is why publishing `k·G` does not reveal `k`. |
| `r`, `n` | The (prime) order of the group: `r·G` is the point at infinity, so scalars are taken **mod r**. |
| `H(...)` | A cryptographic hash, turned into a scalar. |
| `‖` | Concatenation of bytes. |
| `m` | The message being signed (Tabs 2 and 3 only; unrelated to the CSIDH bound `m` in Tab 4, which is called `B` there). |

---

## Tabs

### Tab 1: Zero-knowledge pairing proof of a quadratic root

**Goal.** Peggy (the prover) convinces Victor (the verifier) that she knows an `x` with

    x² + a·x + b = 0

where `a` and `b` are public, **without telling Victor `x`**.

#### The one tool you need: a pairing

A pairing is a function that takes a point from each of two groups and returns an element of a third:

    ê : G1 × G2 → GT          (all three groups have the same prime order r)

Its key property is **bilinearity**:

    ê(aU, bV) = ê(U, V)^(ab)  = ê(abU, V) = ê(U, abV) = ê(bU, aV)

This lets you multiply two *hidden* numbers "in the exponent": from `aU` and `bV` you can test things about `a·b` without ever learning `a` or `b`.

Second fact: with generators `G1`, `G2`, the value `ê(G1, G2)` has order exactly `r`, so

    ê(G, G)^k = 1   if and only if   k ≡ 0 (mod r)

So "is `k` zero?" can be answered by checking whether a pairing result equals 1.

#### From equation to check

Take the equation `x² + a·x + b = 0` and put it in the exponent of `ê(G, G)`:

    ê(G, G)^(x² + a·x + b) = 1

Split the exponent into three products and use bilinearity on each:

    ê(G, G)^(x²)  = ê(xG, xG)
    ê(G, G)^(a·x) = ê(xG, aG)
    ê(G, G)^(b)   = ê(G,  bG)

Multiply them and you get Victor's test:

    ê(xG, xG) · ê(xG, aG) · ê(G, bG)  =?  1

Victor can build `aG` and `bG` himself because `a` and `b` are public. The only thing he needs from Peggy is **`xG`**. If `xG` is a real multiple of `G` and `x` is a root, the product is 1. If `x` is not a root, the exponent `x² + a·x + b` is non-zero and the product is not 1.

Peggy keeps `x` hidden because recovering `x` from `xG` is the discrete-log problem.

#### Step by step (what the demo does)

1. You enter `x`, `a`, `b`.
2. The backend computes `xG` in both G1 and G2, plus `aG` and `bG` in G2.
3. It evaluates the three pairings and multiplies them (the library defers the expensive final step until the end, so the three are checked together).
4. The result is **Proven** if the product is 1, otherwise **Not proven**.

#### Negative numbers

Scalars are non-negative, so the code multiplies by `|x|`, `|a|`, `|b|` and then **negates the point** if the original number was negative (`−kG` is the point reflected). Pairings respect this: `ê(−P, Q) = ê(P, Q)⁻¹`.

#### Worked examples (you can verify these by hand)

| `x` | `a` | `b` | `x² + a·x + b` | Result |
|---|---|---|---|---|
| 7 | −1 | −42 | 49 − 7 − 42 = **0** | Proven |
| −6 | −1 | −42 | 36 + 6 − 42 = **0** | Proven |
| 5 | −1 | −42 | 25 − 5 − 42 = −22 | Not proven |

`x² − x − 42 = (x − 7)(x + 6)`, so the roots are `7` and `−6`.

More pairs you can try: `x² − 2x − 15` has roots `5` and `−3` (`4` fails); `x² + 5x − 150` has roots `10` and `−15` (`−8` fails).

**Large example.** `a = 1111111110`, `b = 121932631112635269` factors as

    x² + 1111111110·x + 121932631112635269 = (x + 123456789)(x + 987654321)

because `123456789 × 987654321 = 121932631112635269` and `123456789 + 987654321 = 1111111110`. So `x = −123456789` is **Proven**, and the near miss `x = −123456780` is **Not proven**. This shows the check is exact: being close is not enough.

#### Input rules

Whole numbers, up to 60 characters. The check is performed mod `r` (the BLS12-381 group order, a 255-bit prime, about 77 decimal digits), so inputs of this size are never reduced.

#### What this demo does **not** prove (read before reusing the idea)

- **Soundness of the points.** A real protocol must also make sure the `xG` in G1 and the `xG` in G2 use the *same* `x`. This is done with an extra pairing check `ê(xG1, G2) = ê(G1, xG2)`. Without it, a cheating prover could send unrelated points.
- **Not a hard problem as posed.** Square roots modulo a prime are easy to compute, so anyone can find a root of a public quadratic. The point of the demo is the *mechanism* (checking a polynomial relation on hidden values). Real systems apply this idea (as in zk-SNARKs) to huge systems of constraints where the witness is not easy to find.
- Not interactive in the sense of a challenge/response protocol; Peggy sends one value and Victor checks.

#### Implementation

- Library: [`github.com/kilic/bls12-381`](https://github.com/kilic/bls12-381) using `NewEngine`, `AddPair`, `Check`. The original article calls this "Kryptology", but `coinbase/kryptology v1.8.0` has no such package path, so the build uses kilic directly.
- Endpoint: `POST /api/zk` with `{x, a, b}`. The response includes short fingerprints of `xG`, `aG` and `bG` (never `x`), the "teacher's view" residual, and timing.

---

### Tab 2: Ring / Borromean signatures

**Goal.** Prove "one of these public keys signed this message" without revealing **which one**, with no setup and no manager.

#### The idea (Rivest, Shamir, Tauman 2001)

Suppose someone in a small group leaked a secret. Each member has a key pair `(Pᵢ, sᵢ)`. A ring signature lets one member sign using **their own secret key plus only the other members' public keys**. A verifier checks the signature against the whole list of public keys, learns that *some* member signed, and cannot tell who. Nobody else needs to cooperate or even know they were included in the ring.

The original construction links the members' keys in a closed loop (a "ring equation"). Starting anywhere, the signer can fill in values for the *other* members freely, but must "close the loop" at their own position, which is only possible with their secret key. The demo uses a Schnorr-style version of this loop over elliptic curves.

#### Borromean rings (Greg Maxwell)

In mathematics, Borromean rings are three loops that are linked together as a set, but fall apart when any one is removed. In cryptography, a **Borromean ring signature** signs across several rings at once:

- There are `k` rings; ring `i` has `nᵢ` public keys.
- The signer knows **one secret key in each ring**, at index `jᵢ` (not necessarily the same position in each ring).
- The whole signature is **one shared `e0` plus one `s` value per public key**, i.e. `1 + n₀ + n₁ + …` values. For the demo's two rings of three keys: `e0` and six `s` values.
- It is used for range proofs in Confidential Transactions (Elements/Liquid). Ring signatures in general are used in Monero.

#### How signing works

Notation: ring `i` has keys `P[i][0..nᵢ−1]`; the signer's key is at `jᵢ` with secret `xᵢ`. `Rᵢ,ⱼ` are curve points and `eᵢ,ⱼ` are hash-derived scalars.

Every link in a ring is:

    e[i][j]   = H( R[i][j] ‖ m ‖ i ‖ j )
    R[i][j+1] = s[i][j]·G  −  e[i][j]·P[i][j]

Given `e` and a random `s`, you can always compute the next `R`. This is the free part. The hard part is that the chain has to be **closed**, and the signer needs the secret key to do that.

1. **Start at the signer's position.** For each ring pick a random `kᵢ` and set `R[i][jᵢ+1] = kᵢ·G`. Walk forward around the ring (using random `s` values for the *other* members) until reaching the end value `R[i][nᵢ]`. (If the signer is the last key in the ring there is nothing to walk.)
2. **Tie all rings together.** Hash all ring end values with the message:

       e0 = H( R[0][n₀] ‖ R[1][n₁] ‖ … ‖ m )

   This single `e0` is what makes the rings "Borromean": no ring can be checked or forged on its own.
3. **Restart each ring from the beginning.** Set `e[i][0] = H(e0 ‖ m ‖ i)` and walk forward to the signer's index `jᵢ`, again with random `s` values, ending with a known `e[i][jᵢ]`.
4. **Close the loop with the secret key.**

       s[i][jᵢ] = kᵢ + e[i][jᵢ] · xᵢ      (mod group order)

5. **Output** `(e0, every s[i][j])`.

#### How verification works

Anyone with the public rings can, for each ring, recompute `e[i][0]` from `e0`, walk through **all** `nᵢ` links to get `R[i][nᵢ]`, hash all end values together with `m`, and check that the result equals `e0`.

The loop closes exactly at the signer's position because `xᵢ` and `Pᵢ = xᵢ·G` cancel:

    s·G − e·P = (k + e·x)·G − e·(x·G) = k·G

which is the very `R` committed to in step 1.

#### Why a wrong key fails

If the signer uses a secret `x'` that does **not** belong to the public key `P` in that slot, then

    s·G − e·P = k·G + e·(x' − x)·G ≠ k·G

so the recomputed `R` differs, the chain no longer reproduces `e0`, and verification returns **false**. This is exactly what the second half of the demo shows: it replaces one secret key and the signature must be rejected.

#### Why it is anonymous

Every `s` value in the output looks like a uniformly random number: the "free" ones are random by construction, and the closing one is `k + e·x` with `k` random. Nothing in the signature shows which index was the closing one.

#### Using the tab

1. Type a message.
2. Press the **valid** sign button: verification returns `true`.
3. Press the **wrong key** button: verification returns `false`.

#### Implementation

- Go standard library over **P-256**, in `backend/ring.go`. Maxwell's original is C (`secp256k1-zkp`) and the original article's Python used `ecpy`/secp256k1, so signature bytes will not match theirs.
- For production linkable rings in Go, see `github.com/noot/ring-go`.
- Endpoint: `POST /api/ring`.

---

### Tab 3: Group vs Ring signatures

A side-by-side comparison on the same message and roster.

| | Ring | Group |
|---|---|---|
| Setup | None, pick any public keys | Manager creates group, enrols members |
| Trusted party | No | Yes, the group manager |
| Signer can be unmasked | Never | Only by the manager ("opening") |
| Join / leave | Instant | Manager admits / revokes |
| Typical use | Whistleblowing, private money | Corporate attestation, V2X, TPM |

#### How the demo builds a group signature

A **group signature** = a ring signature over the roster **plus** an encrypted "name tag" that only the manager can read.

1. The manager has a key pair: secret `d`, public `Y = d·G`.
2. The signer encrypts their own public key `P` to the manager with ElGamal on the curve, choosing a random `t`:

       C1 = t·G
       C2 = P + t·Y

   The pair `(C1, C2)` is the **tag**.
3. The signer makes a ring signature over the roster, but the bytes being signed are the **message together with the tag**:

       signed bytes = m ‖ C1 ‖ C2

4. **Opening** (manager only): `P = C2 − d·C1`, which identifies the signer. This works because `d·C1 = t·d·G = t·Y`.

Anyone can verify the signature (it is a normal ring signature). Only the manager can open it.

#### The three scenarios

| Scenario | What happens | Outcome |
|---|---|---|
| **Honest member** | Member signs with the tag bound in. | Valid. *Manager opens the signature* names the signer. |
| **Frame attempt** | An attacker takes a valid signature and swaps the tag to point at someone else. The tag is part of the signed bytes, so the ring signature no longer matches. | **Rejected**. *Open* is disabled by design: a manager only opens valid signatures. |
| **Outsider** | A non-member signs with a random key that is not on the roster. The ring cannot close (see Tab 2, "Why a wrong key fails"). | **Rejected**. |

#### What the demo leaves out

The frame attempt above is about someone **altering** an existing signature. This demo does **not** stop a malicious *member* from honestly signing a tag that encrypts a different member's key or random junk, because it does not prove the tag is honest. Production schemes (BBS04, Camenisch–Lysyanskaya) add a zero-knowledge proof that the tag really encrypts the signer's key; this demo does not.

- Endpoint: `POST /api/group`.

---

### Tab 4: Post-quantum CSIDH-512 key exchange

**Goal.** Diffie-Hellman where the hard problem is believed to resist quantum computers, and where each side can publish a public key once and reuse it (no back-and-forth needed; this is called *non-interactive*).

Introduced by Castryck, Lange, Martindale, Panny and Renes (2018).

#### Why it is needed

RSA and elliptic-curve Diffie-Hellman would be broken by a large quantum computer. CSIDH replaces the group with a different structure: **isogenies** between elliptic curves.

- An **isogeny** is a structure-preserving map from one elliptic curve to another.
- A **supersingular** curve is a special kind of curve whose isogenies have a very rich structure. Here they are curves over a prime field `F_p`.
- Starting from a curve, you can "walk" to other curves by applying isogenies. Given the start and the end curve, finding the walk is the hard problem.

(CSIDH is a relative of SIDH, which was broken by classical attacks in 2022, so SIDH/SIKE should not be used. CSIDH is a different construction and is not affected by that attack, but its exact quantum security is still debated, so treat it as research-grade.)

#### Parameters (CSIDH-512)

- The prime is built to make many isogenies easy: `p = 4·ℓ₁·ℓ₂·…·ℓ₇₄ − 1`, where `ℓ₁ … ℓ₇₄` are 74 small distinct odd primes (the first 73 odd primes, 3 to 373, and 587). This `p` is 511 bits.
- Base curve: `E₀ : y² = x³ + x` over `F_p`.
- Every curve in the exchange can be written in Montgomery form `y² = x³ + A·x² + x`, so a curve is described by **one number `A`**. That number is the **public key**.

#### Keys

- **Private key**: a vector of 74 small integers `(e₁, …, e₇₄)`, each between `−5` and `5`. Each integer says "apply the isogeny for prime `ℓᵢ`, `eᵢ` times" (a negative value means the same step in the opposite direction). There are `11⁷⁴ ≈ 2²⁵⁶` possible vectors.
- **Public key**: the coefficient `A` of the curve you end up at, a 512-bit number.

#### The exchange

Writing `[a]·E` for "apply the private vector `a` to curve `E`":

    Alice:  EA = [a]·E0            publishes A
    Bob:    EB = [b]·E0            publishes B

    Alice:  checks EB is supersingular, then computes  ER = [a]·EB = [a][b]·E0
    Bob:    checks EA is supersingular, then computes  ER = [b]·EA = [b][a]·E0

The operations commute (`[a][b] = [b][a]`, because they come from an abelian group), so Alice and Bob land on the **same curve `ER`**. Its coefficient `R` is the shared secret.

The **supersingularity check** matters. Without it an attacker could send a bad curve and leak information about your private key. The check picks random points on the received curve and confirms their order divides `p + 1`; that is only possible on a supersingular curve.

#### Sizes

| Item | Size | Why |
|---|---|---|
| Private key | 37 bytes | 74 exponents × 4 bits each |
| Public key | 64 bytes | One 512-bit field element `A` |
| Shared secret | 64 bytes | One 512-bit field element `R` |

#### Using the tab

Press the button to generate a fresh Alice and Bob. You should see both sides print **the same 64-byte shared secret** while their private and public keys differ.

#### Implementation

- Library: [`github.com/cloudflare/circl/dh/csidh`](https://github.com/cloudflare/circl) with `GeneratePrivateKey`, `GeneratePublicKey`, `DeriveSecret`.
- Endpoint: `POST /api/csidh`. The response includes timing, because applying 74 isogeny steps is far slower than elliptic-curve Diffie-Hellman.

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
- **Page does not load at http://localhost:8470**: check Docker is running and that nothing
  else is using port 8470; `GET /api/health` should respond if the backend is up.
- **ZK shows "Not proven" for numbers you expected to work**: re-check the sign convention.
  The equation is `x² + a·x + b = 0`, so `x² − x − 42` means `a = −1`, `b = −42`.

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
