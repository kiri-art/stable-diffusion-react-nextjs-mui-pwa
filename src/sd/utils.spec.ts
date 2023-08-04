import { prompt_a111_to_compel } from "./utils";

describe("utils", () => {
  describe("prompt_a111_to_compel", () => {
    const f = prompt_a111_to_compel;
    it("works", () => {
      expect(f("a (blue) deer")).toBe("a blue+ deer");
      expect(f("a (blue) (blue) deer")).toBe("a blue+ blue+ deer");
      expect(f("a [[big blue]] deer")).toBe("a (big blue)-- deer");
      expect(f("a (blue:1.5) deer")).toBe("a (blue)1.5 deer");
      expect(f("<lora:name:1.5>")).toBe("withLora(name,1.5)");
    });

    it("skips compel", () => {
      const g = (input: string) => expect(f(input)).toBe(input);
      g("a blue+ (blue)1.2 deer");
      g("(something, something).verb(args)");
    });
  });
});
