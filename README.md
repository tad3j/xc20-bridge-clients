# XC-20 Bridge Clients

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