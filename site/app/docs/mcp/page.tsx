import Since from '@/components/Since';
import Code from '@/components/Code';

export const metadata = { title: 'MCP · Docs' };

export default function Page() {
  return (
    <>
      <h1>MCP: Claude, Cursor and other clients</h1>
      <Since v="0.2.0" />
      <p className="lead">veralayer ships an MCP server, so any MCP client can score a counterparty and check a payment before it pays. Nothing to host: it runs with npx.</p>

      <h2>Claude Desktop</h2>
      <p>Settings → Developer → Edit config, then add:</p>
      <Code label="claude_desktop_config.json">{`{
  "mcpServers": {
    "vera": {
      "command": "npx",
      "args": ["-y", "veralayer", "mcp"]
    }
  }
}`}</Code>

      <h2>Cursor</h2>
      <Code label=".cursor/mcp.json">{`{
  "mcpServers": {
    "vera": { "command": "npx", "args": ["-y", "veralayer", "mcp"] }
  }
}`}</Code>

      <h2>Claude Code</h2>
      <Code label="terminal">{`claude mcp add vera -- npx -y veralayer mcp`}</Code>

      <h2>Tools</h2>
      <div className="table-wrap"><table><thead><tr><th>Tool</th><th>Input</th><th>Returns</th></tr></thead><tbody>
        <tr><td><code>vera_check</code></td><td><code>address</code></td><td>Score, tier, reasons, whether the signature verified, attestation id</td></tr>
        <tr><td><code>vera_guard_payment</code></td><td><code>to</code>, <code>amount_sol</code>, optional <code>min_tier</code>, <code>max_sol_per_tx</code></td><td>allow / review / block and the rule that fired</td></tr>
      </tbody></table></div>

      <h2>Options</h2>
      <p>Set <code>VERA_API_KEY</code> in the server’s <code>env</code> if you were issued a key, or <code>VERA_API_URL</code> to point at a self-hosted Vera.</p>
    </>
  );
}
