import { describe, expect, it, vi } from "vitest";

import { createAccountDeletionExternalServices } from "./external";

describe("account-deletion external services", () => {
  it("constructs SDK clients lazily and reports missing configuration on use", async () => {
    const createS3Client = vi.fn();
    const createStripeClient = vi.fn();
    const services = createAccountDeletionExternalServices({
      createS3Client,
      createStripeClient,
      env: {},
    });

    expect(createS3Client).not.toHaveBeenCalled();
    expect(createStripeClient).not.toHaveBeenCalled();
    await expect(services.deleteS3Objects?.(["object-key"])).rejects.toThrow(
      "AWS credentials are not configured",
    );
    await expect(services.deleteStripeCustomer?.("cus_target")).rejects.toThrow(
      "STRIPE_SECRET_KEY is not configured",
    );
    expect(createS3Client).not.toHaveBeenCalled();
    expect(createStripeClient).not.toHaveBeenCalled();
  });

  it("deduplicates S3 keys, deletes in 1,000-object chunks, and preserves partial progress", async () => {
    const requests: Array<{ Delete: { Objects: Array<{ Key: string }> } }> = [];
    const services = createAccountDeletionExternalServices({
      env: {
        AWS_ACCESS_KEY_ID_APP: "test-access-key",
        AWS_SECRET_ACCESS_KEY_APP: "test-secret-key",
      },
      createS3Client: () => ({
        deleteObjects: (request) => {
          requests.push(request);
          const keys = request.Delete.Objects.map(({ Key }) => Key);
          return {
            promise: async () =>
              keys[0] === "key-1000"
                ? { Errors: [{ Key: "key-1000", Code: "Denied" }] }
                : { Deleted: keys.map((Key) => ({ Key })) },
          };
        },
      }),
    });
    const keys = Array.from({ length: 1_001 }, (_, index) => `key-${index}`);

    const result = await services.deleteS3Objects?.([...keys, "key-0"]);

    expect(requests).toHaveLength(2);
    expect(requests[0].Delete.Objects).toHaveLength(1_000);
    expect(requests[1].Delete.Objects).toEqual([{ Key: "key-1000" }]);
    expect(result).toEqual({ affectedRows: 1_000, failed: ["key-1000"] });
  });

  it("deletes a Stripe customer and counts the affected resource", async () => {
    const del = vi.fn().mockResolvedValue({ deleted: true });
    const createStripeClient = vi.fn(() => ({ customers: { del } }));
    const services = createAccountDeletionExternalServices({
      env: { STRIPE_SECRET_KEY: "sk_test_account_deletion" },
      createStripeClient,
    });

    await expect(
      services.deleteStripeCustomer?.("cus_target"),
    ).resolves.toEqual({ affectedRows: 1 });
    expect(createStripeClient).toHaveBeenCalledExactlyOnceWith(
      "sk_test_account_deletion",
    );
    expect(del).toHaveBeenCalledExactlyOnceWith("cus_target");
  });

  it("treats an already-deleted Stripe customer as converged success", async () => {
    const del = vi.fn().mockRejectedValue({
      code: "resource_missing",
      statusCode: 404,
      type: "StripeInvalidRequestError",
    });
    const services = createAccountDeletionExternalServices({
      env: { STRIPE_SECRET_KEY: "sk_test_account_deletion" },
      createStripeClient: () => ({ customers: { del } }),
    });

    await expect(
      services.deleteStripeCustomer?.("cus_already_deleted"),
    ).resolves.toEqual({ affectedRows: 1 });
    expect(del).toHaveBeenCalledExactlyOnceWith("cus_already_deleted");
  });
});
