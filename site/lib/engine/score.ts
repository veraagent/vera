// Deterministic scorer: features -> base score, tier and template reasons. Always runs; the AI step only refines it.
import type { Features } from './features';

export type Tier = 'high' | 'medium' | 'low' | 'unknown';
export type Reason = { kind: 'ok' | 'warn' | 'bad' | 'info'; text: string; feature: string };
export type Scored = { score: number | null; tier: Tier; reasons: Reason[]; signals: { feature: string; delta: number }[] };

export const tierOf = (score: number | null, f: Features): Tier =>
  score === null ? 'unknown' : f.flagged_self.listed || f.funding?.flagged ? 'low' : score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function baseScore(f: Features): Scored {
  // programs and token accounts are not payees: point the agent at the right thing instead of scoring
  if (f.kind === 'program') return { score: null, tier: 'unknown', signals: [], reasons: [
    { kind: 'info', text: 'This is a program, not a wallet', feature: 'kind' },
    { kind: 'info', text: 'Programs are not scored as payment counterparties', feature: 'kind' },
  ] };
  if (f.kind === 'token_account') return { score: null, tier: 'unknown', signals: [], reasons: [
    { kind: 'warn', text: 'This is a token account, not a wallet', feature: 'kind' },
    { kind: 'info', text: 'Check the wallet that owns it instead', feature: 'kind' },
  ] };
  if (!f.exists || f.tx_count < 3) {
    return {
      score: null, tier: 'unknown', signals: [],
      reasons: [
        { kind: 'info', text: f.exists ? `Only ${plural(f.tx_count, 'transaction')} on record` : 'No on-chain history found', feature: 'tx_count' },
        { kind: 'info', text: 'Not enough data to score', feature: 'tx_count' },
      ],
    };
  }
  const signals: { feature: string; delta: number }[] = [];
  const reasons: Reason[] = [];
  const add = (feature: string, delta: number, kind: Reason['kind'], text: string) => { signals.push({ feature, delta }); reasons.push({ kind, text, feature }); };

  // age
  const age = f.age_days ?? 0;
  const ageText = `${f.tx_count_capped ? 'Active for over' : 'Active for'} ${plural(age, 'day')}`;
  // with a capped history the oldest signature we saw is only a lower bound, so a "young" reading means high frequency, not a new wallet
  if (f.tx_count_capped && age < 30) add('age_days', -4, 'info', `High-frequency activity: ${f.tx_count}+ transactions in ${age < 1 ? 'under a day' : plural(age, 'day')}`);
  else if (age >= 365) add('age_days', 18, 'ok', ageText);
  else if (age >= 90) add('age_days', 12, 'ok', ageText);
  else if (age >= 30) add('age_days', 6, 'ok', ageText);
  else if (age < 2) add('age_days', -15, 'warn', `Wallet is less than 2 days old`);
  else if (age < 7) add('age_days', -8, 'warn', `Wallet is only ${plural(age, 'day')} old`);
  else add('age_days', 0, 'info', ageText);

  // volume of history
  const txText = `${f.tx_count_capped ? `${f.tx_count}+` : f.tx_count} transactions on record`;
  if (f.tx_count >= 500) add('tx_count', 8, 'ok', txText);
  else if (f.tx_count >= 100) add('tx_count', 5, 'ok', txText);
  else if (f.tx_count < 10) add('tx_count', -8, 'warn', `Only ${plural(f.tx_count, 'transaction')} on record`);

  // counterparties
  if (f.repeat_counterparties >= 10) add('repeat_counterparties', 6, 'ok', `${f.repeat_counterparties} recurring counterparties`);
  else if (f.repeat_counterparties >= 3) add('repeat_counterparties', 2, 'ok', `${f.repeat_counterparties} recurring counterparties`);

  // programs
  if (f.program_calls > 0) {
    const share = f.unknown_program_calls / f.program_calls;
    if (f.unknown_programs === 0) add('unknown_programs', 4, 'ok', 'Only well-known programs called');
    else if (share > 0.3) add('unknown_programs', -12, 'warn', `${plural(f.unknown_programs, 'unrecognised program')} in ${Math.round(share * 100)}% of recent calls`);
    else if (share > 0.1) add('unknown_programs', -5, 'warn', `${plural(f.unknown_programs, 'unrecognised program')} called recently`);
    else add('unknown_programs', 0, 'info', `${plural(f.unknown_programs, 'unrecognised program')} called recently`);
  }

  if (f.failed_ratio > 0.3) add('failed_ratio', -8, 'warn', `${Math.round(f.failed_ratio * 100)}% of transactions failed`);
  if (f.drain_pattern) add('drain_pattern', -15, 'bad', 'New wallet sent out almost everything it received');
  if (f.token_creations >= 5) add('token_creations', -6, 'warn', `Created ${f.token_creations} tokens recently`);

  // funding source
  if (f.funding?.flagged) add('funding', -30, 'bad', 'Funded by a flagged address');
  else if (f.funding?.funder && !f.funding.funder_capped && (f.funding.funder_age_days ?? 0) < 3 && age < 30)
    add('funding', -6, 'warn', 'Funded by another brand-new wallet');
  else if (f.funding?.funder && f.funding.funder_capped) add('funding', 2, 'info', 'Funded from a high-volume source');

  // flags
  if (f.flagged_counterparties.length >= 2) add('flagged_counterparties', -35, 'bad', `Transacted with ${f.flagged_counterparties.length} flagged addresses`);
  else if (f.flagged_counterparties.length === 1) add('flagged_counterparties', -25, 'bad', 'Transacted with a flagged address');
  else add('flagged_counterparties', 0, 'ok', 'No links to flagged addresses in recent activity');

  let score = Math.max(1, Math.min(99, 50 + signals.reduce((s, x) => s + x.delta, 0)));
  if (f.flagged_self.listed) {
    score = Math.min(score, 5);
    reasons.unshift({ kind: 'bad', text: `Address is on the flagged list: ${f.flagged_self.reason}`, feature: 'flagged_self' });
  }
  // strongest signals first: bad, then warn, then ok, info last
  const order = { bad: 0, warn: 1, ok: 2, info: 3 };
  reasons.sort((a, b) => order[a.kind] - order[b.kind]);
  return { score, tier: tierOf(score, f), reasons: reasons.slice(0, 5), signals };
}
