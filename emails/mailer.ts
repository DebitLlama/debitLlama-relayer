import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export interface SendMailArgs {
  from: string;
  to: string;
  subject: string;
  content: string;
  html: string;
}

export async function sendMail(args: SendMailArgs) {
  const SMTP_HOSTNAME = Deno.env.get("SMTP_HOSTNAME") || "";
  const SMTP_USERNAME = Deno.env.get("SMTP_USERNAME") || "";
  const SMTP_PASS = Deno.env.get("SMTP_PASSWORD") || "";

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOSTNAME,
      port: 465,
      tls: true,
      auth: {
        username: SMTP_USERNAME,
        password: SMTP_PASS,
      },
    },
  });

  await client.send({ ...args });

  await client.close();
}

export interface EmailContent {
  content: string;
  html: string;
}

export interface BillingStatementArgs {
  subsciptionLink: string;
  billedAmount: string;
}

export const BillingStatementPayee = (
  args: BillingStatementArgs,
): EmailContent => {
  return {
    content:
      `Billing Statement. Your have received ${args.billedAmount} \n See the payment intent for more details ${args.subsciptionLink}`,
    html: `<div style="text-align: center;">
    <h2 style="margin: 0 auto;">Billing Statement</h2>
    <p>
    You have received a new payment of ${args.billedAmount}.
    </p>
    <p>
    See the <a href="${args.subsciptionLink}" target="_blank">Payment Intent</a> for more details!
    </p>
    </div>`,
  };
};

export const BillingStatementCustomer = (
  args: BillingStatementArgs,
): EmailContent => {
  return {
    content:
      `Billing Statement. Your account has been debited ${args.billedAmount}.\n See the Subsciption for more details ${args.subsciptionLink}`,
    html: `<div style="text-align: center;">
    <h2 style="margin: 0 auto;">Billing Statement</h2>
    <p>
    We have billed your account ${args.billedAmount}. 
    </p>
    <p>
    See the <a href="${args.subsciptionLink}" target="_blank" >Subsciption</a> for more details!
    </p>
    </div>`,
  };
};

export const PaymentFailurePayee = (
  args: BillingStatementArgs,
): EmailContent => {
  return {
    content: `Your payment request has failed. ${args.subsciptionLink}`,
    html:
      `<p>Your payment request has failed! \n You can find more details at the <a href="${args.subsciptionLink}" target="_blank">link here</a></p>`,
  };
};

export const PaymentFailureCustomer = (
  args: BillingStatementArgs,
): EmailContent => {
  return {
    content:
      `You have insufficient balance in your account to continue payments. The merchant may cancel your subsciption. To continue please update your balance using the accounts dashboard! \n ${args.subsciptionLink}`,
    html:
      `<p>You have insufficient balance in your account to continue payments, the merchant may cancel your subsciption. To continue please update your balance! You can find more details at the <a href="${args.subsciptionLink}" target="_blank">link here</a></p>`,
  };
};

export const DynamicPaymentRequestRejected = (
  args: BillingStatementArgs,
): EmailContent => {
  return {
    content:
      `Your payment request was rejected. We are unable to process it this time. Please create a new request.\n ${args.subsciptionLink}`,
    html:
      `<p>Your payment request was rejected. We are unable to process it this time. Please create a new request <a href="${args.subsciptionLink}" target="_blank">here</a></p>`,
  };
};

export enum SendMailReason {
  BillingSTPayee,
  BillingStCustomer,
  PaymentFailurePayee,
  PaymentFailureCustomer,
  DynamicPaymentRequestRejected,
}

function getEmailContent(
  reason: SendMailReason,
  args: BillingStatementArgs,
): EmailContent {
  switch (reason) {
    case SendMailReason.BillingSTPayee:
      return BillingStatementPayee(args);

    case SendMailReason.BillingStCustomer:
      return BillingStatementCustomer(args);
    case SendMailReason.PaymentFailurePayee:
      return PaymentFailurePayee(args);
    case SendMailReason.PaymentFailureCustomer:
      return PaymentFailureCustomer(args);
    case SendMailReason.DynamicPaymentRequestRejected:
      return DynamicPaymentRequestRejected(args);
    default:
      return { content: "", html: "" };
  }
}

const getEmailSubject: { [key in SendMailReason]: string } = {
  [SendMailReason.DynamicPaymentRequestRejected]: "Payment Request Failed",
  [SendMailReason.BillingSTPayee]: "Billing Statement",
  [SendMailReason.BillingStCustomer]: "Billing Statement",
  [SendMailReason.PaymentFailureCustomer]: "Payment Failed",
  [SendMailReason.PaymentFailurePayee]: "Payment Failed",
};

export async function doSendMailTo(
  reason: SendMailReason,
  args: BillingStatementArgs,
  emailTo: string,
) {
  const { content, html } = getEmailContent(reason, args);
  const subject = getEmailSubject[reason];
  await sendMail({
    from: "noreply@debitllama.com",
    to: emailTo,
    subject,
    content,
    html,
  });
}
