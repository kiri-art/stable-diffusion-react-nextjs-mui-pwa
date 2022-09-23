// Not actually a schema, just the type.

export interface PayloadInitStart {
  device: string;
  hostname: string;
  model_id: string;
}

type PayloadEmpty = Record<string, never>;

interface CSend {
  [key: string]: unknown;
  _id: string;
  type: "init" | "inference";
  status: string;
  container_id: string;
  t: number;
  tsl: number;
  date: Date;
  payload: PayloadEmpty | PayloadInitStart; // TODO
  __updatedAt: number;
}

export type { CSend };
