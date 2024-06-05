# Moonbase XC-20 Bridge Clients

https://docs.moonbeam.network/builders/interoperability/xcm/xc20/send-xc20s/xtokens-precompile/

### EVM Explorer: 

https://moonbase.subscan.io/

### Substrate Chain State: 

https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fqco-moon-rpc-2-moonbase-sm-rpc-1.moonbase.ol-infra.network#/chainstate

## SubstrateContractClient -> bridgeToEvm

- parachainId: number - chain if to bridge to
- addressTo: string - bridge to address
- assetId: number - asset id to bridge
- transferAmount: bigint - amount to bridge

Bridges `transferAmount` of tokens with id `assetId` to parachain with id `parachainId` and address specified by `addressTo`.


## EVMContractClient -> bridgeToSubstrate

- transferToken: TokenAmount - transfer token and amount 
- feeToken: TokenAmount - fee token and amount
- destinationParachainId: number - parachain to bridge to
- destinationAddress: string - address on parachain to bridge to

Bridges token defined by `transferToken` to parachain with id `destinationParachainId` and address `destinationParachainId`. For bridging fees are paid with token defined with `feeToken`.

## Client Tests

Two tests to test bridging on each client.

## Browser App

Simple app to showcase bridging from one chain to another and vice versa.
