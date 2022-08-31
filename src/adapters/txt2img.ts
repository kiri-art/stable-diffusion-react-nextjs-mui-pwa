import type Txt2ImgOpts from "../schemas/txt2imgOpts";

// \u001b[A\u001b[A

export default async function txt2img(
  opts: typeof Txt2ImgOpts,
  { setLog }: { setLog: (log: string[]) => void }
) {
  let log: string[] = [];
  let up = 0;
  console.log("start");
  const response = await fetch("/api/txt2img-exec");
  if (!response.body) throw new Error("No body");
  const reader = response.body.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    try {
      const obj = JSON.parse(Buffer.from(value).toString("utf-8"));
      if (obj.$type === "stdout" || obj.$type === "stderr") {
        let line = obj.data;
        while (line.endsWith("\u001b[A")) {
          line = line.substr(0, line.length - "\u001b[A".length);
          up++;
        }
        (obj.$type === "stdout" ? console.log : console.error)(line);
        log = log.slice(0, log.length - up).concat([line]);
        up = 0;
        setLog(log);
      } else console.log(obj);
    } catch (e) {
      console.error(e);
      console.error(value);
      throw new Error("Invalid JSON");
    }
  }

  console.log("done");
}
