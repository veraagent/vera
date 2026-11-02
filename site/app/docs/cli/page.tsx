import Code from '@/components/Code';

export const metadata = { title: 'CLI · Docs' };

export default function Page() {
  return (
    <>
      <h1>CLI</h1>
      <p className="lead">Everything the library does, from a terminal. Add <code>--json</code> to any command for machine-readable output.</p>

      <h2>Score an address</h2>
      <Code label="terminal">{`$ npx veralayer check 293BG8kFBPnNLfmFzcfExfaQfKFiAToYm3RCENiyffYy

4/100 LOW  293BG8kFBPnNLfmFzcfExfaQfKFiAToYm3RCENiyffYy
Wallet is on a curated scam-cluster list, which outweighs its moderate history and repeat counterparties; very high risk.
  × Address is listed in a tracked scam wallet cluster.
  ! 2 unrecognised programs account for 86 of 687 calls.
  ! 13.9% of sampled transactions failed.
  ✓ Active for 112 days with 45 repeat counterparties.
  i Funded by a high-volume source; funder not flagged.

attestation e5975bef4613b8571cc9ec9acebe5a10…
signature verified · vera-v1+claude-opus-5.5 · expires 2026-11-03T19:06:56.166Z`}</Code>

      <h2>Check a payment</h2>
      <Code label="terminal">{`$ npx veralayer pay AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51 12

REVIEW  12 SOL out
  → 12 SOL to AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51
  MEDIUM 57 AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51 signature ✓
  review  12 SOL to AgmL…zN51 exceeds the 5 SOL limit for medium trust`}</Code>

      <h2>Inspect a transaction</h2>
      <Code label="terminal">{`npm install veralayer @solana/web3.js
npx veralayer inspect <base64 transaction> --rpc https://your-rpc`}</Code>
      <p><code>inspect</code> needs <code>@solana/web3.js</code> installed next to veralayer.</p>

      <h2>Run as an MCP server</h2>
      <Code label="terminal">{`npx -y veralayer mcp`}</Code>
      <p>Available from 0.2.0. See <a href="/docs/mcp">MCP</a>.</p>

      <h2>Flags</h2>
      <div className="table-wrap"><table><thead><tr><th>Flag</th><th>Meaning</th></tr></thead><tbody>
        <tr><td><code>--min-tier high|medium|low</code></td><td>Minimum recipient tier</td></tr>
        <tr><td><code>--daily &lt;sol&gt;</code></td><td>Daily limit</td></tr>
        <tr><td><code>--max-tx &lt;sol&gt;</code></td><td>Cap per transaction</td></tr>
        <tr><td><code>--rpc &lt;url&gt;</code></td><td>RPC for <code>inspect</code> (or <code>SOLANA_RPC_URL</code>)</td></tr>
        <tr><td><code>--api &lt;url&gt;</code></td><td>Self-hosted Vera API (or <code>VERA_API_URL</code>)</td></tr>
        <tr><td><code>--json</code></td><td>Print the raw result</td></tr>
        <tr><td colSpan={2}>Flags accept <code>--name value</code> or <code>--name=value</code>. Invalid numbers and tiers are rejected.</td></tr>
      </tbody></table></div>
    </>
  );
}
