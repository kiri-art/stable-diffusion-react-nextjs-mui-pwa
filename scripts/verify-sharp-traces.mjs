import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const traceRoot = resolve(process.argv[2] ?? ".next/server");

function* findTraceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* findTraceFiles(entryPath);
    } else if (entry.name.endsWith(".nft.json")) {
      yield entryPath;
    }
  }
}

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function isSharpRuntimeFile(filePath) {
  return /(?:^|\/)node_modules\/sharp(?:\/|-[^/]+$)/.test(
    normalizePath(filePath),
  );
}

function isLinuxX64LibvipsLibrary(filePath) {
  return /(?:^|\/)node_modules\/@img\/sharp-libvips-linux-x64\/lib\/libvips-cpp\.so\./.test(
    normalizePath(filePath),
  );
}

if (!existsSync(traceRoot)) {
  throw new Error(
    `Next.js output trace directory does not exist: ${relative(process.cwd(), traceRoot)}`,
  );
}

const sharpTraces = [];
const failures = [];

for (const traceFile of findTraceFiles(traceRoot)) {
  const trace = JSON.parse(readFileSync(traceFile, "utf8"));

  if (!Array.isArray(trace.files)) {
    throw new TypeError(`Invalid Next.js output trace: ${traceFile}`);
  }

  if (!trace.files.some(isSharpRuntimeFile)) {
    continue;
  }

  sharpTraces.push(traceFile);

  const libvipsFiles = trace.files.filter(isLinuxX64LibvipsLibrary);

  if (libvipsFiles.length === 0) {
    failures.push(
      `${traceFile}: no Linux x64 libvips shared library is traced`,
    );
    continue;
  }

  for (const libvipsFile of libvipsFiles) {
    const absolutePath = resolve(dirname(traceFile), libvipsFile);

    if (!existsSync(absolutePath)) {
      failures.push(
        `${traceFile}: traced file does not exist: ${absolutePath}`,
      );
    }
  }
}

if (sharpTraces.length === 0) {
  failures.push(`${traceRoot}: no Sharp runtime traces were found`);
}

if (failures.length > 0) {
  console.error("Sharp output trace verification failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Verified Linux x64 libvips in ${sharpTraces.length} Sharp output trace(s).`,
  );
}
