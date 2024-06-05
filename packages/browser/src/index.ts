import {
  SubstrateContractClient,
  EVMContractClient,
  BridgeContract,
  Token,
} from 'xc20-bridge';

import { cryptoWaitReady } from '@polkadot/util-crypto';
import * as ethers from 'ethers';
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
} from '@polkadot/extension-dapp';

let evmSigner: ethers.providers.JsonRpcSigner, evmClient: EVMContractClient;
let substrateClient: SubstrateContractClient;

async function loadClients() {
  // SUBSTRATE
  await cryptoWaitReady();
  const substrateAccounts = await enableExtension();
  const substrateAccount = substrateAccounts[0];
  console.log('account', substrateAccount);
  const injector = await web3FromAddress(substrateAccount.address);
  substrateClient = await SubstrateContractClient.getInstanceBrowser(
    'wss://qco-moon-rpc-2-moonbase-sm-rpc-1.moonbase.ol-infra.network',
    substrateAccount,
    injector.signer,
  );

  // EVM
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const evmProvider = new ethers.providers.Web3Provider(window.ethereum);
  evmSigner = evmProvider.getSigner();
  evmClient = await EVMContractClient.getInstance(
    evmSigner,
    BridgeContract.MOONBASE,
  );
}
async function bridgeToSubstrate() {
  const signerAddress = await evmSigner.getAddress();
  const destinationAddress = '5F1JYDkmcfkZtANZ8C8yzqJUKmqvjLSZZ58DtNHXDJvV7ZfX';
  const bridgedToken = {
    token: Token.XC_BTR,
    amount: BigInt('1000000000000000000'),
  };
  const bridgeFeeToken = {
    token: Token.XC_TUSDC,
    amount: BigInt('1000000'),
  };

  // existential balance of wallet we are bridging to
  const coinBalance = await substrateClient.getCoinBalance(destinationAddress);
  console.log('coinBalance', coinBalance);
  if (coinBalance < BigInt('1')) {
    throw new Error('Destination address existential balance too low');
  }

  // sufficient balance of bridging asset
  const bridgedTokenBalance = await evmClient.getTokenBalance(
    bridgedToken.token,
    signerAddress,
  );
  console.log('bridgedTokenBalance', bridgedTokenBalance);
  if (bridgedToken.amount > bridgedTokenBalance) {
    throw new Error('Not enough tokens in wallet to bridge them.');
  }

  // sufficient balance of bridge fee tokens
  const bridgeFeeTokenBalance = await evmClient.getTokenBalance(
    bridgeFeeToken.token,
    signerAddress,
  );
  console.log('bridgeFeeTokenBalance', bridgeFeeTokenBalance);
  if (bridgeFeeTokenBalance < bridgeFeeToken.amount) {
    throw new Error('Not enough tokens in wallet to pay bridging fee.');
  }

  const receipt = await evmClient.bridgeToSubstrate(
    bridgedToken,
    bridgeFeeToken,
    1001,
    destinationAddress,
  );
  console.log('receipt', receipt);
}

async function enableExtension() {
  await web3Enable('My Polkadot App');
  return await web3Accounts();
}

async function bridgeToEvm() {
  const bridgedAssetId = 1337;
  const bridgedAssetAmount = BigInt('1000000000000000000');
  const destinationAddress = '0x4C2A866EB59511a6aD78db5cd4970464666b745a';
  console.log('destinationAddress', destinationAddress);

  const signerAddress = substrateClient.getAccountAddress();

  // check that there is enough tokens for bridging
  const bridgedAssetBalance = await substrateClient.getTokenBalance(
    bridgedAssetId,
    signerAddress,
  );
  if (bridgedAssetAmount > bridgedAssetBalance) {
    throw new Error('Cant bridge asset since balance is too low.');
  }
  console.log('transferAssetBalance', bridgedAssetBalance);

  // make sure there is enough base token to pay TX
  const feeTokenBalance = await substrateClient.getCoinBalance(signerAddress);
  if (feeTokenBalance <= BigInt(0)) {
    throw new Error('Balance is too low to pay transaction fees.');
  }
  console.log('feeTokenBalance', feeTokenBalance);

  const result = await substrateClient.bridgeToEvm(
    1000,
    destinationAddress,
    bridgedAssetId,
    bridgedAssetAmount,
  );
  console.log('hash', result.txHash.toHex());
  console.log('blockNumber', result.blockNumber.toHuman());
  console.log('status', result.status.toHuman());
  for (const e of result.events) {
    console.log('event', e.toHuman());
  }
}

window.onload = () => {
  const bridgeToSubstrateButton = document.getElementById('bridgeToSubstrate');
  if (bridgeToSubstrateButton) {
    bridgeToSubstrateButton.addEventListener('click', bridgeToSubstrate);
  }
  const bridgeToEvmButton = document.getElementById('bridgeToEvm');
  if (bridgeToEvmButton) {
    bridgeToEvmButton.addEventListener('click', bridgeToEvm);
  }
  loadClients().catch(console.error);
};

window.onbeforeunload = function () {
  substrateClient.destroyInstance().catch(console.error);
};
