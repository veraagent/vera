import Code from '@/components/Code';

export const metadata = { title: 'Guarding transactions · Docs' };

export default function Page() {
  return (
    <>
      <h1>Guarding transactions</h1>
      <p className="lead"><code>VeraGuard</code> sits between your agent and the network. Every decision is <code>allow</code>, <code>review</code> or <code>block</code>, with a finding for each rule that fired.</p>

      <h2>What happens on send</h2>
      <ul>
        <li><b>Decode.</b> Only value that leaves the guarded wallet counts. SOL: transfer, transferWithSeed, createAccount, createAccountWithSeed, withdrawNonceAccount. Tokens: SPL Token and Token-2022 transfer, transferChecked and transferCheckedWithFee, with each token account resolved to the wallet that owns it (including accounts created in the same transaction). v0 lookup tables are resolved.</li>
        <li><b>Flag control changes.</b> Token approve, setAuthority, closeAccount to someone else, and system assign signed by the wallet are reported as risky and blocked by default.</li>
        <li><b>Score.</b> Each distinct recipient is checked with Vera, in parallel. Allow- and deny-listed addresses are not sent to the API. A result for a different address than requested is rejected.</li>
        <li><b>Verify.</b> Each result is verified locally against Vera’s pinned ed25519 key. A failed signature is treated as a failed check.</li>
        <li><b>Decide.</b> Your policy runs. <code>block</code> beats <code>review</code> beats <code>allow</code>.</li>
        <li><b>Send.</b> Only if allowed, or a review was approved. The SOL is reserved in the ledger before sending and released if sending fails, and concurrent sends are serialised, so two payments can’t both slip under a daily limit.</li>
      </ul>

      <h2>Decide without sending</h2>
      <Code label="evaluate.ts">{`const decision = await guard.evaluate(tx);   // Transaction or VersionedTransaction

// before building one
const quote = await guard.evaluatePayment({ to, amountSol: 1.5 });
const usdc  = await guard.evaluatePayment({ to, token: { mint: USDC, amount: 200 } });`}</Code>

      <h2>When a relayer pays the fees</h2>
      <p>By default the guarded wallet is each transaction’s fee payer. If a relayer (Kora, Octane, your own) pays fees for your agent, name the agent’s wallet so its transfers are the ones that count:</p>
      <Code label="relayer.ts">{`new VeraGuard({ connection, wallet: agentKeypair.publicKey.toBase58(), policy });`}</Code>

      <h2>Human review</h2>
      <p>Without <code>onReview</code>, a review decision throws <code>VeraReviewRequiredError</code>. Return <code>true</code> to send anyway.</p>
      <Code label="review.ts">{`const guard = new VeraGuard({
  connection,
  policy,
  onReview: async (d) => askInTelegram(d.findings.map((f) => f.message).join('\\n')),
  onDecision: (d) => auditLog.write(d),   // every decision, for your records
});`}</Code>

      <h2>Daily limits across processes</h2>
      <p>The default <code>MemoryLedger</code> lives in one process. Pass your own store for anything bigger. <code>add</code> receives a negative amount when a reserved send fails.</p>
      <Code label="ledger.ts">{`const ledger = {
  spentToday: () => redis.get(\`spent:\${today()}\`).then(Number),
  add: (sol) => redis.incrbyfloat(\`spent:\${today()}\`, sol),
};
new VeraGuard({ connection, policy, ledger });`}</Code>

      <h2>Trust and the signing key</h2>
      <p>Results must be signed by Vera’s production key, which ships in the package as <code>VERA_ISSUER</code>. A proxy or mirror can’t substitute its own key. For a self-hosted Vera, pass <code>{`vera: { apiUrl, issuer: '<your key>' }`}</code>.</p>

      <h2>Errors</h2>
      <div className="table-wrap"><table><thead><tr><th>Error</th><th>When</th></tr></thead><tbody>
        <tr><td><code>VeraBlockedError</code></td><td>The decision is block. <code>e.decision</code> has the findings.</td></tr>
        <tr><td><code>VeraReviewRequiredError</code></td><td>The decision is review and no <code>onReview</code> approved it.</td></tr>
        <tr><td><code>VeraError</code></td><td>A direct API call failed (status on <code>e.status</code>). Inside the guard this becomes a <code>check_failed</code> finding.</td></tr>
        <tr><td><code>Error</code></td><td>Invalid policy at construction; no <code>connection</code> for <code>sendTransaction</code>; a v0 transaction with lookup tables and no connection.</td></tr>
      </tbody></table></div>

      <h2>Not decoded</h2>
      <p>Value moved inside other programs (swaps, lending, CPIs) is not followed. Well-known programs produce an <code>opaque_value</code> finding and unknown ones an <code>unknown_program</code> finding, both review by default.</p>
    </>
  );
}
