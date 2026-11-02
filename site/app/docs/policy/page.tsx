import Code from '@/components/Code';

export const metadata = { title: 'Policy reference · Docs' };

const ROWS = [
  ['minTier', "'medium'", 'Recipients below this tier are blocked.'],
  ['tierLimitsSol', '{ high: ∞, medium: 5, low: 0 }', 'Max SOL to one recipient in one transaction, by tier. Over the limit: review; a limit of 0: block. Unknown recipients follow onUnknown unless you add an unknown cap.'],
  ['maxSolPerTx', '—', 'Cap on total SOL leaving the wallet in one transaction: block.'],
  ['dailyLimitSol', '—', 'Cap on total SOL per UTC day, tracked by the ledger: block.'],
  ['tokenLimits', '—', 'Per-mint cap in UI units, e.g. { [USDC]: 500 }: review.'],
  ['allow', '[]', 'Addresses that skip scoring.'],
  ['deny', '[]', 'Addresses that are always blocked.'],
  ['onUnknown', "'review'", 'Recipients with no history to score.'],
  ['onCheckError', "'block'", 'The check failed, its signature did not verify, or it was for another address. review or block, never allow.'],
  ['unknownPrograms', "'review'", 'Transactions calling programs outside the well-known list.'],
  ['knownPrograms', "'review'", 'Well-known programs that can move value the guard does not decode (swaps, lending). Set allow if your agent swaps.'],
  ['riskyInstructions', "'block'", 'Instructions that hand over control: token approve, setAuthority, closeAccount to someone else, system assign.'],
];

const CODES = [
  ['bad_amount', 'block', 'An amount is NaN, negative or infinite'],
  ['denylisted', 'block', 'Recipient is on your deny list'],
  ['check_failed', 'onCheckError', 'Vera could not be reached, errored, or answered for a different address'],
  ['bad_tier', 'onCheckError', 'Vera returned a tier the library does not know'],
  ['bad_signature', 'onCheckError', 'The signed result did not verify against the pinned key'],
  ['stale_check', 'review', 'The result has expired'],
  ['unknown_recipient', 'onUnknown', 'No history to score'],
  ['tier_below_minimum', 'block', 'Recipient tier is below minTier'],
  ['tier_limit', 'review / block', 'SOL to this recipient exceeds its tier limit'],
  ['unknown_decimals', 'review', 'Token decimals could not be read, so the amount was not compared'],
  ['token_limit', 'review', 'Token amount exceeds tokenLimits'],
  ['tx_limit', 'block', 'Transaction exceeds maxSolPerTx'],
  ['daily_limit', 'block', 'Would exceed dailyLimitSol'],
  ['risky_instruction', 'riskyInstructions', 'Approve, setAuthority, closeAccount or assign signed by the wallet'],
  ['unknown_program', 'unknownPrograms', 'Calls a program outside the well-known list'],
  ['opaque_value', 'knownPrograms', 'Calls a well-known program that can move value'],
];

export default function Page() {
  return (
    <>
      <h1>Policy reference</h1>
      <p className="lead">Every field is optional. The policy engine is pure and makes no network calls, so the same code runs in Node and in the browser. A policy with a typo throws when the guard is created, instead of silently weakening a check.</p>
      <Code label="policy.ts">{`import type { Policy } from 'veralayer';

const policy: Policy = {
  minTier: 'medium',
  tierLimitsSol: { high: 50, medium: 5 },
  dailyLimitSol: 20,
  tokenLimits: { EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 500 },
  deny: ['<known bad address>'],
  allow: ['<your treasury>'],
  knownPrograms: 'allow',     // this agent swaps on Jupiter
};`}</Code>

      <h2>Fields</h2>
      <div className="table-wrap"><table><thead><tr><th>Field</th><th>Default</th><th>Effect</th></tr></thead><tbody>
        {ROWS.map(([f, d, e]) => <tr key={f}><td><code>{f}</code></td><td><code>{d}</code></td><td>{e}</td></tr>)}
      </tbody></table></div>

      <h2>Finding codes</h2>
      <p>Switch on <code>finding.code</code> rather than the message text. <code>block</code> beats <code>review</code> beats <code>allow</code>.</p>
      <div className="table-wrap"><table><thead><tr><th>Code</th><th>Action</th><th>Meaning</th></tr></thead><tbody>
        {CODES.map(([c, a, m]) => <tr key={c}><td><code>{c}</code></td><td>{a}</td><td>{m}</td></tr>)}
      </tbody></table></div>

      <h2>Use it standalone</h2>
      <Code label="pure.ts">{`import { evaluatePolicy } from 'veralayer/policy';

const d = evaluatePolicy({
  outflows: [{ kind: 'sol', to, toAccount: to, amount: 1.5, instruction: 'planned' }],
  recipients,          // from guard.checkRecipients([...])
  spentTodaySol: 4,
  policy,
});`}</Code>
    </>
  );
}
