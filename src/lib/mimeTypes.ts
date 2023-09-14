/*
 * View other byte signature patterns here:
 *
 *  1) https://mimesniff.spec.whatwg.org/#matching-an-image-type-pattern
 *  2) https://en.wikipedia.org/wiki/List_of_file_signatures
 *
 * Currently we only look at first 4 bytes....  TODO, variable length.
 */

const headers: Record<string, string> = {
  "89504e47": "image/png",
  "47494638": "image/gif", // +"0D0A1A0A"
  "52494646": "image/webp",
  "57454250": "image/webp",
  "49492A00": "image/tiff",
  "4D4D002A": "image/tiff",
  ffd8ffe0: "image/jpeg",
  ffd8ffe1: "image/jpeg",
  ffd8ffe2: "image/jpeg",
  ffd8ffe3: "image/jpeg",
  ffd8ffe8: "image/jpeg",
};

export function getMimeTypeFromBuffer(buffer: Buffer): string {
  const arr = new Uint8Array(buffer).subarray(0, 4);
  const header = Array.from(arr)
    .map((x) => x.toString(16))
    .join("");

  const mimeType = headers[header];
  if (!mimeType) {
    throw new Error(
      `Unknown header "${header}", returning file.type instead: "{$file.type}"`
    );
  }
  return mimeType;
}

export function getMimeType(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onloadend = function (event: ProgressEvent<FileReader>) {
      if (!event.target) return reject("No event");
      if (!(event.target.result instanceof ArrayBuffer))
        return reject("event.target.result not an ArrayBuffer");

      const arr = new Uint8Array(event.target.result).subarray(0, 4);
      const header = Array.from(arr)
        .map((x) => x.toString(16))
        .join("");

      const mimeType = headers[header];
      if (!mimeType) {
        console.warn(
          `Unknown header "${header}", returning file.type instead: "{$file.type}"`
        );
      }
      return resolve(mimeType || file.type);
    };

    fileReader.readAsArrayBuffer(file);
  });
}

export const extensions = {
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/tiff": "tiff",
  "image/jpeg": "jpg",
} as Record<string, string>;
