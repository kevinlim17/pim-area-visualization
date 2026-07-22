// When this app lives inside the PIM workspace, refresh the checked-in digest
// snapshot from pim/digests/*.json. In a standalone GitHub Pages repository the
// workspace directory is absent, so keep the checked-in snapshot unchanged.
import { existsSync, readdirSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "..", "..", "digests");
const destDir = join(__dirname, "..", "src", "data", "digests");

if (existsSync(srcDir)) {
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });

  const files = readdirSync(srcDir).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    copyFileSync(join(srcDir, f), join(destDir, f));
  }

  console.log(`sync-digests: copied ${files.length} sidecar file(s) into the app snapshot`);
} else if (existsSync(destDir)) {
  const files = readdirSync(destDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    throw new Error("sync-digests: the checked-in digest snapshot is empty");
  }
  console.log(`sync-digests: using ${files.length} checked-in sidecar file(s)`);
} else {
  throw new Error("sync-digests: no workspace source or checked-in digest snapshot found");
}
