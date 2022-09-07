// Not actually a schema, just the type.

interface User {
  [key: string]: unknown;
  _id: string;
  emails: Array<{ value: string; verified: boolean }>;
  displayName: string;
  credits: {
    free: number;
    paid: number;
  };
  createdAt: Date;
  stripeCustomerId: string;
  redeemedCreditCodes: string[];
}

export type { User };
