// VeraGuard: the payment firewall for an agent's wallet.
//
//   const guard = new VeraGuard({ connection, policy: { minTier: 'medium', dailyLimitSol: 20 } });
//   const { signature, decision } = await guard.sendTransaction(tx, [agentKeypair]);
//
// Every outgoing transaction is decoded, each recipient is scored by Vera (signature verified locally),
// your policy decides allow / review / block, and only allowed transactions reach the network.
import type { Connection, Signer, Transaction, VersionedTransaction, SendOptions } from '@solana/web3.js';
import { Vera } from './client.js';
import { inspectTransaction } from './inspect.js';
import { evaluatePolicy, validatePolicy, type Decision, type Outflow, type Policy, type RecipientCheck, type RiskyInstruction } from './policy.js';

/** Where the guard keeps today's spend. Swap in Redis/DB for multi-process agents. */
export interface SpendLedger {
  spentToday(): Promise<number> | number;
  add(sol: number): Promise<void> | void;
}

export class MemoryLedger implements SpendLedger {
  private day = '';
  private spent = 0;
  private roll() { const d = new Date().toISOString().slice(0, 10); if (d !== this.day) { this.day = d; this.spent = 0; } }
  spentToday() { this.roll(); return this.spent; }
  add(sol: number) { this.roll(); this.spent += sol; }
}

export class VeraBlockedError extends Error {
  constructor(public decision: Decision) {
    super(`Vera blocked this transaction: ${decision.findings.filter((f) => f.action === 'block').map((f) => f.message).join('; ')}`);
  }
}
export class VeraReviewRequiredError extends Error {
  constructor(public decision: Decision) {
    super(`Vera needs a human review: ${decision.findings.filter((f) => f.action === 'review').map((f) => f.message).join('; ')}`);
  }
}

export type GuardOptions = {
  connection?: Connection;
  /** The wallet being guarded. Default: each transaction's fee payer. Set it when a relayer pays fees for your agent. */
  wallet?: string;
  policy?: Policy;
  vera?: Vera | { apiUrl?: string; apiKey?: string; issuer?: string };
  ledger?: SpendLedger;
  /** Called for 'review' decisions. Return true to send anyway (e.g. after a human approves in Slack/Telegram). Without it, review = block. */
  onReview?: (decision: Decision) => Promise<boolean> | boolean;
  /** Called after every decision, for logs and audit trails. */
  onDecision?: (decision: Decision) => void;
};

export class VeraGuard {
  readonly vera: Vera;
  readonly policy: Policy;
  private connection?: Connection;
  private wallet?: string;
  private ledger: SpendLedger;
  private onReview?: GuardOptions['onReview'];
  private onDecision?: GuardOptions['onDecision'];
  // evaluate + reserve run one at a time, so two concurrent sends can't both pass a daily limit
  private lock: Promise<unknown> = Promise.resolve();

  constructor(opts: GuardOptions = {}) {
    this.vera = opts.vera instanceof Vera ? opts.vera : new Vera(opts.vera);
    this.policy = opts.policy ?? {};
    validatePolicy(this.policy); // fail at startup on typos, not silently at payment time
    this.connection = opts.connection;
    this.wallet = opts.wallet;
    this.ledger = opts.ledger ?? new MemoryLedger();
    this.onReview = opts.onReview;
    this.onDecision = opts.onDecision;
  }

  /** Score recipients (deduplicated, in parallel) and verify each signed result against Vera's published key. */
  async checkRecipients(addresses: string[]): Promise<RecipientCheck[]> {
    const skip = new Set([...(this.policy.allow ?? []), ...(this.policy.deny ?? [])]);
    const uniq = [...new Set(addresses)].filter((a) => !skip.has(a));
    return Promise.all(uniq.map(async (address): Promise<RecipientCheck> => {
      try {
        const r = await this.vera.check(address); // throws if the result is for another address
        const v = await this.vera.verify(r);
        const a = r.attestation;
        return { address, ok: true, score: a.score, tier: a.tier, reasons: a.reasons, attestationId: r.id, verified: v.valid, expired: v.expired };
      } catch (e) {
        return { address, ok: false, error: (e as Error).message };
      }
    }));
  }

  /** Decide on a planned payment without building a transaction (e.g. before quoting a price to another agent). */
  async evaluatePayment(payment: { to: string; amountSol?: number; token?: { mint: string; amount: number } }): Promise<Decision> {
    const outflows: Outflow[] = payment.token
      ? [{ kind: 'token', to: payment.to, toAccount: payment.to, amount: payment.token.amount, mint: payment.token.mint, instruction: 'planned' }]
      : [{ kind: 'sol', to: payment.to, toAccount: payment.to, amount: payment.amountSol ?? 0, instruction: 'planned' }];
    return this.decide(outflows, {});
  }

  /** Decode a transaction and decide on it. Does not send anything. */
  async evaluate(tx: Transaction | VersionedTransaction): Promise<Decision> {
    const ins = await inspectTransaction(tx, this.connection, { wallet: this.wallet });
    return this.decide(ins.outflows, { unknownPrograms: ins.unknownPrograms, valuePrograms: ins.valuePrograms, risky: ins.risky });
  }

  private async decide(outflows: Outflow[], extra: { unknownPrograms?: string[]; valuePrograms?: string[]; risky?: RiskyInstruction[] }): Promise<Decision> {
    const recipients = await this.checkRecipients(outflows.map((o) => o.to));
    const decision = evaluatePolicy({ outflows, recipients, ...extra, spentTodaySol: await this.ledger.spentToday(), policy: this.policy });
    this.onDecision?.(decision);
    return decision;
  }

  /** Throws VeraBlockedError / VeraReviewRequiredError unless the transaction may be sent. */
  async assert(tx: Transaction | VersionedTransaction): Promise<Decision> {
    const d = await this.evaluate(tx);
    if (d.action === 'block') throw new VeraBlockedError(d);
    if (d.action === 'review' && !(this.onReview && (await this.onReview(d)))) throw new VeraReviewRequiredError(d);
    return d;
  }

  /** Evaluate, then sign and send only if allowed. The SOL is reserved in the ledger before sending and released if sending fails. */
  async sendTransaction(tx: Transaction | VersionedTransaction, signers: Signer[] = [], options?: SendOptions): Promise<{ signature: string; decision: Decision }> {
    if (!this.connection) throw new Error('VeraGuard needs a Connection to send transactions');
    const run = this.lock.then(async () => { const d = await this.assert(tx); await this.ledger.add(d.totalSol); return d; });
    this.lock = run.catch(() => {});
    const decision = await run;
    try {
      let signature: string;
      if ('version' in tx) {
        if (signers.length) tx.sign(signers);
        signature = await this.connection.sendTransaction(tx, options);
      } else {
        signature = await this.connection.sendTransaction(tx, signers, options);
      }
      return { signature, decision };
    } catch (e) {
      await this.ledger.add(-decision.totalSol);
      throw e;
    }
  }
}
