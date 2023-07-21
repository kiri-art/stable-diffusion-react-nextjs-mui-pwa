import fetchMock from "jest-fetch-mock";
fetchMock.enableMocks();

import { describe, expect, test as it } from "@jest/globals";
import createCachingMock from "jest-fetch-mock-cache";
import NodeFsStore from "jest-fetch-mock-cache/lib/stores/nodeFs";

import {
  fetchModel,
  extractModelId,
  modelIdFromIdOrUrlOrHash,
} from "./civitai";

fetchMock.mockImplementation(createCachingMock({ store: new NodeFsStore() }));

describe("CivitAI", () => {
  describe("fetchModel", () => {
    it("works", async () => {
      const model = await fetchModel(99201);
      expect(model.id).toBe(99201);
    });
  });

  describe("extractModelId", () => {
    it("works", () => {
      expect(extractModelId("99201")).toBe("99201");
      expect(
        extractModelId("https://civitai.com/models/99201/angelina-jolie-jg")
      ).toBe("99201");
      expect(extractModelId("https://civitai.com/models/99201")).toBe("99201");
    });
  });

  describe("modelIdFromIdOrUrlOrHash", () => {
    it("works", async () => {
      const hashes = [
        "7BFDB20388",
        "7BFDB20388CD3511DB6FB0B0D0F2868729B9FCA121A1314C7EBB1B180FA6B43D",
        "874FAE83",
        "37639B4200718864EF4AA76BB1F83166DD19A0C6C0A6129BCEFCF5427442DF11",
      ];

      for (const hash of hashes) {
        expect(await modelIdFromIdOrUrlOrHash(hash)).toBe(103638);
      }
    });
  });
});
