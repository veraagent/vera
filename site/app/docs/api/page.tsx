import Code from '@/components/Code';

export const metadata = { title: 'HTTP API · Docs' };

const ROUTES = [
  ['POST', '/v1/check', '{ address, fresh? }', 'Score one address'],
  ['GET', '/v1/check/:address', '', 'Same, as GET'],
  ['POST', '/v1/check/batch', '{ addresses } (max 10)', 'Score several at once'],
  ['POST', '/v1/verify', '{ attestation, signature }', 'Verify a signed result server-side'],
  ['GET', '/v1/attestations/:id', '', 'Look up a stored result (best effort: keep the signed copy)'],
  ['GET', '/v1/stats', '', 'Live counters, or { stats: null } without a store'],
  ['GET', '/.well-known/vera.json', '', 'Vera’s public signing key'],
  ['GET', '/health', '', 'Status, AI model, anchoring'],
];

export default function Page() {
  return (
    <>
      <h1>HTTP API</h1>
      <p className="lead">The library calls this API for you. Use it directly from any language.</p>
      <Code label="terminal">{`curl -X POST https://veraagent.io/v1/check \\
  -H 'content-type: application/json' \\
  -d '{"address":"AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51"}'`}</Code>

      <h2>Routes</h2>
      <div className="table-wrap"><table><thead><tr><th>Method</th><th>Path</th><th>Body</th><th>Use</th></tr></thead><tbody>
        {ROUTES.map(([m, p, b, u]) => <tr key={p + m}><td>{m}</td><td><code>{p}</code></td><td>{b && <code>{b}</code>}</td><td>{u}</td></tr>)}
      </tbody></table></div>

      <h2>Response</h2>
      <Code label="200 OK">{`{
  "id": "921d5767…",                    // sha256 of the canonical attestation
  "attestation": {
    "v": 1,
    "issuer": "4VyCQLEb8eVmPYXDUwYkEpCMhXFBRshUiKHHuKTfPDFQ",
    "subject": "AgmLJBMD…zN51",
    "score": 55,
    "tier": "medium",
    "reasons": [{ "kind": "warn", "text": "21 unrecognised programs…" }],
    "features_sha256": "…",
    "method": "vera-v1+claude-opus-5.5",
    "issued_at": "2026-11-02T16:46:39.478Z",
    "expires_at": "2026-11-03T16:46:39.478Z"
  },
  "signature": "24w8z…",                // ed25519 over the canonical JSON, base58
  "summary": "High-frequency DeFi trading wallet…",
  "anchor": null,                       // on-chain anchoring is not switched on yet
  "features": { … }                     // the raw on-chain facts behind the score
}`}</Code>

      <h2>Verifying a signature yourself</h2>
      <p>Serialize <code>attestation</code> as JSON with keys sorted at every level, then check the ed25519 signature against <code>issuer</code>, and check that <code>issuer</code> matches the key at <code>/.well-known/vera.json</code>. In JavaScript, <code>vera.verify(result)</code> does exactly this against the key pinned in the package (<code>VERA_ISSUER</code>). <code>verifyAttestation(attestation, signature, issuer)</code> does it fully offline.</p>

      <h2>Errors</h2>
      <p>Every error is JSON: <code>{`{ "error": "…" }`}</code>.</p>
      <div className="table-wrap"><table><thead><tr><th>Status</th><th>Meaning</th></tr></thead><tbody>
        <tr><td>400</td><td>Not a valid Solana address, or a malformed body</td></tr>
        <tr><td>401</td><td>Unknown <code>x-api-key</code></td></tr>
        <tr><td>429</td><td>Rate limited</td></tr>
        <tr><td>502</td><td>Upstream data failed; retry</td></tr>
      </tbody></table></div>

      <h2>Batch</h2>
      <Code label="POST /v1/check/batch">{`{ "results": [
  { "address": "AgmL…", "ok": true,  "result": { …same as /v1/check… } },
  { "address": "bad",   "ok": false, "error": "not a valid Solana address" }
] }`}</Code>
      <p>Up to 10 unique addresses are checked; extra ones are ignored.</p>

      <h2>Limits</h2>
      <ul>
        <li>Anonymous: 20 requests per minute per IP, counted per server instance (a soft limit). A batch call counts as one. Send <code>x-api-key</code> to lift it.</li>
        <li>Results are cached for 10 minutes per address. Send <code>fresh: true</code> to recompute.</li>
        <li>Results expire after 24 hours.</li>
      </ul>
    </>
  );
}
