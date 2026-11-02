'use client';
import { useEffect, useState } from 'react';
import { Vera, type Attestation } from '@/lib/veraagent/client';

// verifies the signed result in the visitor's browser against the issuer key published at /.well-known/vera.json
export default function VerifyBadge({ attestation, signature }: { attestation: Attestation; signature: string }) {
  const [state, setState] = useState<'checking' | 'valid' | 'expired' | 'invalid'>('checking');
  useEffect(() => {
    new Vera({ apiUrl: '' }).verify({ attestation, signature })
      .then((v) => setState(!v.valid ? 'invalid' : v.expired ? 'expired' : 'valid'))
      .catch(() => setState('invalid'));
  }, [attestation, signature]);
  const look = {
    checking: ['bg-stone-100 text-stone-600', 'Verifying signature…'],
    valid: ['bg-high/10 text-high', 'Signature verified in your browser ✓'],
    expired: ['bg-medium/10 text-medium', 'Signature valid, result expired'],
    invalid: ['bg-low/10 text-low', 'Signature does not verify'],
  }[state];
  return <span className={`inline-flex rounded-full px-3.5 py-1.5 text-xs font-semibold ${look[0]}`}>{look[1]}</span>;
}
