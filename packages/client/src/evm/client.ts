import { Contract, providers, Signer } from 'ethers';

import { u8aToHex } from '@polkadot/util';
import {checkAddress, decodeAddress} from '@polkadot/util-crypto';
import { BridgeContract, TokenAmount } from './types';
import { abi } from './xtoken-abi';

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
    console.log('currencies', currencies)
    const feeItem = 0;
    const destination = [
      1,
      [
        `0x00${this.toHex(destinationParachainId).replace('0x', '')}`,
        `0x01${this.toHexAddress(destinationAddress).replace('0x', '')}00`,
      ],
    ];
    console.log('destination', destination)

    const weight = 1000000000;

    const transaction: providers.TransactionResponse =
      await this.contract.transferMultiCurrencies(
        currencies,
        feeItem,
        destination,
        weight,
        { gasLimit: 13000000 },
        // { gasLimit: gasLimitWithMargin },
      );
    return await transaction.wait();
  }
}
