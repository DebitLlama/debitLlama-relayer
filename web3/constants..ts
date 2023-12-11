export enum ChainIds {
  BTT_TESTNET_ID = "0x405",
  BTT_MAINNET_ID = "0xc7",
}
export enum VirtualAccountsContractAddress {
  BTT_TESTNET = "0xF75515Df5AC843a8B261E232bB890dc2F75A4066",
  BTT_MAINNET = "0xc4Cf42D5a6F4F061cf5F98d0338FC5913b6fF581",
}

export enum ConnectedWalletsContractAddress {
  BTT_TESTNET = "0x9c85da9E45126Fd45BC62656026A2E7226bba239",
  BTT_MAINNET = "0xF9962f3C23De4e864E56ef29125D460c785905c6",
}

export enum RPCURLS {
  BTT_TESTNET = "https://pre-rpc.bt.io/",
  BTT_MAINNET = "https://rpc.bittorrentchain.io",
}

export const getVirtualAccountsContractAddress: {
  [keys in ChainIds]: VirtualAccountsContractAddress;
} = {
  [ChainIds.BTT_TESTNET_ID]: VirtualAccountsContractAddress.BTT_TESTNET,
  [ChainIds.BTT_MAINNET_ID]: VirtualAccountsContractAddress.BTT_MAINNET,
};

export const getConnectedWalletsContractAddress: {
  [keys in ChainIds]: ConnectedWalletsContractAddress;
} = {
  [ChainIds.BTT_TESTNET_ID]: ConnectedWalletsContractAddress.BTT_TESTNET,
  [ChainIds.BTT_MAINNET_ID]: ConnectedWalletsContractAddress.BTT_MAINNET,
};

export const rpcUrl: { [key in ChainIds]: RPCURLS } = {
  [ChainIds.BTT_TESTNET_ID]: RPCURLS.BTT_TESTNET,
  [ChainIds.BTT_MAINNET_ID]: RPCURLS.BTT_MAINNET,
};

export enum Pricing {
  Fixed = "Fixed",
  Dynamic = "Dynamic",
}

export enum AccountTypes {
  VIRTUALACCOUNT = "VIRTUALACCOUNT",
  CONNECTEDWALLET = "CONNECTEDWALLET",
}

export enum DynamicPaymentRequestJobsStatus {
  CREATED = "Created",
  LOCKED = "Locked",
  COMPLETED = "Completed",
  REJECETED = "Rejected",
}

export enum PaymentIntentStatus {
  CREATED = "CREATED",
  CANCELLED = "CANCELLED",
  RECURRING = "RECURRING",
  PAID = "PAID",
  BALANCETOOLOWTORELAY = "BALANCETOOLOWTORELAY",
  ACCOUNTBALANCETOOLOW = "ACCOUNTBALANCETOOLOW",
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
  accountType: AccountTypes;
};

export type PaymentIntentRow = {
  id: number;
  created_at: string;
  creator_user_id: string;
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
  BTT_Mainnet_Balance: string;
  Missing_BTT_Mainnet_Balance: string;
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
};

export function isPaymentIntentRow(
  pi: PaymentIntentRow | DynamicPaymentRequestJobRow,
): pi is PaymentIntentRow {
  return (pi as PaymentIntentRow).paymentIntent !== undefined;
}
