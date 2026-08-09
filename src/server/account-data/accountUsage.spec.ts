import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import {
  ACCOUNT_USAGE_SCHEMA_VERSION,
  dailyAccountUsageUpsert,
} from "./accountUsage";

describe("daily account usage", () => {
  it("contains billing totals but no raw request identifiers or inputs", () => {
    const userId = new ObjectId("64d000000000000000000001");
    const write = dailyAccountUsageUpsert({
      credits: 2.5,
      date: new Date("2026-08-09T23:59:59.999Z"),
      paid: true,
      userId,
    });

    expect(write).toEqual({
      filter: {
        _id: { date: new Date("2026-08-09T00:00:00.000Z"), userId },
      },
      options: { upsert: true },
      update: {
        $inc: {
          credits: 2.5,
          freeCredits: 0,
          paidCredits: 2.5,
          requests: 1,
        },
        $set: {
          date: new Date("2026-08-09T00:00:00.000Z"),
          schemaVersion: ACCOUNT_USAGE_SCHEMA_VERSION,
          userId,
        },
      },
    });
    expect(JSON.stringify(write)).not.toMatch(
      /callID|callInputs|modelInputs|prompt|startRequestId/,
    );
  });
});
