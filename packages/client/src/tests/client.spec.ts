import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { SubstrateContractClient } from '../substrate/client';
import * as dotenv from 'dotenv';
import { EVMContractClient } from '../evm/client';
import { BridgeContract, Currency } from '../evm/types';
import { providers, Wallet } from 'ethers';

dotenv.config();

const MNEMONIC = process.env.MNEMONIC;

describe('xc-20 bridge client', () => {
  describe('substrate', () => {
    let client: SubstrateContractClient, walletAddress: string;

    beforeAll(async () => {
      client = await SubstrateContractClient.getInstanceNode(
        'wss://qco-moon-rpc-2-moonbase-sm-rpc-1.moonbase.ol-infra.network',
        MNEMONIC,
      );
      walletAddress = client.getAccountAddress();
    });

    afterAll(async () => {
      await client.destroyInstance();
    });

    test('bridge from substrate to evm', async () => {
      const result = await client.bridgeToEvm(
        1000,
        '0x4C2A866EB59511a6aD78db5cd4970464666b745a',
        1337,
        BigInt('1000000000000000000'),
      );
      console.log('hash', result.txHash.toHex())
      console.log('blockNumber', result.blockNumber.toHuman())
      console.log('status', result.status.toHuman())
      for(const e of result.events){
        console.log('event', e.toHuman())
      }
      expect(result.isCompleted);
      expect(result.txHash.hash.toHex().substring(0, 2)).toEqual('0x');
    });
  });

  describe('evm', () => {
    let client: EVMContractClient;
    beforeAll(async () => {
      const provider = new providers.JsonRpcProvider(
        'https://rpc.api.moonbase.moonbeam.network',
      );
      const wallet = Wallet.fromMnemonic(MNEMONIC).connect(provider);
      client = await EVMContractClient.getInstance(
        wallet,
        BridgeContract.MOONBASE,
      );
    });

    test('bridge from evm to substrate', async () => {
      const receipt = await client.bridgeToSubstrate(
        {
          currency: Currency.XC_BTR,
          amount: BigInt('1000000000000000000'),
        },
        {
          currency: Currency.XC_TUSDC,
          amount: BigInt('40000000'),
        },
        1001,
        '5CcMjFPRuWzs7ijRoRLuWbE8ki2GWhEwc9RrhwhzjWgMNpAa',
      );

      console.log('receipt.transactionHash', receipt.transactionHash)
      console.log('receipt.status', receipt.status)
      expect(receipt.transactionHash.substring(0, 2)).toEqual('0x');
    });
  });
});
