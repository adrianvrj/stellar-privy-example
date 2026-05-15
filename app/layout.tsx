import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const display = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
});

const sans = Manrope({
  variable: '--font-sans',
  subsets: ['latin'],
});

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Stellar Privy Testnet Desk',
  description: 'A Next.js example for Privy embedded Stellar wallets on testnet.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
