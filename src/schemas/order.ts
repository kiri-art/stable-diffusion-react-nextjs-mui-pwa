// Not actually a schema, just the type.

interface Order {
  [key: string]: unknown;
  amount: number;
  currency: string;
  stripePaymentIntentId?: string;
  stripePaymentIntentStatus?:
    | "requires_payment_method"
    | "requires_confirmation"
    | "requires_action"
    | "processing"
    | "requires_capture"
    | "canceled"
    | "succeeded";
  stripePaymentFailedReason?: string;
  createdAt: Date;
}

export type { Order };
