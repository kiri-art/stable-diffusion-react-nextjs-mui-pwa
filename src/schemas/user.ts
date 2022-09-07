// Not actually a schema, just the type.

interface User {
  [key: string]: unknown;
  emails: Array<{ value: string; verified: boolean }>;
  displayName: string;
  credits: {
    free: number;
    paid: number;
  };
  createdAt: Date;
  stripeCustomerId: string;
}

export type { User };
