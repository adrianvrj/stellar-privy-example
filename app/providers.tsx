'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <section className="max-w-xl border border-[var(--line)] bg-[var(--paper-soft)] p-8 shadow-[8px_8px_0_#11140d]">
          <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.18em] text-[var(--teal)]">
            Missing Privy app ID
          </p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl leading-tight">
            Add your Privy app ID before running the wallet demo.
          </h1>
          <p className="mt-4 text-sm leading-6">
            Create <code>.env.local</code> from <code>.env.local.example</code> and set{' '}
            <code>NEXT_PUBLIC_PRIVY_APP_ID</code>.
          </p>
        </section>
      </main>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email'],
        appearance: {
          theme: 'light',
          accentColor: '#0f766e',
          logo: undefined,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
