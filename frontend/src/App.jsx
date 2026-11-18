import { useState } from 'react'
import './styles.css'

const NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Erin', 'Frank']
const COL = ['#7c5cff', '#00b8ff', '#ff5c9a', '#ffb454', '#3ddc97', '#c084fc']
const clean = s => String(s).replace(/[,\s]/g, '')

async function api(path, body) {
  const r = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
  if (!r.ok) throw new Error((await r.text()) || r.statusText)
  return r.json()
}
function useRun(path) {
  const [res, setRes] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const run = async b => { setBusy(true); setErr(''); try { setRes(await api(path, b)) } catch (e) { setErr(String(e.message || e)) } setBusy(false) }
  return { res, busy, err, run }
}

const Banner = ({ ok, title, text }) => <div className={'banner ' + (ok ? 'ok' : 'bad')}><b>{ok ? '✓' : '✕'} {title}</b><span>{text}</span></div>
const Step = ({ n, title, d = 0, children }) => <div className="step" style={{ animationDelay: d * 140 + 'ms' }}><i>{n}</i><div><h4>{title}</h4><p>{children}</p></div></div>
const Why = ({ children }) => <div className="why"><b>💡 In plain English</b><p>{children}</p></div>
const Btn = ({ busy, children, ...p }) => <button className="btn" disabled={busy} {...p}>{busy && <span className="spin" />}{children}</button>
const Err = ({ e }) => e ? <Banner ok={false} title="Backend error" text={e} /> : null

/* ---------------- HOME ---------------- */
function Home({ go }) {
  const cards = [
    ['zk', '🕵️', 'Zero-Knowledge Proof', 'Prove you know a secret without revealing it. Uses BLS12-381 pairings (Kryptology) — the maths inside zk-SNARKs.'],
    ['ring', '💍', 'Ring Signatures', 'Sign as "one of these people" with no one able to tell which. Borromean rings, as used by Monero & Confidential Transactions.'],
    ['group', '👥', 'Group vs Ring', 'Both hide the signer. Only one has a referee who can unmask you. See them side by side on the same roster.'],
    ['pq', '🛡️', 'Post-Quantum Key Exchange', 'CSIDH (Cloudflare CIRCL): a Diffie-Hellman replacement designed to survive quantum computers.'],
  ]
  return <>
    <h1>Cryptography you can <i style={{ color: '#00d4ff' }}>see</i>.</h1>
    <p className="lead">Four hands-on demos, each running <b>real cryptography in Go</b> on the server. Every demo follows the same rhythm, so you're never guessing:</p>
    <div className="flow">
      <Step n="1" title="Read the 20-second story">Each tab starts with who the actors are, what is secret, and what is public.</Step>
      <Step n="2" title="Press the big button" d={1}>The server really runs the maths. You'll see numbered steps explaining what each party did.</Step>
      <Step n="3" title="Then try to cheat" d={2}>Every tab has an <b>attack button</b> (wrong secret, edited message, outsider, forged tag). Watching the attack fail is the fastest way to understand why the scheme is secure.</Step>
    </div>
    <h2>Pick a lab</h2>
    <div className="grid">{cards.map(([k, ic, t, d]) => <div key={k} className="card click" onClick={() => go(k)}><div className="big">{ic}</div><h4>{t}</h4><p className="muted">{d}</p></div>)}</div>
    <h2>Mini glossary</h2>
    <div className="grid">
      {[['Prover / Verifier', 'The one who proves (Peggy) and the one who checks (Victor).'], ['Public vs secret key', 'Public: everyone may see it. Secret: only its owner. Signatures are made with the secret, checked with the public.'], ['Pairing e(·,·)', 'A special function on two curve points that lets you multiply hidden exponents: e(aG, bG) = e(G,G)^(ab).'], ['Post-quantum', 'Designed so that a large quantum computer cannot break it (RSA/ECDH can be).']].map(([a, b]) => <div className="card" key={a}><h4>{a}</h4><p className="muted">{b}</p></div>)}
    </div>
  </>
}

/* ---------------- ZK ---------------- */
const stories = [
  { ic: '🔐', t: 'Password-less login', secret: 'your password-derived number x', pub: 'the "lock" (a, b) stored by the website', ver: 'the website', out: 'You are logged in — the site never saw your password.' },
  { ic: '🪙', t: 'Shielded payment (Zcash-style)', secret: 'the private transaction data', pub: 'a public statement "this tx is valid"', ver: 'every blockchain node', out: 'Nodes accept the payment without learning amount or parties.' },
  { ic: '🪪', t: 'Credential / age gate', secret: 'your birth date or credential', pub: 'the rule "holder is over 18"', ver: 'the shop', out: 'Shop learns "over 18: yes" and nothing else.' },
  { ic: '🏦', t: 'Proof of solvency', secret: 'customer balances & keys', pub: 'the claim "assets ≥ liabilities"', ver: 'auditors and customers', out: 'Exchange proves solvency without publishing its books.' },
]
const presets = [
  { n: '✅ Classic', x: '7', a: '-1', b: '-42' }, { n: '✅ The other root', x: '-6', a: '-1', b: '-42' },
  { n: '🎭 Cheater (x=5)', x: '5', a: '-1', b: '-42', bad: true }, { n: '🐘 Huge numbers', x: '-123456789', a: '1111111110', b: '121932631112635269' },
]
function eqStr(a, b) {
  try {
    const f = (s, v) => { const n = BigInt(clean(s)); if (n === 0n) return ''; const m = n < 0n ? -n : n; return ` ${n < 0n ? '−' : '+'} ${m === 1n && v ? '' : m}${v}` }
    return `x²${f(a, 'x')}${f(b, '')} = 0`
  } catch { return 'x² + a·x + b = 0' }
}
function ZK() {
  const [v, setV] = useState(presets[0]), [st, setSt] = useState(0), { res, busy, err, run } = useRun('zk')
  const S = stories[st]
  const go = p => { setV(p); run({ x: p.x, a: p.a, b: p.b }) }
  return <>
    <h1>🕵️ Zero-Knowledge Proof</h1>
    <p className="lead">Peggy wants to convince Victor that she <b>knows a secret number x</b> that solves a puzzle — without ever telling him x.</p>
    <h2>1 · Choose a real-world story</h2>
    <div className="grid">{stories.map((s, i) => <div key={i} className={'card click ' + (i === st ? 'sel' : '')} onClick={() => setSt(i)}><div className="big">{s.ic}</div><h4>{s.t}</h4></div>)}</div>
    <div className="card" style={{ marginTop: 12 }}>
      <div className="three">
        <div className="actor"><span className="big">🙋</span><b>Peggy (prover)</b><p className="muted">Knows the <b>secret</b>: {S.secret}</p></div>
        <div className="actor"><span className="big">📜</span><b>Public puzzle</b><p className="muted">Everyone sees: {S.pub}. Here, it is a quadratic equation.</p></div>
        <div className="actor"><span className="big">🧑‍⚖️</span><b>Victor (verifier)</b><p className="muted">= {S.ver}. Goal: {S.out}</p></div>
      </div>
    </div>
    <div className="warn-box">The demo uses one tiny puzzle ("find a root of x²+ax+b") so you can see the pairing trick end-to-end. Real zk-SNARKs use the <b>same pairing check</b> on much bigger puzzles. Honest caveat: here Peggy sends xG, so for small x a guesser could test candidates — real systems add randomness/blinding to hide it.</div>
    <h2>2 · Pick a puzzle and an answer</h2>
    <div className="row">{presets.map(p => <button key={p.n} className={'btn ' + (p.bad ? 'warn' : 'ghost')} onClick={() => go(p)} disabled={busy}>{p.n}</button>)}</div>
    <div className="row" style={{ marginTop: 14 }}>
      {['x', 'a', 'b'].map(k => <label key={k}>{k === 'x' ? "Peggy's secret x" : 'public ' + k}<input value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} /></label>)}
      <Btn busy={busy} onClick={() => run({ x: v.x, a: v.a, b: v.b })} style={{ alignSelf: 'flex-end' }}>Run the proof</Btn>
    </div>
    <div className="eq">{eqStr(v.a, v.b)}</div>
    <Err e={err} />
    {res && <>
      <Banner ok={res.ok} title={res.ok ? 'Victor is convinced ✨' : 'Victor rejects the proof'} text={res.ok ? 'The pairing product equals 1 → Peggy truly knows a root.' : 'The pairing product is not 1 → the number Peggy used is not a root of the puzzle.'} />
      <div className="flow">
        <Step n="1" title="Both sides read the public puzzle">Victor and Peggy know a={clean(v.a)} and b={clean(v.b)}. Victor turns them into curve points a·G = <span className="hex">{res.aG}</span> and b·G = <span className="hex">{res.bG}</span> (shown as short fingerprints).</Step>
        <Step n="2" title="Peggy sends ONLY the point x·G" d={1}>Fingerprint: <span className="hex">{res.xG}</span>. Recovering x from x·G is the elliptic-curve discrete-log problem — infeasible for real-size x.</Step>
        <Step n="3" title="Victor multiplies three pairings" d={2}>e(xG, xG) · e(xG, aG) · e(G, bG) = e(G,G)^(x² + a·x + b). That equals <b>1</b> exactly when x² + a·x + b = 0 — and never otherwise.</Step>
        <Step n="4" title="Verdict" d={3}>{res.ok ? '✓ equals 1 → accepted.' : '✕ not 1 → rejected.'} Computed in {res.ms.toFixed(1)} ms by BLS12-381 in Go.</Step>
      </div>
      <Why>Think of x·G as a locked box. Victor can't open it, but the pairing lets him do arithmetic on locked boxes and check the puzzle holds. Teacher's view (Victor never sees this): x² + a·x + b = <span className="hex">{res.residual}</span>.</Why>
    </>}
  </>
}

/* ---------------- RING ---------------- */
function Roster({ rings, signers, reveal, mgr }) {
  return rings.map((r, i) => <div className="ring" key={i}>
    {rings.length > 1 && <div className="rl">Ring {i + 1}</div>}
    <div className="avs">{r.map((p, j) => <div key={j} className={'av ' + (reveal && signers[i] === j ? 'sg' : '')} style={{ '--c': COL[j % 6] }}><span>{NAMES[j][0]}</span><small>{NAMES[j]}</small><code>{p}</code></div>)}
      {mgr && <div className="av mgr"><span>M</span><small>Manager</small><code>{mgr}</code></div>}</div></div>)
}
const SigBox = ({ e0, s }) => <details><summary>Show the raw signature (e0 + {s.flat().length} s-values)</summary><p className="muted">e0 = <span className="hex">{e0}</span></p>
  {s.map((row, i) => <p key={i} className="muted">{s.length > 1 ? `ring ${i + 1}: ` : 'values: '}{row.map((x, k) => <span key={k} className="hex" style={{ marginRight: 4 }}>{x}</span>)}</p>)}</details>

const ringCases = {
  honest: ['Honest signature', 'Alice signs with her own secret key plus everyone\'s public keys.', true],
  tamper: ['Edit the message after signing', 'Someone changes the message after the signature was made.', false],
  outsider: ['Outsider forges', 'Mallory is NOT in ring 1 but tries to sign with a random key.', false],
}
function Ring() {
  const [msg, setMsg] = useState('I saw the leaked document. — a member of the team'), [rings, setRings] = useState(2), [size, setSize] = useState(3)
  const [sc, setSc] = useState('honest'), [reveal, setReveal] = useState(false), { res, busy, err, run } = useRun('ring')
  const go = s => { setSc(s); run({ message: msg, rings, size, scenario: s }) }
  return <>
    <h1>💍 Ring Signatures · Borromean</h1>
    <p className="lead"><b>The leak dilemma:</b> someone on the team leaked a document. A whistleblower wants to sign a message that proves "<i>one of us</i> wrote this" — without anyone, even the verifier, learning <i>which</i> one.</p>
    <div className="grid">
      <div className="card"><h4>① Ring</h4><p className="muted">A set of public keys the signer <b>freely chooses</b>. Nobody has to agree or be asked — no setup, no manager.</p></div>
      <div className="card"><h4>② Sign</h4><p className="muted">Signer uses <b>their own secret key</b> + everyone's <b>public</b> keys, closing a loop of hashes that only one secret can close.</p></div>
      <div className="card"><h4>③ Verify</h4><p className="muted">Anyone checks the loop with public keys only. Valid = "some ring member signed". Who? <b>Unknowable.</b></p></div>
      <div className="card"><h4>🔗 Borromean</h4><p className="muted">Several rings, <b>one signer in each</b>, tied by a single shared hash e0. Compact, and it's how Confidential Transactions proves ranges.</p></div>
    </div>
    <h2>Set the scene</h2>
    <div className="row">
      <label style={{ flex: 1, minWidth: 260 }}>Message<input value={msg} onChange={e => setMsg(e.target.value)} /></label>
      <label>Rings<select value={rings} onChange={e => setRings(+e.target.value)}>{[1, 2, 3].map(n => <option key={n}>{n}</option>)}</select></label>
      <label>Members / ring<select value={size} onChange={e => setSize(+e.target.value)}>{[2, 3, 4, 5, 6].map(n => <option key={n}>{n}</option>)}</select></label>
    </div>
    <p className="muted">1 ring = a classic ring signature. 2–3 rings = Borromean (the signer in each ring is chosen randomly by the server each run).</p>
    <div className="row">
      <Btn busy={busy} onClick={() => go('honest')}>✍ Sign & verify (honest)</Btn>
      <button className="btn warn" disabled={busy} onClick={() => go('tamper')}>Attack: edit message</button>
      <button className="btn warn" disabled={busy} onClick={() => go('outsider')}>Attack: outsider forges</button>
    </div>
    <Err e={err} />
    {res && <>
      <Banner ok={res.valid} title={res.valid ? 'Signature VALID' : 'Signature REJECTED'} text={res.valid ? `The verifier is sure that one member of ${res.rings.length > 1 ? 'each of the ' + res.rings.length + ' rings' : 'the ring'} signed — and has no way to tell who.` : (sc === 'tamper' ? 'The message no longer matches the hash loop, so the loop does not close.' : 'The forger has no secret key matching any public key in the ring, so the loop cannot be closed.')} />
      <div className="row" style={{ justifyContent: 'space-between' }}><h4>{ringCases[res.scenario][0]}: {ringCases[res.scenario][1]}</h4>
        <button className="btn ghost" onClick={() => setReveal(!reveal)}>{reveal ? '🙈 Hide' : '👀 Reveal'} who signed (teacher mode)</button></div>
      <Roster rings={res.rings} signers={res.signers} reveal={reveal} />
      <SigBox e0={res.e0} s={res.s} />
      <div className="flow">
        <Step n="1" title="Keys">Each member has a secret key and a public key on P-256. Public keys are shown under each name.</Step>
        <Step n="2" title="Signing" d={1}>The signer picks a random starting point in their slot, walks the hash chain around the ring using <i>random</i> s-values for everybody else, then uses their secret key to make the chain close. Real and fake slots look statistically identical.</Step>
        <Step n="3" title="Verifying" d={2}>The verifier re-walks every ring from e0 using only public keys and checks the end result hashes back to e0. {res.ms.toFixed(1)} ms.</Step>
      </div>
      <Why>The signature contains no name, no index, no flag. Even if you reveal the signer above, that information is <b>not in the data</b> — it exists only on the server for teaching. Compare with the next tab to see how a group signature differs.</Why>
    </>}
    <h2>Where this is used</h2>
    <div className="grid">{[['🪙', 'Monero', 'Ring signatures hide which output is being spent — fixes Bitcoin\'s pseudo-anonymity.'], ['🔍', 'Confidential Transactions', 'Borromean rings power range proofs (Elements/Liquid): amounts are hidden but proven non-negative.'], ['📣', 'Whistleblowing', 'Sign as "a senior official" without a registry, an account, or a trusted party.'], ['🗳', 'Anonymous voting & petitions', 'Prove you are on the voter list without revealing which voter you are.']].map(([i, t, d]) => <div key={t} className="card"><div className="big">{i}</div><h4>{t}</h4><p className="muted">{d}</p></div>)}</div>
    <div className="warn-box"><b>Go library note:</b> Maxwell's Borromean code lives in C (secp256k1-zkp) and this article's Python used <code>ecpy</code>. There is no maintained pure-Go port, so this backend implements the same algorithm over the Go standard library (P-256) — see <code>backend/ring.go</code>. For production linkable rings in Go look at <code>github.com/noot/ring-go</code>. This is a teaching implementation, not audited.</div>
  </>
}

/* ---------------- GROUP vs RING ---------------- */
const gCases = {
  honest: ['Honest member signs', 'Alice signs the same message twice: once as a RING signature, once as a GROUP signature.'],
  frame: ['Frame attempt', 'An attacker swaps the group signature\'s tag so the manager would unmask an innocent member.'],
  outsider: ['Outsider forges', 'A non-member tries to sign.'],
}
function Group() {
  const [msg, setMsg] = useState('Invoice 4711 approved'), [n, setN] = useState(4), [reveal, setReveal] = useState(false), [opened, setOpened] = useState(false)
  const { res, busy, err, run } = useRun('group')
  const go = s => { setOpened(false); setReveal(false); run({ message: msg, members: n, scenario: s }) }
  return <>
    <h1>👥 Group signature vs 💍 Ring signature</h1>
    <p className="lead">Both prove "<i>a member of this set signed</i>" while hiding <i>which</i> member. The crucial difference is <b>accountability</b>: can anyone ever unmask the signer?</p>
    <div className="two">
      <div className="card"><h4>💍 Ring — "unconditional anonymity"</h4><p className="muted">Ad-hoc: signer picks any public keys. <b>No manager. Nobody can open it</b> — not the verifier, not the other members, not even the signer later. Great for whistleblowers and private money.</p></div>
      <div className="card"><h4>👥 Group — "anonymity with a referee"</h4><p className="muted">A <b>manager</b> enrols members. Signatures carry an encrypted tag only the manager can decrypt, so in a dispute they can <b>open</b> it and name the signer. Great for companies, vehicles, hardware attestation.</p></div>
    </div>
    <div className="card" style={{ marginTop: 14, overflowX: 'auto' }}><table>
      <thead><tr><th></th><th>💍 Ring signature</th><th>👥 Group signature</th></tr></thead>
      <tbody>{[['Setup', 'None — pick any public keys', 'Manager creates group, enrols members'], ['Trusted party', 'No', 'Yes: the group manager'], ['Can the signer be unmasked?', 'Never', 'Yes — manager only ("opening")'], ['Joining / leaving', 'Instant, nobody is asked', 'Manager must admit / revoke'], ['Typical use', 'Monero, whistleblowing, private voting', 'Corporate attestation, V2X car pseudonyms, TPM anonymous attestation']].map(r => <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table></div>
    <h2>Run both on the same roster</h2>
    <div className="row">
      <label style={{ flex: 1, minWidth: 240 }}>Message<input value={msg} onChange={e => setMsg(e.target.value)} /></label>
      <label>Members<select value={n} onChange={e => setN(+e.target.value)}>{[3, 4, 5, 6].map(k => <option key={k}>{k}</option>)}</select></label>
    </div>
    <div className="row" style={{ marginTop: 12 }}>
      <Btn busy={busy} onClick={() => go('honest')}>✍ Sign both ways</Btn>
      <button className="btn warn" disabled={busy} onClick={() => go('frame')}>Attack: frame an innocent</button>
      <button className="btn warn" disabled={busy} onClick={() => go('outsider')}>Attack: outsider forges</button>
    </div>
    <Err e={err} />
    {res && <>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 14 }}><h4>{gCases[res.scenario][0]}: {gCases[res.scenario][1]}</h4>
        <button className="btn ghost" onClick={() => setReveal(!reveal)}>{reveal ? '🙈 Hide' : '👀 Reveal'} true signer (teacher mode)</button></div>
      <Roster rings={[res.roster]} signers={[res.signer]} reveal={reveal} mgr={res.manager} />
      <div className="two">
        <div className="card"><h4>💍 Ring signature</h4>
          <Banner ok={res.ringValid} title={res.ringValid ? 'Valid' : 'Rejected'} text={res.ringValid ? 'A roster member signed.' : 'Not signed by a roster member.'} />
          <SigBox e0={res.ringE0} s={[res.ringS]} />
          <Why>There is no tag and no manager key. <b>Opening is impossible</b> — the information simply isn't in the signature.</Why>
          <button className="btn ghost" disabled>🔒 No "open" button exists</button></div>
        <div className="card"><h4>👥 Group signature</h4>
          <Banner ok={res.groupValid} title={res.groupValid ? 'Valid' : 'Rejected'} text={res.groupValid ? 'A roster member signed; verifier still can\'t tell who.' : (res.scenario === 'frame' ? 'The tag was swapped, but the tag is bound into the signed data, so verification fails — you cannot frame someone.' : 'Not signed by a roster member.')} />
          <p className="muted">Tag (C1, C2) = <span className="hex">{res.tag[0]}</span> <span className="hex">{res.tag[1]}</span><br />Encrypted to manager key <span className="hex">{res.manager}</span></p>
          <SigBox e0={res.groupE0} s={[res.groupS]} />
          <button className="btn" disabled={!res.groupValid} title={res.groupValid ? '' : 'A rejected signature cannot be opened'} onClick={() => setOpened(true)}>🔓 Manager opens the signature</button>
          {!res.groupValid && <p className="muted">Opening is disabled: the manager only opens <b>valid</b> signatures. Run “Honest member signs” to try it.</p>}
          {opened && res.opened >= 0 && <Banner ok title={`Unmasked: ${NAMES[res.opened]}`} text="Only the holder of the manager's secret key can do this — in an audit or a dispute." />}</div>
      </div>
      <div className="warn-box"><b>Didactic model:</b> the group signature here = a ring signature over the roster + an ElGamal tag of the signer's key encrypted to the manager, bound into the signed bytes. Production schemes (BBS04, Camenisch–Lysyanskaya) also <i>prove</i> the tag is honest in zero-knowledge, so a malicious member cannot sign with a bogus tag. Not audited.</div>
    </>}
  </>
}

/* ---------------- POST-QUANTUM ---------------- */
const short = (h, n = 28) => h.slice(0, n) + '…'
function PQ() {
  const { res, busy, err, run } = useRun('csidh')
  return <>
    <h1>🛡️ Post-Quantum Key Exchange · CSIDH</h1>
    <p className="lead">Today's key exchange (ECDH) and RSA fall to a large quantum computer. CSIDH builds Diffie-Hellman on <b>isogenies between elliptic curves</b> — a problem believed to resist quantum attacks.</p>
    <div className="flow">
      <Step n="1" title="Each side makes a private key + public curve">The private key is a list of small integers; the public key is the <i>curve</i> you get by applying them to a starting curve.</Step>
      <Step n="2" title="Swap public curves in the open" d={1}>Only public curves cross the wire — they can be reused, so exchange needs no live back-and-forth (non-interactive).</Step>
      <Step n="3" title="Apply your private key to their curve" d={2}>Order doesn't matter (commutative): [a]·[b]·E₀ = [b]·[a]·E₀. Both land on the <b>same curve</b> = shared secret. Eve, with the wrong private key, lands elsewhere.</Step>
    </div>
    <div className="row"><Btn busy={busy} onClick={() => run({})}>🔑 Run a CSIDH-512 key exchange</Btn><span className="muted">Takes a moment — isogeny maths is heavy.</span></div>
    <Err e={err} />
    {res && <>
      <Banner ok={res.match} title={res.match ? 'Alice and Bob derived the identical 512-bit secret' : 'Mismatch (unexpected)'} text={res.eveMatch ? 'Unexpected: Eve matched.' : 'Eve — who saw both public keys — computed a different, useless value.'} />
      <div className="three">
        <div className="actor"><span className="big">👩</span><b>Alice</b><p className="muted">public key fp</p><span className="hex">{res.alicePub}</span><p className="muted">shared secret</p><span className="hex">{short(res.aliceSecret)}</span></div>
        <div className="actor"><span className="big">🕶️</span><b>Eve (eavesdropper)</b><p className="muted">sees both public keys…</p><p className="muted">her derived value</p><span className="hex">{short(res.eveSecret)}</span><p className="muted">≠ Alice's ✕</p></div>
        <div className="actor"><span className="big">👨</span><b>Bob</b><p className="muted">public key fp</p><span className="hex">{res.bobPub}</span><p className="muted">shared secret</p><span className="hex">{short(res.bobSecret)}</span></div>
      </div>
      <p className="muted">Key generation {res.keygenMs.toFixed(0)} ms · both derivations {res.deriveMs.toFixed(0)} ms. Full secrets: <span className="hex">{res.aliceSecret}</span></p>
    </>}
    <h2>Why it matters</h2>
    <div className="grid">{[['⚛️', 'Harvest-now-decrypt-later', 'Adversaries record encrypted traffic today to decrypt once quantum computers exist.'], ['📡', 'Non-interactive exchange', 'Reusable static public keys suit zero-RTT protocols (e.g. QUIC) and IoT.'], ['📦', 'Tiny keys', '64-byte public keys vs kilobytes for many lattice schemes.']].map(([i, t, d]) => <div key={t} className="card"><div className="big">{i}</div><h4>{t}</h4><p className="muted">{d}</p></div>)}</div>
    <div className="warn-box"><b>Be realistic:</b> CSIDH is research-grade. It is slow, its quantum security level is still debated (sub-exponential quantum attacks exist), CIRCL's implementation is experimental, and it is <b>not</b> a NIST standard (NIST chose ML-KEM/Kyber). Use it to learn, not to protect production secrets.</div>
  </>
}

export default function App() {
  const [tab, setTab] = useState('home')
  const tabs = [['home', 'Start here'], ['zk', '🕵️ Zero-Knowledge'], ['ring', '💍 Ring / Borromean'], ['group', '👥 Group vs Ring'], ['pq', '🛡️ Post-Quantum']]
  return <>
    <header><div className="logo">◆ CRYPTO LAB</div><nav>{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</nav></header>
    <main key={tab}>{tab === 'home' ? <Home go={setTab} /> : tab === 'zk' ? <ZK /> : tab === 'ring' ? <Ring /> : tab === 'group' ? <Group /> : <PQ />}</main>
  </>
}
