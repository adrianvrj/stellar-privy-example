'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  useCreateWallet,
  useSignRawHash,
} from '@privy-io/react-auth/extended-chains';
import {
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const EXPLORER_URL = 'https://stellar.expert/explorer/testnet';

type WalletLike = {
  address?: string;
  chainType?: string;
  walletClientType?: string;
};

type BalanceLine = {
  asset_type: string;
  asset_code?: string;
  balance: string;
};

type LogLine = {
  tone: 'info' | 'success' | 'error';
  message: string;
};

const server = new Horizon.Server(HORIZON_URL);

function compactAddress(address?: string) {
  if (!address) return 'No wallet yet';
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

function toHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function signatureToBytes(signature: string) {
  const normalized = signature.startsWith('0x') ? signature.slice(2) : signature;
  if (/^[0-9a-f]+$/i.test(normalized)) {
    return Buffer.from(normalized, 'hex');
  }

  return Buffer.from(signature, 'base64');
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function StellarPrivyDesk() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { signRawHash } = useSignRawHash();
  const [balances, setBalances] = useState<BalanceLine[]>([]);
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('1');
  const [memo, setMemo] = useState('privy-stellar-demo');
  const [lastHash, setLastHash] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([
    { tone: 'info', message: 'Connect with Privy. A Stellar wallet will be created automatically.' },
  ]);
  const walletCreationStarted = useRef(false);

  const stellarWallet = useMemo(() => {
    const accounts = (user?.linkedAccounts ?? []) as WalletLike[];
    return accounts.find((account) => account.chainType === 'stellar');
  }, [user?.linkedAccounts]);

  const address = stellarWallet?.address;

  const addLog = useCallback((message: string, tone: LogLine['tone'] = 'info') => {
    setLogs((current) => [{ message, tone }, ...current].slice(0, 5));
  }, []);

  const runAction = useCallback(async (label: string, action: () => Promise<void>) => {
    setPending(label);
    try {
      await action();
    } catch (error) {
      addLog(getErrorMessage(error), 'error');
    } finally {
      setPending(null);
    }
  }, [addLog]);

  const refreshBalances = async () => {
    if (!address) return;

    await runAction('Refreshing', async () => {
      const account = await server.loadAccount(address);
      setBalances(account.balances as BalanceLine[]);
      addLog('Balances refreshed from Stellar testnet.', 'success');
    });
  };

  const createStellarWallet = useCallback(async () => {
    await runAction('Creating wallet', async () => {
      const result = await createWallet({ chainType: 'stellar' });
      addLog(`Created Stellar wallet ${compactAddress(result.wallet.address)}.`, 'success');
    });
  }, [addLog, createWallet, runAction]);

  const copyWalletAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      addLog('Wallet address copied to clipboard.', 'success');
      window.setTimeout(() => setCopiedAddress(false), 1800);
    } catch {
      addLog('Unable to copy wallet address from this browser context.', 'error');
    }
  };

  useEffect(() => {
    if (!ready || !authenticated || address || walletCreationStarted.current) return;

    walletCreationStarted.current = true;
    void createStellarWallet();
  }, [ready, authenticated, address, createStellarWallet]);

  const fundWallet = async () => {
    if (!address) return;

    await runAction('Funding', async () => {
      const response = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
      if (!response.ok) {
        throw new Error(`Friendbot returned ${response.status}.`);
      }
      addLog('Friendbot funded the wallet with testnet XLM.', 'success');
      await refreshBalances();
    });
  };

  const sendPayment = async () => {
    if (!address || !destination || !amount) return;

    await runAction('Sending payment', async () => {
      const source = await server.loadAccount(address);
      const builder = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination,
            asset: Asset.native(),
            amount,
          }),
        );

      if (memo) {
        builder.addMemo(Memo.text(memo));
      }

      const transaction = builder.setTimeout(60).build();

      const hash = toHex(transaction.hash());
      const { signature } = await signRawHash({
        address,
        chainType: 'stellar',
        hash,
      });

      transaction.addSignature(address, signatureToBytes(signature).toString('base64'));
      const response = await server.submitTransaction(transaction as Transaction);
      setLastHash(response.hash);
      addLog(`Payment submitted: ${response.hash.slice(0, 12)}...`, 'success');
      await refreshBalances();
    });
  };

  const hasAppId = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  const nativeBalance = balances.find((line) => line.asset_type === 'native')?.balance ?? '0.0000000';

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="min-h-[620px] border border-[var(--line)] bg-[var(--paper-soft)] p-5 shadow-[10px_10px_0_#11140d] sm:p-8">
          <nav className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
            <div className="font-[var(--font-mono)] text-xs uppercase tracking-[0.18em] text-[var(--teal)]">
              Stellar Testnet Desk
            </div>
            <div className="rounded-full border border-[var(--line)] px-3 py-1 font-[var(--font-mono)] text-xs">
              Privy Auth
            </div>
          </nav>

          <div className="grid gap-8 pt-10">
            <div>
              <p className="mb-3 max-w-xl font-[var(--font-mono)] text-sm text-[var(--teal)]">
                Next.js + Privy extended chains + Stellar SDK
              </p>
              <h1 className="max-w-3xl font-[var(--font-display)] text-5xl leading-[0.94] sm:text-7xl">
                A working Stellar wallet console, no seed phrase in sight.
              </h1>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Status" value={!ready ? 'Loading' : authenticated ? 'Signed in' : 'Guest'} />
              <WalletMetric
                address={address}
                copied={copiedAddress}
                onCopy={copyWalletAddress}
              />
              <Metric label="Testnet XLM" value={Number(nativeBalance).toFixed(4)} />
            </div>

            {!hasAppId && (
              <div className="border-2 border-[var(--rose)] bg-white px-4 py-3 text-sm">
                Add <code>NEXT_PUBLIC_PRIVY_APP_ID</code> to <code>.env.local</code> before logging in.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!authenticated ? (
                <button className="signin-button" disabled={!ready || !hasAppId} onClick={login}>
                  Sign in
                </button>
              ) : (
                <>
                  {!address && pending === 'Creating wallet' && (
                    <button className="primary-button" disabled>
                      Creating Stellar wallet...
                    </button>
                  )}
                  {address && (
                    <>
                      <button className="primary-button" disabled={Boolean(pending)} onClick={fundWallet}>
                        Fund testnet wallet
                      </button>
                      <button className="secondary-button" disabled={Boolean(pending)} onClick={refreshBalances}>
                        Refresh
                      </button>
                    </>
                  )}
                  <button className="secondary-button" onClick={logout}>
                    Sign out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <section className="border border-[var(--line)] bg-white p-5 shadow-[6px_6px_0_#11140d] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-[var(--font-display)] text-3xl">Send XLM</h2>
              <span className="font-[var(--font-mono)] text-xs text-[var(--teal)]">TESTNET</span>
            </div>

            <label className="field-label" htmlFor="destination">
              Destination public key
            </label>
            <input
              id="destination"
              className="field"
              placeholder="G..."
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-[0.45fr_0.55fr]">
              <div>
                <label className="field-label" htmlFor="amount">
                  Amount
                </label>
                <input
                  id="amount"
                  className="field"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="memo">
                  Memo
                </label>
                <input
                  id="memo"
                  className="field"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  maxLength={28}
                />
              </div>
            </div>

            <button
              className="primary-button mt-5 w-full"
              disabled={!address || !destination || !amount || Boolean(pending)}
              onClick={sendPayment}
            >
              {pending === 'Sending payment' ? 'Signing with Privy...' : 'Sign and submit payment'}
            </button>

            {lastHash && (
              <a
                className="mt-4 block break-all font-[var(--font-mono)] text-sm text-[var(--teal)] underline"
                href={`${EXPLORER_URL}/tx/${lastHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View transaction {lastHash}
              </a>
            )}
          </section>

          <section className="border border-[var(--line)] bg-[#11140d] p-5 text-[var(--paper-soft)] shadow-[6px_6px_0_var(--marigold)] sm:p-6">
            <h2 className="font-[var(--font-display)] text-3xl">Activity</h2>
            <div className="mt-4 grid gap-3">
              {logs.map((line, index) => (
                <div
                  className="border border-white/15 bg-white/5 p-3 font-[var(--font-mono)] text-xs"
                  key={`${line.message}-${index}`}
                >
                  <span className={line.tone === 'error' ? 'text-[var(--rose)]' : line.tone === 'success' ? 'text-[var(--sky)]' : 'text-white/60'}>
                    {line.tone.toUpperCase()}
                  </span>
                  <p className="mt-1 text-white/90">{line.message}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--line)] bg-white p-4">
      <div className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-black/50">
        {label}
      </div>
      <div className="mt-3 truncate font-[var(--font-mono)] text-sm font-semibold">{value}</div>
    </div>
  );
}

function WalletMetric({
  address,
  copied,
  onCopy,
}: {
  address?: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="border border-[var(--line)] bg-white p-4">
      <div className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-black/50">
        Wallet
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1 truncate font-[var(--font-mono)] text-sm font-semibold" title={address}>
          {compactAddress(address)}
        </div>
        {address && (
          <button
            aria-label="Copy wallet address"
            className="copy-button"
            onClick={onCopy}
            type="button"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}
