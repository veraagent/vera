import Since from '@/components/Since';
import Code from '@/components/Code';

export const metadata = { title: 'Python · Docs' };

export default function Page() {
  return (
    <>
      <h1>Python</h1>
      <p className="lead">The same scoring, signature check and policy engine, for Python agents. One dependency (<code>cryptography</code>).</p>
      <Code label="terminal">{`pip install veralayer`}</Code>
      <Since v="">On PyPI · Python 3.9+</Since>

      <h2>Guard a payment</h2>
      <Code label="agent.py">{`from veralayer import VeraGuard, VeraBlockedError, VeraReviewRequiredError

guard = VeraGuard(policy={
    "min_tier": "medium",
    "tier_limits_sol": {"high": 50, "medium": 5},
    "daily_limit_sol": 20,
})

try:
    guard.authorize(to=recipient, amount_sol=1.5)   # raises unless allowed; records the spend
    send_sol(recipient, 1.5)                        # your existing code
except (VeraBlockedError, VeraReviewRequiredError) as e:
    print(e.decision["findings"])`}</Code>
      <p>If the send fails after <code>authorize</code>, call <code>guard.release(decision)</code> to give the reserved amount back to the daily limit.</p>

      <h2>Score an address</h2>
      <Code label="check.py">{`from veralayer import Vera

vera = Vera()
r = vera.check("AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51")
r["attestation"]["tier"]   # 'medium'
vera.verify(r)             # {'valid': True, 'expired': False}`}</Code>

      <h2>Differences from JavaScript</h2>
      <ul>
        <li>Policy fields and decision keys are snake_case: <code>min_tier</code>, <code>tier_limits_sol</code>, <code>daily_limit_sol</code>, <code>max_sol_per_tx</code>, <code>token_limits</code>, <code>on_unknown</code>, <code>on_check_error</code>; <code>total_sol</code>, <code>attestation_id</code>.</li>
        <li>Finding codes match JavaScript for payments. There are no transaction-level codes (<code>unknown_program</code>, <code>opaque_value</code>, <code>risky_instruction</code>), because Python does not decode transactions.</li>
        <li>No transaction decoding yet: the guard works on planned payments (<code>authorize</code>, <code>evaluate_payment</code>, <code>evaluate_outflows</code>).</li>
        <li>Signatures are verified with the same canonical JSON, byte for byte, so a result checked in one language verifies in the other.</li>
      </ul>

      <h2>CLI</h2>
      <Code label="terminal">{`veralayer check <address>
veralayer pay <address> 2.5 --min-tier medium`}</Code>
    </>
  );
}
