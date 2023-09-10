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


export enum DynamicPaymentRequestJobsStatus {
  CREATED = "Created",
  LOCKED = "Locked",
  COMPLETED = "Completed",
  REJECETED = "Rejected",
}

export enum PaymentIntentStatus {
  CREATED = "Created",
  CANCELLED = "Cancelled",
  RECURRING = "Recurring",
  PAID = "Paid",
  BALANCETOOLOWTORELAY = "Balance too low to relay",
  ACCOUNTBALANCETOOLOW = "Account Balance too low",
}

export type Account = {
  id: number;
  created_at: string;
  user_id: string;
  network_id: string;
  commitment: string;
  name: string;
  closed: boolean;
  currency: string;
  balance: string;
};

export type PaymentIntentRow = {
  id: number;
  created_at: string;
  creator_user_id: number;
  payee_user_id: string;
  account_id: Account;
  payee_address: string;
  maxDebitAmount: string;
  debitTimes: number;
  debitInterval: number;
  paymentIntent: string;
  commitment: string;
  estimatedGas: string;
  statusText: string;
  lastPaymentDate: string | null;
  nextPaymentDate: string | null;
  pricing: string;
  currency: string;
  network: string;
  debit_item_id: number;
  used_for: number;
  proof: string;
  publicSignals: string;
  relayerBalance_id: RelayerBalance;
};


export type RelayerBalance = {
  id: number;
  created_at: string;
  BTT_Donau_Testnet_Balance: string;
  Missing_BTT_Donau_Testnet_Balance: string;
  user_id: string;
  last_topup: string;
};

export type DynamicPaymentRequestJobRow = {
id: number;
created_at: string;
paymentIntent_id: PaymentIntentRow;
requestedAmount: string;
status: string;
request_creator_id: string;
allocatedGas: string;
relayerBalance_id: number


}