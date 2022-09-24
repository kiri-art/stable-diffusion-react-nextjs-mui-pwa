// Not actually a schema, just the type.

export interface PayloadInitStart {
  device: string;
  hostname: string;
  model_id: string;
}

export interface PayloadInferStart {
  startRequestId: string;
}

type PayloadEmpty = Record<string, never>;

interface CSendBase {
  [key: string]: unknown;
  _id: string;
  type: "init" | "inference";
  status: string;
  container_id: string;
  t: number;
  tsl: number;
  date: Date;
  payload: PayloadEmpty | PayloadInitStart | PayloadInitStart;
  __updatedAt: number;
}

interface CSendInitStart extends CSendBase {
  type: "init";
  status: "start";
  payload: PayloadInitStart;
}

interface CSendInferStart extends CSendBase {
  type: "inference";
  status: "start";
  payload: PayloadInitStart;
}

type CSend = CSendInitStart | CSendInferStart | CSendBase;

export type { CSend };
