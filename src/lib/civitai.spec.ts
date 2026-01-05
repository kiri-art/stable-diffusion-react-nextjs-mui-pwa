import { describe, expect, test as it, vi } from "vitest";
import createFetchCache from "fetch-mock-cache";
import Store from "fetch-mock-cache/stores/fs";

import {
  extractModelId,
  fetchModel,
  modelIdFromIdOrUrlOrHash,
} from "./civitai";

const fetchCache = createFetchCache({ Store });

describe("CivitAI", () => {
  describe("fetchModel", () => {
    it("works", async () => {
      vi.stubGlobal("fetch", fetchCache);
      const model = await fetchModel(99201);
      expect(model.id).toBe(99201);
      vi.unstubAllGlobals();
    });
  });

  describe("extractModelId", () => {
    it("works", () => {
      vi.stubGlobal("fetch", fetchCache);
      expect(extractModelId("99201")).toBe("99201");
      expect(
        extractModelId("https://civitai.com/models/99201/angelina-jolie-jg"),
      ).toBe("99201");
      expect(extractModelId("https://civitai.com/models/99201")).toBe("99201");
      vi.unstubAllGlobals();
    });
  });

  describe("modelIdFromIdOrUrlOrHash", () => {
    it("works", async () => {
      vi.stubGlobal("fetch", fetchCache);
      const hashes = [
        "7BFDB20388",
        "7BFDB20388CD3511DB6FB0B0D0F2868729B9FCA121A1314C7EBB1B180FA6B43D",
        "874FAE83",
        "37639B4200718864EF4AA76BB1F83166DD19A0C6C0A6129BCEFCF5427442DF11",
      ];

      for (const hash of hashes) {
        expect(await modelIdFromIdOrUrlOrHash(hash)).toBe(103638);
      }
      vi.unstubAllGlobals();
    });
  });
});
