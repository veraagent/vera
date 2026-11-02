import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

// self-hosted (same OFL files as brand/fonts), so builds never depend on Google Fonts being reachable
const newsreader = localFont({ src: [{ path: './fonts/Newsreader.woff2', weight: '200 800', style: 'normal' }, { path: './fonts/Newsreader-italic.woff2', weight: '200 800', style: 'italic' }], variable: '--font-newsreader', display: 'swap' });
const montserrat = localFont({ src: './fonts/Montserrat.woff2', weight: '100 900', variable: '--font-montserrat', display: 'swap' });
const poppins = localFont({ src: './fonts/Poppins-700.woff2', weight: '700', variable: '--font-poppins', display: 'swap' });
const jet = localFont({ src: './fonts/JetBrainsMono.woff2', weight: '100 800', variable: '--font-jet', display: 'swap' });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://veraagent.io';
const TITLE = 'veralayer: a payment guard for AI agents on Solana';
const DESC = 'npm install veralayer. It decodes every transaction your agent signs, scores each recipient from on-chain history with a signed Vera result, and blocks what breaks your spending policy.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: '%s · Vera Agent' },
  description: DESC,
  applicationName: 'Vera Agent',
  keywords: ['veralayer', 'Vera Agent', 'VeraLayer', 'AI agents', 'agent payments', 'Solana', 'payment guard', 'trust score', 'MCP', 'Solana Agent Kit'],
  alternates: { canonical: '/' },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/favicon-32.png', sizes: '32x32' }], apple: '/apple-touch-icon.png' },
  openGraph: { type: 'website', url: SITE, siteName: 'Vera Agent', title: TITLE, description: DESC, images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Vera Agent by VeraLayer' }] },
  twitter: { card: 'summary_large_image', site: '@veraagentio', title: TITLE, description: DESC, images: ['/og.png'] },
};
export const viewport: Viewport = { themeColor: '#FFFFFF', colorScheme: 'light' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${montserrat.variable} ${poppins.variable} ${jet.variable}`}>
      <body className="font-sans antialiased"><SiteHeader />{children}<SiteFooter /></body>
    </html>
  );
}
