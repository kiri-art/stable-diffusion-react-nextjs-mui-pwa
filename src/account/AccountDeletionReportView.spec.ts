import { describe, expect, it } from "vitest";

import {
  getAccountDeletionApiError,
  isAccountDeletionReport,
} from "./AccountDeletionReportView";

describe("getAccountDeletionApiError", () => {
  it("uses the structured API error message", () => {
    const response = new Response(null, {
      status: 409,
      statusText: "Conflict",
    });

    expect(
      getAccountDeletionApiError(response, {
        error: {
          code: "ACCOUNT_DELETION_CONFLICT",
          message: "The deletion preview has expired.",
        },
      }),
    ).toBe("The deletion preview has expired.");
  });

  it("keeps compatibility with a string error", () => {
    const response = new Response(null, {
      status: 400,
      statusText: "Bad Request",
    });

    expect(
      getAccountDeletionApiError(response, { error: "Invalid confirmation." }),
    ).toBe("Invalid confirmation.");
  });
});

describe("isAccountDeletionReport", () => {
  const report = {
    collections: [],
    resources: [],
    status: "partial",
    targetUserId: "64b000000000000000000003",
  } as const;

  it("accepts an optional string cleanup receipt", () => {
    expect(
      isAccountDeletionReport({
        ...report,
        deletionId: "64b000000000000000000004",
      }),
    ).toBe(true);
  });

  it("rejects a malformed cleanup receipt", () => {
    expect(isAccountDeletionReport({ ...report, deletionId: 42 })).toBe(false);
  });
});
