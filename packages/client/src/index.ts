import {EVMContractClient} from './evm/client';
import {BridgeContract, Currency} from './evm/types';
import {SubstrateContractClient} from './substrate/client';

const evm = {
  EVMContractClient,
  BridgeContract,
  Currency,
};

const substrate = { SubstrateContractClient };

export { evm, substrate };
