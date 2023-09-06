export enum ChainIds {
  BTT_TESTNET_ID = "0x405",
}

export enum DirectDebitContractAddress {
  BTT_TESTNET = "0x003E9E692029118e110c9A73a37B62b04D3d79e9",
}

export enum RPCURLS {
  BTT_TESTNET = "https://pre-rpc.bt.io/",
}

export const getDirectDebitContractAddress: {
  [keys in ChainIds]: DirectDebitContractAddress;
} = {
  [ChainIds.BTT_TESTNET_ID]: DirectDebitContractAddress.BTT_TESTNET,
};

export const rpcUrl: { [key in ChainIds]: RPCURLS } = {
  [ChainIds.BTT_TESTNET_ID]: RPCURLS.BTT_TESTNET,
};

export enum Pricing {
  Fixed = "Fixed",
  Dynamic = "Dynamic",
}
