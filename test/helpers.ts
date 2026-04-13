import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const REPO_ROOT = process.cwd();
const TSX_CLI_PATH = path.join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const ENTRY_FILE_PATH = path.join(REPO_ROOT, "src", "index.ts");

export async function withTempDir(
  prefix: string,
  callback: (tempDir: string) => Promise<void>,
): Promise<void> {
  const tempDir = await mkdtemp(path.join(tmpdir(), prefix));

  try {
    await callback(tempDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function writeFiles(
  rootDir: string,
  files: Record<string, string>,
): Promise<void> {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(rootDir, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }
}

export async function readText(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export function runCli(cwd: string, args: string[]) {
  return spawnSync(process.execPath, [TSX_CLI_PATH, ENTRY_FILE_PATH, ...args], {
    cwd,
    encoding: "utf8",
  });
}

export function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}
