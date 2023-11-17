import {
  ChainIds,
  DynamicPaymentRequestJobsStatus,
  PaymentIntentStatus,
} from "../web3/constants..ts";

const appURL = Deno.env.get("URL") || "http://localhost:3000";
const xrelayer = Deno.env.get("XRELAYER") || "";

export async function lockDynamicPaymentRequests() {
  const url = `${appURL}/api/relayer/lock`;

  return await fetch(url, {
    method: "POST",
    headers: {
      "X-Relayer": xrelayer,
    },
  });
}

export async function getFixed(statusText: "CREATED" | "RECURRING") {
  const url = `${appURL}/api/relayer/fixedpayments`;

  return await fetch(url, {
    method: "POST",
    headers: {
      "X-Relayer": xrelayer,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ statusText }),
  });
}

export async function getRelayerBalance(payee_id: string) {
  const url = `${appURL}/api/relayer/balance`;
  return await fetch(url, {
    method: "GET",
    headers: {
      "X-Relayer": xrelayer,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payee_id }),
  }).then(async (response) => await response.json());
}

export async function updateAccountBalanceTooLow(paymentIntentId: number) {
  const url = `${appURL}/api/relayer/relayingfailed`;
  return await fetch(url, {
    method: "POST",
    headers: {
      "X-Relayer": xrelayer,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentIntentId,
      reason: PaymentIntentStatus.ACCOUNTBALANCETOOLOW,
    }),
  });
}

export async function updateRelayerBalanceTooLow(
  chainId: ChainIds,
  paymentIntentId: number,
  newMissingBalance: string,
  relayerBalanceId: number,
) {
  const url = `${appURL}/api/relayer/relayingfailed`;
  return await fetch(url, {
    method: "POST",
    headers: {
      "X-Relayer": xrelayer,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: PaymentIntentStatus.BALANCETOOLOWTORELAY,
      chainId,
      paymentIntentId,
      newMissingBalance,
      relayerBalanceId,
    }),
  });
}

export interface RelayingSuccessArgs {
  chainId: ChainIds;
  newRelayerBalance: string;
  payee_user_id: string;
  paymentIntentId: number;
  relayerBalanceId: number;
  submittedTransaction: string;
  allGasUsed: string;
  paymentAmount: string;
  currency: string;
  commitment: string;
  newAccountBalance: string;
  statusText: string;
  lastPaymentDate: string;
  nextPaymentDate: string | null;
  used_for: number;
}

export async function onRelayingSuccess(arg: RelayingSuccessArgs) {
  const url = `${appURL}/api/relayer/relayingsuccess`;
  return await fetch(url, {
    method: "POST",
    headers: {
      "X-Relayer": xrelayer,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });
}

export async function getDynamicPayment() {
  const url = `${appURL}/api/relayer/dynamicpayments`;
  return await fetch(url, {
    method: "POST",
    headers: {
      "X-Relayer": xrelayer,
      "Content-Type": "application/json",
    },
  });
}

export async function updateDynamicPaymentRequestJobTo(
  status: DynamicPaymentRequestJobsStatus,
  id: number,
) {
  const url = `${appURL}/api/relayer/dynamicjobstatus`;
  return await fetch(url, {
    method: "POST",
    headers: {
      "X-Relayer": xrelayer,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status, id }),
  });
}

export async function updatePaymentIntentAccountBalanceTooLowForDynamic(
  paymentIntentId: number,
  missingAmount: string,
) {
  const url = `${appURL}/api/relayer/balance`;
  return await fetch(url, {
    method: "POST",
    headers: {
      "X-Relayer": xrelayer,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentIntentId, missingAmount }),
  });
}
