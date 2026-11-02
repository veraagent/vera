
export const metadata = { title: 'How scoring works · Docs' };

const FEATURES = [
  ['age_days', 'Days since the oldest signature read. A lower bound once history passes 3,000 transactions.'],
  ['tx_count', 'Signatures seen, up to 3,000.'],
  ['failed_ratio', 'Share of failed transactions.'],
  ['repeat_counterparties', 'Counterparties seen in two or more of the last 100 transactions.'],
  ['unknown_programs', 'Programs outside a popularity allowlist, and how often they are called.'],
  ['drain_pattern', 'A wallet under 7 days old that sent out most of what it received.'],
  ['token_creations', 'Tokens this address launched recently.'],
  ['flagged_self', 'The address is on the flagged list.'],
  ['flagged_counterparties', 'It transacted with flagged addresses.'],
  ['funding', 'Who sent its first SOL; whether that funder is flagged or brand-new. Traced only when the full history is under 3,000 signatures.'],
];

export default function Page() {
  return (
    <>
      <h1>How scoring works</h1>
      <p className="lead">Rules first, the model second, a signature last. The model can explain and adjust; it cannot decide on its own.</p>

      <h2>1. Read</h2>
      <p>Up to 3,000 signatures for age and activity, the last 100 transactions parsed in detail, and the wallet that sent the first SOL. Programs and token accounts are not scored as payees: they come back as unknown, and for token accounts the reasons tell you to check the owning wallet.</p>

      <h2>2. Score</h2>
      <p>A deterministic 0–100 score from these features. Tiers: high ≥ 75, medium ≥ 45, low below that. Unknown (no score) for fewer than 3 transactions, no history, programs and token accounts. An address on the flagged list is capped at 5; a flagged address or a flagged funder is always low.</p>
      <div className="table-wrap"><table><thead><tr><th>Feature</th><th>What it measures</th></tr></thead><tbody>
        {FEATURES.map(([f, d]) => <tr key={f}><td><code>{f}</code></td><td>{d}</td></tr>)}
      </tbody></table></div>

      <h2>3. Explain</h2>
      <p>Claude Opus 5.5 reads the features and the base score and writes the reasons. Its limits:</p>
      <ul>
        <li>it may move the score by at most 15 points;</li>
        <li>every reason must cite a real feature key, or it is dropped;</li>
        <li>the tier is computed by the server, not the model;</li>
        <li>it can never raise a flagged address or one with a flagged funder;</li>
        <li>if the call fails, the deterministic result is used.</li>
      </ul>

      <h2>4. Sign</h2>
      <p>The result is serialized as key-sorted JSON and signed with Vera’s ed25519 key. Its id is the sha256 of that JSON. The library verifies it locally before your policy sees it.</p>

      <h2>Limits</h2>
      <ul>
        <li>A score reads history, not intent. Use spending limits, not just tiers.</li>
        <li>Results are signed but not yet anchored on-chain.</li>
        <li>The flagged list is curated and small. It catches known bad actors, not new ones.</li>
        <li>The known-programs list is about popularity, not audits.</li>
      </ul>
    </>
  );
}
