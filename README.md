# Stellar Privy Example

A minimal Next.js app showing how to use Privy authentication with a Stellar testnet wallet.

The app lets a user:

- Sign in with Privy
- Automatically create a Stellar embedded wallet
- Fund the wallet with Stellar testnet Friendbot
- Read the wallet balance from Horizon
- Sign and submit an XLM payment on Stellar testnet

## Prerequisites

- Node.js 20 or newer
- npm
- A Privy app ID

## Create a Privy App

Before running the example, create an app in the Privy dashboard:

1. Go to [https://www.privy.io/](https://www.privy.io/).
2. Sign in or create a Privy account.
3. Create a new app.
4. Copy the app ID from your Privy dashboard.

## Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.local.example .env.local
```

Add your Privy app ID:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```

Start the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

If port 3000 is already in use, Next.js will print the alternate local URL.

## How It Works

The main example lives in `app/components/StellarPrivyDesk.tsx`.

After a user signs in with Privy, the app calls Privy's extended-chain wallet API to create a Stellar wallet automatically. Testnet funding uses Stellar Friendbot, balances are loaded from Horizon, and outgoing payments are built with `@stellar/stellar-sdk`.

When a payment is submitted, the app builds the Stellar transaction, hashes it, signs the hash with Privy's `useSignRawHash` hook, attaches the signature to the transaction, and submits it to Stellar testnet.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Notes

This app is a testnet example. Do not use Friendbot or testnet assumptions in production.
