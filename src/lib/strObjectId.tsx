// TODO, fix in gongo :)

export default function strObjectId(obj: unknown) {
  if (typeof obj === "string") return obj;
  if (typeof obj !== "object")
    throw new Error("Not sure what to do with " + JSON.stringify(obj));
  if (obj === null) return "NULL";
  // @ts-expect-error: go home typescript
  if (obj._bsontype === "ObjectID")
    // @ts-expect-error: go home typescript
    return obj.id
      .split("")
      .map((s: string) => s.charCodeAt(0).toString(16))
      .map((s: string) => (s.length === 1 ? "0" + s : s))
      .join("");
  return obj.toString();
}
