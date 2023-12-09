import { ethers } from "../ethers.min.js";
import {
  AccountTypes,
  ChainIds,
  getConnectedWalletsContractAddress,
  getVirtualAccountsContractAddress,
  PaymentIntentRow,
  RelayerBalance,
  rpcUrl,
} from "./constants..ts";
import VirtualAccountsArtifact from "../artifacts/VirtualAccounts.json" assert {
  type: "json",
};
import ConnectedWallets from "../artifacts/ConnectedWallets.json" assert {
  type: "json",
};

import { Buffer } from "https://deno.land/x/node_buffer@1.1.0/mod.ts";

/**
 * Get the json rpc provider for the network
 * @param networkId
 * @returns a JsonRpcProvider
 */

export function getProvider(networkId: string) {
  const url = rpcUrl[networkId as ChainIds];
  return new ethers.JsonRpcProvider(url);
}

/**
 * @returns the private key from the environment
 */

export function getSecretKey() {
  return Deno.env.get(
    "RELAYER_PRIVATEKEY",
  ) || "";
}

/**
 * Concat to string inside parseEther to avoid typeerrors with values coming from the database
 */
export function parseEther(input: string) {
  return ethers.parseEther(`${input}`);
}

/**
 * Upgrades the provider to wallet that can sign transactions
 * @param provider
 * @returns Wallet
 */

export function getWallet(provider: any) {
  const key = getSecretKey();
  return new ethers.Wallet(key, provider);
}

export interface CurrentRelayerBalances {
  name: string;
  balance: string;
  currency: string;
}

export interface RelayerData {
  balances: CurrentRelayerBalances[];
  address: string;
}

/**
 * A helper function to check what is the relayer's address now
 */
export async function getRelayerBalances(): Promise<RelayerData> {
  const BTTTestnetProvider = getProvider(ChainIds.BTT_TESTNET_ID);
  const BTTMainnetProvider = getProvider(ChainIds.BTT_MAINNET_ID);
  const wallet = getWallet(BTTMainnetProvider);
  const address = await wallet.getAddress();

  const BTTTestnetBalance = await BTTTestnetProvider.getBalance(address);
  const BTTMainnetBalance = await BTTMainnetProvider.getBalance(address);

  return {
    address,
    balances: [
      {
        name: "BTT Donau Testnet",
        balance: ethers.formatEther(BTTTestnetBalance),
        currency: "BTT",
      },
      {
        name: "BTT Mainnet Balance",
        balance: ethers.formatEther(BTTMainnetBalance),
        currency: "BTT",
      },
    ],
  };
}

/** Gets the smart contract using the provider and network id
 *
 * @param provider
 * @param networkId
 * @returns ethers.Contract
 */

// I need to implement the server side Contract functions here with ethers js
export function getContract(
  provider: any,
  networkId: string,
  accountType: AccountTypes,
) {
  const address = accountType === AccountTypes.VIRTUALACCOUNT
    ? getVirtualAccountsContractAddress[networkId as ChainIds]
    : getConnectedWalletsContractAddress[networkId as ChainIds];

  const abi = accountType === AccountTypes.VIRTUALACCOUNT
    ? VirtualAccountsArtifact.abi
    : ConnectedWallets.abi;

  return new ethers.Contract(
    address,
    abi,
    provider,
  );
}
/**
 * Pach the proof object to solidity compatible format
 * @param proof
 * @returns
 */

export function packToSolidityProof(proof: any) {
  return [
    proof.pi_a[0],
    proof.pi_a[1],
    proof.pi_b[0][1],
    proof.pi_b[0][0],
    proof.pi_b[1][1],
    proof.pi_b[1][0],
    proof.pi_c[0],
    proof.pi_c[1],
  ];
}

/** BigNumber to hex string of specified length */
export function toNoteHex(number: any, length = 32) {
  const str = number instanceof Buffer
    //@ts-ignore buffer does have that hex arg
    ? number.toString("hex")
    : BigInt(number).toString(16);
  return "0x" + str.padStart(length * 2, "0");
}

interface DirectDebitArgs {
  proof: any;
  publicSignals: any;
  payeeAddress: string;
  maxDebitAmount: string;
  actualDebitedAmount: string;
  debitTimes: number;
  debitInterval: number;
}
/**
 * Estimate the gas for the directdebit transaction and check if the transaction is valid
 * @param args
 * @param networkId
 * @returns gasLimit
 */

export async function estimateRelayerGas(
  args: DirectDebitArgs,
  networkId: string,
  accountType: AccountTypes,
) {
  const provider = getProvider(networkId);
  const contract = getContract(provider, networkId, accountType);
  const publicSignals = JSON.parse(args.publicSignals);
  const proof = JSON.parse(args.proof);

  //@ts-ignore ignoring weird typerror
  return await contract.directdebit.estimateGas(
    packToSolidityProof(proof),
    [
      toNoteHex(publicSignals[0]),
      toNoteHex(publicSignals[1]),
    ],
    args.payeeAddress,
    [
      parseEther(args.maxDebitAmount),
      args.debitTimes,
      args.debitInterval,
      parseEther(args.actualDebitedAmount),
    ],
  );
}

/**
 *  Relay the direct debit payment
 * @param args : DirectDebitArgs
 * @param networkId string
 * @param gasLimit bigint
 * @param gasPrice gasPrice
 * @returns a Transaction!
 */

export async function relayPayment(
  args: DirectDebitArgs,
  networkId: string,
  gasLimit: bigint,
  gasPrice: bigint,
  accountType: AccountTypes,
) {
  const provider = getProvider(networkId);
  const wallet = getWallet(provider);
  const contract = getContract(wallet, networkId, accountType);
  const publicSignals = JSON.parse(args.publicSignals);
  const proof = JSON.parse(args.proof);

  // TODO:  For chains that use it add maxPriorityFeePerGas and maxFeePerGas I need a different function!

  //@ts-ignore ignoring typerror
  return await contract.directdebit(
    packToSolidityProof(proof),
    [
      toNoteHex(publicSignals[0]),
      toNoteHex(publicSignals[1]),
    ],
    args.payeeAddress,
    [
      parseEther(args.maxDebitAmount),
      args.debitTimes,
      args.debitInterval,
      parseEther(args.actualDebitedAmount),
    ],
    { gasLimit, gasPrice },
  );
}

/**
 *  get the gas price for the chainId
 * @param chainId
 * @returns feeData
 */

export async function getGasPrice(chainId: ChainIds) {
  const provider = getProvider(chainId);

  const feeData = await provider.getFeeData();

  return {
    gasPrice: feeData.gasPrice,
    maxFeePerGas: feeData.maxFeePerGas === null
      ? BigInt(0)
      : feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas === null
      ? BigInt(0)
      : feeData.maxPriorityFeePerGas,
  };
}

/**
 * increase the gas limit by 30 percent to make sure the value we use is enough!
 * @param estimatedGasLimit
 * @returns bigint
 */

export const increaseGasLimit = (estimatedGasLimit: bigint) => {
  return (estimatedGasLimit * BigInt(130)) / BigInt(100); // increase by 30%
};

export interface TransactionGasCalculationsArgsForFixed {
  proof: string;
  publicSignals: string;
  paymentIntentRow: PaymentIntentRow;
  chainId: string | ChainIds;
  relayerBalance: RelayerBalance;
}
export interface TransactionGasCalculationsArgsForDynamic {
  proof: string;
  publicSignals: string;
  paymentIntentRow: PaymentIntentRow;
  chainId: ChainIds;
  allocatedGas: string;
  dynamicPaymentAmount: string;
}

//Todo will need a rewrite to support EIP-1559
export type TransactionGasCalulcationsResult = {
  relayerBalanceEnough: boolean;
  accountBalanceEnough: boolean;
  errored: boolean;
  gasLimit: bigint;
  gasPrice: bigint;
  totalFee: bigint;
  maxFeePerGas: any;
  maxPriorityFeePerGas: any;
};

/** estimate gas for the transaction and calculate if the relayer can relay it for FIXED PAYMENTS!
 *
 * @param TransactionGasCalculationsArgs
 * @returns true if the relayer can submit the transaciton!
 */

export async function transactionGasCalculationsForFixedPayments(
  {
    proof,
    publicSignals,
    paymentIntentRow,
    chainId,
    relayerBalance,
  }: TransactionGasCalculationsArgsForFixed,
): Promise<TransactionGasCalulcationsResult> {
  try {
    //Gonna Estimate Gas for the transaction, this will also check if it's valid!
    const estimatedGas = await estimateRelayerGas(
      {
        proof,
        publicSignals,
        payeeAddress: paymentIntentRow.payee_address,
        maxDebitAmount: paymentIntentRow.maxDebitAmount,
        actualDebitedAmount: paymentIntentRow.maxDebitAmount,
        debitTimes: paymentIntentRow.debitTimes,
        debitInterval: paymentIntentRow.debitInterval,
      },
      chainId,
      paymentIntentRow.account_id.accountType,
    );
    const increasedGasLimit = increaseGasLimit(estimatedGas);
    const feeData = await getGasPrice(chainId as ChainIds);
    return {
      relayerBalanceEnough: checkIfRelayerBalanceIsEnough({
        chainId: chainId as ChainIds,
        feeData,
        increasedGasLimit,
        relayerBalance,
      }),
      // Invalid account balance will cause the estimateGas to throw
      // So if it gets here the accountBalance must be enough!
      accountBalanceEnough: true,
      gasLimit: increasedGasLimit,
      gasPrice: feeData.gasPrice,
      totalFee: calculateFeePerChainId(
        chainId as ChainIds,
        feeData,
        increasedGasLimit,
      ),
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      errored: false,
    };
  } catch (err: any) {
    const accountBalanceEnough = await checkIfOnChainBalanceIsEnough(
      chainId as ChainIds,
      paymentIntentRow.commitment,
      paymentIntentRow.maxDebitAmount,
      paymentIntentRow.account_id.accountType,
    );

    return {
      relayerBalanceEnough: false,
      accountBalanceEnough,
      errored: true, // Checking if the process threw an error somewhere
      gasPrice: BigInt(0),
      gasLimit: BigInt(0),
      totalFee: BigInt(0),
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
    };
  }
}

type CheckIfRelayerBalanceIsEnoughArgs = {
  chainId: ChainIds;
  feeData: { gasPrice: any; maxFeePerGas: any; maxPriorityFeePerGas: any };
  increasedGasLimit: bigint;
  relayerBalance: RelayerBalance;
};

/**
 * Evaluate if the relayer has enough balance by comparing the current relayer balance
 * with the estimated fee for the transaction!
 * @param CheckIfRelayerBalanceIsEnoughArgs
 * @returns boolean true if the current relayer has enough balance to relay this transaction
 */

export function checkIfRelayerBalanceIsEnough(
  { chainId, feeData, increasedGasLimit, relayerBalance }:
    CheckIfRelayerBalanceIsEnoughArgs,
): boolean {
  const currentRelayerBalance = getRelayerBalanceForChainId(
    chainId,
    relayerBalance,
  );

  const estimatedFee = calculateFeePerChainId(
    chainId,
    feeData,
    increasedGasLimit,
  );
  return parseEther(currentRelayerBalance) >= estimatedFee;
}

function checkIfAccountBalanceIsEnough(
  accountBalance: string,
  debitAmount: string,
): boolean {
  const accountBalanceWei = parseEther(accountBalance);
  const debitAmountWei = parseEther(debitAmount);

  return accountBalanceWei >= debitAmountWei;
}

async function checkIfOnChainBalanceIsEnough(
  chainId: ChainIds,
  commitment: string,
  maxDebitAmount: string,
  accountType: AccountTypes,
) {
  const provider = getProvider(chainId);
  const debitcontract: any = getContract(
    provider,
    chainId,
    accountType,
  );

  const account = await debitcontract.getAccount(commitment).catch(
    (err: any) => {
      return BigInt("0");
    },
  );

  const balance = account[3];

  const maxDebitAmountWEI = parseEther(maxDebitAmount);

  return balance > maxDebitAmountWEI;
}

/**
 * Different chains have different rows in the DB for relayer balance!
 * Use this function to access them!
 * @param chainId
 * @param relayerBalance
 * @returns string relayer balance
 */

export function getRelayerBalanceForChainId(
  chainId: ChainIds,
  relayerBalance: RelayerBalance,
) {
  switch (chainId) {
    case ChainIds.BTT_TESTNET_ID:
      return relayerBalance.BTT_Donau_Testnet_Balance;
    case ChainIds.BTT_MAINNET_ID:
      return relayerBalance.BTT_Mainnet_Balance;
    default:
      return "0";
  }
}

/**
 * Calculate fee per chain Id, different chains have different fee models
 * Use this function to add new calculations, implement maxFeePerGas or maxPriorityFeePerGas for chains that use it!
 * @param chainId
 * @param feeData
 * @param increasedGasLimit
 * @returns the estimated fee associated with the transaction
 */

export function calculateFeePerChainId(
  chainId: ChainIds,
  feeData: { gasPrice: any; maxFeePerGas: any; maxPriorityFeePerGas: any },
  increasedGasLimit: bigint,
) {
  switch (chainId) {
    case ChainIds.BTT_TESTNET_ID:
      return feeData.gasPrice * increasedGasLimit;
    case ChainIds.BTT_MAINNET_ID:
      return feeData.gasPrice * increasedGasLimit;
    default:
      return BigInt(0);
  }
}

/**
 * Transaction gas calculations for DYNAMIC PAYMENTS
 */
export async function transactionGasCalculationsForDynamicPayments({
  proof,
  publicSignals,
  paymentIntentRow,
  chainId,
  allocatedGas,
  dynamicPaymentAmount,
}: TransactionGasCalculationsArgsForDynamic) {
  try {
    //Gonna Estimate Gas for the transaction, this will also check if it's valid!
    const estimatedGas = await estimateRelayerGas(
      {
        proof,
        publicSignals,
        payeeAddress: paymentIntentRow.payee_address,
        maxDebitAmount: paymentIntentRow.maxDebitAmount,
        actualDebitedAmount: dynamicPaymentAmount,
        debitTimes: paymentIntentRow.debitTimes,
        debitInterval: paymentIntentRow.debitInterval,
      },
      chainId,
      paymentIntentRow.account_id.accountType,
    );
    const increasedGasLimit = increaseGasLimit(estimatedGas);
    const feeData = await getGasPrice(chainId as ChainIds);
    return {
      allocatedGasEnough: checkIfAllocatedGasIsEnough({
        chainId,
        feeData,
        increasedGasLimit,
        allocatedGas,
      }),
      // Invalid account balance will cause the estimateGas to throw
      // So if it gets here the accountBalance must be enough!
      accountBalanceEnough: true,
      gasLimit: increasedGasLimit,
      gasPrice: feeData.gasPrice,
      totalFee: calculateFeePerChainId(
        chainId as ChainIds,
        feeData,
        increasedGasLimit,
      ),
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      errored: false,
    };
  } catch (err) {
    console.log(err);
    return {
      allocatedGasEnough: false,
      accountBalanceEnough: await checkIfOnChainBalanceIsEnough(
        chainId as ChainIds,
        paymentIntentRow.account_id.commitment,
        dynamicPaymentAmount,
        paymentIntentRow.account_id.accountType,
      ),
      errored: true, // Checking if the process threw an error somewhere
      gasPrice: BigInt(0),
      gasLimit: BigInt(0),
      totalFee: BigInt(0),
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
    };
  }
}

type CheckIfAllocatedGasIsEnough = {
  chainId: ChainIds;
  feeData: { gasPrice: any; maxFeePerGas: any; maxPriorityFeePerGas: any };
  increasedGasLimit: bigint;
  allocatedGas: string;
};

export function checkIfAllocatedGasIsEnough(
  { chainId, feeData, increasedGasLimit, allocatedGas }:
    CheckIfAllocatedGasIsEnough,
) {
  const estimatedFee = calculateFeePerChainId(
    chainId,
    feeData,
    increasedGasLimit,
  );
  return parseEther(allocatedGas) >= estimatedFee;
}
