import { Contract, providers, Signer } from 'ethers';

import { u8aToHex } from '@polkadot/util';
import { checkAddress, decodeAddress } from '@polkadot/util-crypto';
import { BridgeContract, TokenAmount } from './types';
import { abi } from './xtoken-abi';
import { ERC20Abi } from './erc20-abi';

export class EVMContractClient {
  private static instance: EVMContractClient;
  private readonly contract: Contract;

  private constructor(contract: Contract) {
    this.contract = contract;
  }

  static async getInstance(signer: Signer, xTokenContract: BridgeContract) {
    if (!EVMContractClient.instance) {
      const contract = new Contract(xTokenContract, abi, signer);
      EVMContractClient.instance = new EVMContractClient(contract);
    }
    return EVMContractClient.instance;
  }

  private toHexAddress(address: string): string {
    return u8aToHex(decodeAddress(address));
  }

  private toHex(parachainId: number) {
    return parachainId.toString(16).toUpperCase().padStart(8, '0');
  }

  // QUERIES
  async getCoinBalance(walletAddress: string): Promise<bigint> {
    const balance = await this.contract.provider.getBalance(walletAddress);
    return balance.toBigInt();
  }
  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
  ): Promise<bigint> {
    const provider = this.contract.provider;
    const contract = new Contract(tokenAddress, ERC20Abi, provider);
    const balance = await contract.balanceOf(walletAddress);

    return balance.toBigInt();
  }

  // TRANSACTIONS

  async bridgeToSubstrate(
    transferToken: TokenAmount,
    feeToken: TokenAmount,
    destinationParachainId: number,
    destinationAddress: string,
  ) {
    const [isValid] = checkAddress(destinationAddress, 42);
    if (!isValid) {
      throw new Error('Destination address is invalid');
    }
    const currencies = [
      [feeToken.currency, feeToken.amount.toString()],
      [transferToken.currency, transferToken.amount.toString()],
    ];
    console.log('currencies', currencies);
    const feeItem = 0;
    const destination = [
      1,
      [
        `0x00${this.toHex(destinationParachainId).replace('0x', '')}`,
        `0x01${this.toHexAddress(destinationAddress).replace('0x', '')}00`,
      ],
    ];
    console.log('destination', destination);

    const weight = 1000000000;

    const transaction: providers.TransactionResponse =
      await this.contract.transferMultiCurrencies(
        currencies,
        feeItem,
        destination,
        weight,
        { gasLimit: 1300000 },
      );
    return await transaction.wait();
  }
}
