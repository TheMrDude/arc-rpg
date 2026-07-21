import { base, baseSepolia } from 'viem/chains';
import type { Abi } from 'viem';

/** Chain id from env; defaults to Base Sepolia (testnet-first). */
export const BADGE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '84532');

/** Deployed contract address (set after Dan runs the deploy script). */
export const BADGE_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS ||
  '') as `0x${string}`;

/** The viem chain object matching BADGE_CHAIN_ID. */
export const badgeChain = BADGE_CHAIN_ID === base.id ? base : baseSepolia;

/**
 * Minimal ABI — just what the claim flow calls. Typed as the general `Abi`
 * (not a const tuple) on purpose: viem's const-ABI generics otherwise blow
 * TypeScript's instantiation-depth limit when combined with wagmi's hooks.
 */
export const HABITQUEST_BADGES_ABI: Abi = [
  {
    type: 'function',
    name: 'claimBadge',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'voucher',
        type: 'tuple',
        components: [
          { name: 'to', type: 'address' },
          { name: 'badgeId', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'expiry', type: 'uint256' },
        ],
      },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

export type SignedVoucher = {
  voucher: { to: `0x${string}`; badgeId: number; nonce: string; expiry: number };
  signature: `0x${string}`;
  contract_address: `0x${string}`;
  chain_id: number;
};
