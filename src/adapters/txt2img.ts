import type Txt2ImgOpts from "../schemas/txt2imgOpts";

// \u001b[A\u001b[A

export default async function txt2img(
  opts: typeof Txt2ImgOpts,
  {
    setLog,
    imgResult,
  }: {
    setLog: (log: string[]) => void;
    imgResult: React.MutableRefObject<HTMLImageElement | undefined>;
  }
) {
  let log: string[] = [];
  let up = 0;
  let buffer;
  console.log("start");
  const response = await fetch("/api/txt2img-exec");
  if (!response.body) throw new Error("No body");
  const reader = response.body.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    try {
      // const str = Buffer.from(value).toString("utf-8");
      const str = String.fromCharCode.apply(null, value);
      const strs = str.trim().split("\n");
      for (const str of strs) {
        const obj = JSON.parse(str);
        if (obj.$type === "stdout" || obj.$type === "stderr") {
          let line = obj.data;
          while (line.endsWith("\u001b[A")) {
            line = line.substr(0, line.length - "\u001b[A".length);
            up++;
          }
          log = log.slice(0, log.length - up).concat([line]);
          up = 0;
          setLog(log);
        } else if (obj.$type === "done") {
          setLog(log.concat(["[WebUI] Loading image..."]));
          const response = await fetch("/api/imgFetchAndDelete?dir=" + obj.dir);
          const blob = await response.blob();
          const objectURL = URL.createObjectURL(blob);
          if (imgResult.current) imgResult.current.src = objectURL;
          setLog([]);
        } else {
          console.log(obj);
        }
      }
    } catch (e) {
      console.error(e);
      console.error(value);
      throw new Error("Invalid JSON");
    }
  }

  console.log("done");
}
