import {ApiPromise, Keyring, SubmittableResult, WsProvider,} from '@polkadot/api';
import {KeyringPair} from '@polkadot/keyring/types';
import '@polkadot/api-augment';
import '@polkadot/types-augment';
import {SubmittableExtrinsic} from '@polkadot/api/types';
import {ISubmittableResult} from '@polkadot/types/types';
import {sleep, timeout} from '../util';
import {Signer} from '@polkadot/types/types/extrinsic';
import {InjectedAccountWithMeta} from '@polkadot/extension-inject/types';
import * as ethers from "ethers";

export class SubstrateContractClient {
  private static instance: SubstrateContractClient;

  private readonly api: ApiPromise;
  private readonly account: KeyringPair | InjectedAccountWithMeta;
  private readonly signer: Signer;

  private constructor(
    api: ApiPromise,
    account: KeyringPair | InjectedAccountWithMeta,
    signer: Signer = null,
  ) {
    this.api = api;
    this.account = account;
    this.signer = signer;
  }

  static async getInstanceNode(rpcEndpoint: string, mnemonic: string) {
    if (!SubstrateContractClient.instance) {
      const api = await ApiPromise.create({
        provider: new WsProvider(rpcEndpoint),
        throwOnConnect: true,
        noInitWarn: true,
      });
      const keyring = new Keyring({ type: 'sr25519' });
      const account = keyring.addFromMnemonic(mnemonic);

      SubstrateContractClient.instance = new SubstrateContractClient(
        api,
        account,
      );
    }
    return SubstrateContractClient.instance;
  }

  static async getInstanceBrowser(
    rpcEndpoint: string,
    account: InjectedAccountWithMeta,
    signer: Signer,
  ) {
    if (!SubstrateContractClient.instance) {
      const api = await ApiPromise.create({
        provider: new WsProvider(rpcEndpoint),
        throwOnConnect: true,
        noInitWarn: true,
      });

      SubstrateContractClient.instance = new SubstrateContractClient(
        api,
        account,
        signer,
      );
    }
    return SubstrateContractClient.instance;
  }

  async destroyInstance() {
    if (SubstrateContractClient.instance) {
      await this.api.disconnect();
      SubstrateContractClient.instance = null;
    }
  }

  private async signAndSend(tx: SubmittableExtrinsic<'promise'>) {
    const options = { nonce: -1 };
    let account: string | KeyringPair;
    if (this.signer) {
      options['signer'] = this.signer;
      account = this.account.address;
    } else {
      account = this.account as KeyringPair;
    }
    const signedTx = await tx.signAsync(account, options);

    return await this.sendAsync(signedTx);
  }

  private async sendAsync(
    transaction: SubmittableExtrinsic<'promise'>,
    waitForFinalization = true,
  ): Promise<SubmittableResult> {
    const decodeError = this.decodeError(this.api);
    function submit(): Promise<SubmittableResult> {
      return new Promise((resolve, reject) => {
        timeout(async () => {
          await transaction
            .send((result) => {
              // console.log('result', result.status.toString());
              if (result.status.isInBlock) {
                const error = decodeError(result);
                if (error) {
                  return reject(error);
                }
                if (!waitForFinalization) {
                  return resolve(result);
                }
              }
              if (result.status.isFinalized) {
                return resolve(result);
              }
              if (
                result.status.isInvalid ||
                result.status.isDropped ||
                result.status.isUsurped ||
                result.isError
              ) {
                const error = decodeError(result);
                return error ? reject(error) : reject(result);
              }
              // TODO: should we check this status?
              // if (result.status.isRetracted) {
              //   const error = decodeError(result);
              //   return error ? reject(error) : reject(result);
              // }
            })
            .catch((e) => reject(e));
        }, 60_000).catch((e) => reject(e));
      });
    }

    for (let i = 0; i < 200; ++i) {
      try {
        return await submit();
      } catch (e: any) {
        const msg =
          typeof e == 'string'
            ? e.toLowerCase()
            : e?.message
              ? e?.message.toString().toLowerCase()
              : String(e);
        if (msg.includes('priority is too low')) {
          await sleep(50);
          continue;
        } else if (msg.includes('transaction is outdated')) {
          continue;
        } else if (msg.includes('timeout')) {
          i += 9;
          continue;
        }

        throw e;
      }
    }

    throw new Error('Could not execute extrinsic');
  }

  private decodeError(api: ApiPromise) {
    return (result: ISubmittableResult) => {
      for (const e of result.events) {
        if (api.events.system.ExtrinsicFailed.is(e.event)) {
          const [error, _info] = e.event.data;
          if (error.isModule) {
            const { docs, method, section } = api.registry.findMetaError(
              error.asModule,
            );
            return new Error(`${section}.${method}: ${docs.join(' ')}`);
          }

          return new Error(error.toString());
        }
      }
      return null;
    };
  }

  getAccountAddress() {
    return this.account.address;
  }

  async bridgeToEvm(
    parachainId: number,
    addressTo: string,
    assetId: number,
    transferAmount: bigint,
  ) {
    if(!ethers.utils.isAddress(addressTo)) {
      throw new Error('Destination address is invalid');
    }
    const destinationMultiLocation = {
      V4: { parents: 1, interior: { X1: [{ Parachain: parachainId }] } },
    };
    const beneficiaryMultiLocation = {
      V4: {
        parents: 0,
        interior: { X1: [{ AccountKey20: { network: null, key: addressTo } }] },
      },
    };
    const assetMultiLocation = {
      V4: [
        {
          id: {
            parents: 0,
            interior: {
              X2: [{ PalletInstance: 50 }, { generalIndex: assetId }],
            },
          },
          fun: {
            Fungible: transferAmount,
          },
        },
      ],
    };
    const tx = this.api.tx.polkadotXcm.transferAssets(
      destinationMultiLocation,
      beneficiaryMultiLocation,
      assetMultiLocation,
      0,
      'Unlimited',
    );

    return await this.signAndSend(tx);
  }
}
