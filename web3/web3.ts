import { ethers, formatEther, parseEther } from "../ethers.min.js";
import {
  ChainIds,
  getDirectDebitContractAddress,
  rpcUrl,
} from "./constants..ts";
import DirectDebitArtifact from "../artifacts/DirectDebit.json" assert {
  type: "json",
};
import { Buffer } from "https://deno.land/x/node_buffer@1.1.0/mod.ts";
import { PaymentIntentRow, RelayerBalance } from "../db/queries.ts";

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
 * Upgrades the provider to wallet that can sign transactions
 * @param provider
 * @returns Wallet
 */

export function getWallet(provider: any) {
  const key = getSecretKey();
  return new ethers.Wallet(key, provider);
}

/** Gets the smart contract using the provider and network id
 *
 * @param provider
 * @param networkId
 * @returns ethers.Contract
 */

// I need to implement the server side Contract functions here with ethers js
export function getContract(provider: any, networkId: string) {
  const address = getDirectDebitContractAddress[networkId as ChainIds];

  return new ethers.Contract(
    address,
    DirectDebitArtifact.abi,
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
) {
  const provider = getProvider(networkId);
  const contract = getContract(provider, networkId);
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
      ethers.parseEther(args.maxDebitAmount),
      args.debitTimes,
      args.debitInterval,
      ethers.parseEther(args.actualDebitedAmount),
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
) {
  const provider = getProvider(networkId);
  const wallet = getWallet(provider);
  const contract = getContract(wallet, networkId);
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
      ethers.parseEther(args.maxDebitAmount),
      args.debitTimes,
      args.debitInterval,
      ethers.parseEther(args.actualDebitedAmount),
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

export interface TransactionGasCalculationsArgs {
  proof: string;
  publicSignals: string;
  paymentIntentRow: PaymentIntentRow;
  chainId: string | ChainIds;
  relayerBalance: RelayerBalance;
}

//Todo will need a rewrite to support EIP-1559
export type TransactionGasCalulcationsResult = {
  success: boolean;
  gasLimit: bigint;
  gasPrice: bigint;
  totalFee: bigint;
  maxFeePerGas: any;
  maxPriorityFeePerGas: any;
};

/** estimate gas for the transaction and calculate if the relayer can relay it
 *
 * @param TransactionGasCalculationsArgs
 * @returns true if the relayer can submit the transaciton!
 */

export async function transactionGasCalculations(
  {
    proof,
    publicSignals,
    paymentIntentRow,
    chainId,
    relayerBalance,
  }: TransactionGasCalculationsArgs,
): Promise<TransactionGasCalulcationsResult> {
  try {
    //Gonna Estimate Gas for the transaction, this will also check if it's valid!
    const estimatedGas = await estimateRelayerGas({
      proof,
      publicSignals,
      payeeAddress: paymentIntentRow.payee_address,
      maxDebitAmount: paymentIntentRow.maxDebitAmount,
      actualDebitedAmount: paymentIntentRow.maxDebitAmount,
      debitTimes: paymentIntentRow.debitTimes,
      debitInterval: paymentIntentRow.debitInterval,
    }, chainId);
    console.log("estimatedGas", estimatedGas);
    const increasedGasLimit = increaseGasLimit(estimatedGas);
    console.log("increasedGasLimit", increasedGasLimit);
    const feeData = await getGasPrice(chainId as ChainIds);
    console.log("feeData", feeData);
    return {
      success: checkIfRelayerBalanceIsEnough({
        chainId: chainId as ChainIds,
        feeData,
        increasedGasLimit,
        relayerBalance,
      }),
      gasLimit: increasedGasLimit,
      gasPrice: feeData.gasPrice,
      totalFee: calculateFeePerChainId(
        chainId as ChainIds,
        feeData,
        increasedGasLimit,
      ),
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    };
  } catch (err) {
    console.log(err);
    return {
      success: false,
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
  console.log("current Relayer Balance", currentRelayerBalance);

  const estimatedFee = calculateFeePerChainId(
    chainId,
    feeData,
    increasedGasLimit,
  );
  console.log("estimatedFee", estimatedFee);
  console.log("formattedEstimatedFee", formatEther(estimatedFee));
  return parseEther(currentRelayerBalance) > estimatedFee;
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

function calculateFeePerChainId(
  chainId: ChainIds,
  feeData: { gasPrice: any; maxFeePerGas: any; maxPriorityFeePerGas: any },
  increasedGasLimit: bigint,
) {
  switch (chainId) {
    case ChainIds.BTT_TESTNET_ID:
      return feeData.gasPrice * increasedGasLimit;
    default:
      return BigInt(0);
  }
}
