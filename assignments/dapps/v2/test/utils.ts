/**
 * Test Utilities
 * Helper functions for testing
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

export async function setupUsers<T extends { [key: string]: any }>(
  addresses: string[],
  contracts: T
): Promise<{ address: string; signer: SignerWithAddress } & T> {
  const users: any[] = [];

  for (const address of addresses) {
    const signer = await ethers.getSigner(address);
    users.push({ address, signer, ...contracts });
  }

  return users as any;
}

export async function expectEvent(
  tx: Promise<any>,
  contract: any,
  eventName: string,
  args?: any[]
): Promise<void> {
  await expect(tx)
    .to.emit(contract, eventName);

  if (args) {
    await expect(tx)
      .to.emit(contract, eventName)
      .withArgs(...args);
  }
}

export async function expectRevert(
  tx: Promise<any>,
  message: string
): Promise<void> {
  await expect(tx).to.be.revertedWith(message);
}

export function randomUint256(): bigint {
  return BigInt(
    ethers.hexlify(ethers.randomBytes(32))
  );
}

export function randomAddress(): string {
  return ethers.Wallet.createRandom().address;
}

export function formatUnits(value: bigint, decimals: number = 18): string {
  return ethers.formatUnits(value, decimals);
}

export function parseUnits(value: string, decimals: number = 18): bigint {
  return ethers.parseUnits(value, decimals);
}
