import { Contract, providers, Signer, utils } from 'ethers';

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
      [feeToken.token, feeToken.amount.toString()],
      [transferToken.token, transferToken.amount.toString()],
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

    const gasLimit = await this.contract.estimateGas.transferMultiCurrencies(
      currencies,
      feeItem,
      destination,
      weight,
    );
    const block = await this.contract.provider.getBlock('latest');
    const baseFeePerGas = block.baseFeePerGas;
    const priorityFeeWei = utils.parseUnits('1', 'gwei');
    const totalGasPriceWei = baseFeePerGas.add(priorityFeeWei);
    const transactionCostWei = totalGasPriceWei.mul(gasLimit);
    const transactionCostEth = utils.formatEther(transactionCostWei);
    console.log('transactionCostEth', transactionCostEth);

    const transaction: providers.TransactionResponse =
      await this.contract.transferMultiCurrencies(
        currencies,
        feeItem,
        destination,
        weight,
        { gasLimit },
      );
    return await transaction.wait();
  }
}
