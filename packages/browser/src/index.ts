import {evm, substrate} from 'xc20-bridge';
import {cryptoWaitReady} from '@polkadot/util-crypto';
import * as ethers from 'ethers';
import {web3Accounts, web3Enable, web3FromAddress,} from '@polkadot/extension-dapp';
import {BridgeContract, Currency} from 'xc20-bridge/dist/evm/types';

async function bridgeToSubstrate() {
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const client = await evm.EVMContractClient.getInstance(
    signer,
    BridgeContract.MOONBASE,
  );
  const destinationAddress = '5F1JYDkmcfkZtANZ8C8yzqJUKmqvjLSZZ58DtNHXDJvV7ZfX'
  console.log('destinationAddress', destinationAddress)
  const receipt = await client.bridgeToSubstrate(
    {
      currency: Currency.XC_BTR,
      amount: BigInt('1000'),
    },
    {
      currency: Currency.XC_TUSDC,
      amount: BigInt('40000000'),
    },
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
  await cryptoWaitReady();
  const accounts = await enableExtension();

  const account = accounts[0];
  console.log('account', account)
  const injector = await web3FromAddress(account.address);
  injector.signer;
  const client = await substrate.SubstrateContractClient.getInstanceBrowser(
    'wss://qco-moon-rpc-2-moonbase-sm-rpc-1.moonbase.ol-infra.network',
    account,
    injector.signer,
  );
  const destinationAddress = '0x4C2A866EB59511a6aD78db5cd4970464666b745a'
  console.log('destinationAddress', destinationAddress)
  try {
    const result = await client.bridgeToEvm(
      1000,
        destinationAddress,
      1337,
      BigInt("9999800000"),
    );
    console.log('hash', result.txHash.toHex())
    console.log('blockNumber', result.blockNumber.toHuman())
    console.log('status', result.status.toHuman())
    for(const e of result.events){
      console.log('event', e.toHuman())
    }
  } finally {
    await client.destroyInstance();
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
};
