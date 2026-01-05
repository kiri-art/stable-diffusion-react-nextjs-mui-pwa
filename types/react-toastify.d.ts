declare module "react-toastify" {
  import type { ComponentType, ReactNode } from "react";

  export type ToastOptions = Record<string, unknown>;
  export type ToastId = number;

  export const ToastContainer: ComponentType<Record<string, unknown>>;
  export function toast(content: ReactNode, options?: ToastOptions): ToastId;
}
