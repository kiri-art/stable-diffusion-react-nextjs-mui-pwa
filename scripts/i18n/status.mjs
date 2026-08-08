import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const localesDir = path.join(repoRoot, "locales");
const { default: linguiConfig } = await import(
  pathToFileURL(path.join(repoRoot, "lingui.config.mjs")).href
);
const sourceLocale = linguiConfig.sourceLocale;

function readPoFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseQuoted(line, prefix) {
  try {
    return JSON.parse(line.slice(prefix.length));
  } catch {
    return null;
  }
}

function parseCatalog(content) {
  const entries = [];
  const blocks = content.split(/\n{2,}/);

  for (const block of blocks) {
    if (!block.trim()) continue;

    const lines = block.split("\n");
    let reading = null;
    let msgid = "";
    let msgstr = "";
    let obsolete = false;

    for (const line of lines) {
      if (line.startsWith("#~")) {
        obsolete = true;
        continue;
      }

      if (line.startsWith("msgid ")) {
        reading = "msgid";
        msgid = parseQuoted(line, "msgid ") ?? "";
        continue;
      }

      if (line.startsWith("msgstr ")) {
        reading = "msgstr";
        msgstr = parseQuoted(line, "msgstr ") ?? "";
        continue;
      }

      if (line.startsWith('"')) {
        const segment = parseQuoted(line, "");
        if (segment === null) continue;
        if (reading === "msgid") msgid += segment;
        if (reading === "msgstr") msgstr += segment;
      }
    }

    if (!msgid) continue;

    entries.push({ msgid, msgstr, obsolete });
  }

  return entries;
}

function getLocaleStats(entries, locale) {
  const activeEntries = entries.filter((entry) => !entry.obsolete);
  const obsoleteEntries = entries.filter((entry) => entry.obsolete);
  const missingEntries =
    locale === sourceLocale
      ? []
      : activeEntries.filter((entry) => entry.msgstr.trim() === "");

  return {
    activeCount: activeEntries.length,
    missingCount: missingEntries.length,
    obsoleteCount: obsoleteEntries.length,
    missingEntries,
  };
}

const localeDirs = fs
  .readdirSync(localesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

console.log("Lingui catalog status\n");

for (const locale of localeDirs) {
  const filePath = path.join(localesDir, locale, "messages.po");
  const entries = parseCatalog(readPoFile(filePath));
  const stats = getLocaleStats(entries, locale);

  console.log(
    `${locale}: active=${stats.activeCount} missing=${stats.missingCount} obsolete=${stats.obsoleteCount}`,
  );

  if (stats.missingEntries.length > 0) {
    for (const entry of stats.missingEntries.slice(0, 10)) {
      console.log(`  - ${entry.msgid}`);
    }

    if (stats.missingEntries.length > 10) {
      console.log(`  - ...and ${stats.missingEntries.length - 10} more`);
    }
  }
}
