import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { readText, runCli, withTempDir, writeFiles } from "./helpers";

test("CLI help shows generate command options", async () => {
  await withTempDir("readstruct-cli-help-", async (tempDir) => {
    const result = runCli(tempDir, ["gen", "--help"]);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /readstruct generate\|gen \[options\]/);
    assert.match(result.stdout, /--dry-run/);
    assert.match(result.stdout, /--no-emoji/);
  });
});

test("CLI dry run prints markdown to stdout and summary to stderr", async () => {
  await withTempDir("readstruct-cli-dry-run-", async (tempDir) => {
    await writeFiles(tempDir, {
      "package.json": JSON.stringify({ name: "cli-fixture" }),
      "src/index.ts": "export const value = 1;\n",
    });

    const result = runCli(tempDir, ["gen", "--dry-run", "--no-emoji", "--depth", "1"]);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /<!-- READSTRUCT:START -->/);
    assert.match(result.stdout, /## Project Structure/);
    assert.match(result.stdout, /cli-fixture\//);
    assert.doesNotMatch(result.stdout, /📁|📄|📝|⚙️|🖼️|🔧/);
    assert.match(result.stderr, /Dry run 完成：/);
  });
});

test("CLI supports --depth 0", async () => {
  await withTempDir("readstruct-cli-depth-", async (tempDir) => {
    await writeFiles(tempDir, {
      "package.json": JSON.stringify({ name: "depth-fixture" }),
      "src/index.ts": "export const value = 1;\n",
    });

    const result = runCli(tempDir, ["gen", "--dry-run", "--depth", "0"]);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /📁 depth-fixture\//);
    assert.doesNotMatch(result.stdout, /src\//);
  });
});

test("CLI writes a README and backup in the full generate flow", async () => {
  await withTempDir("readstruct-cli-write-", async (tempDir) => {
    const readmePath = path.join(tempDir, "README.md");

    await writeFiles(tempDir, {
      "package.json": JSON.stringify({ name: "write-fixture" }),
      "src/index.ts": "export const value = 1;\n",
      "README.md": "# Demo\n\n<!-- READSTRUCT:START -->\nold\n<!-- READSTRUCT:END -->\n",
    });

    const result = runCli(tempDir, ["gen", "--dir", ".", "--output", "./README.md", "--depth", "2"]);
    const updated = await readText(readmePath);
    const backup = await readText(`${readmePath}.bak`);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /已更新 README/);
    assert.match(result.stdout, /备份文件：/);
    assert.match(updated, /write-fixture\//);
    assert.match(updated, /src\//);
    assert.match(backup, /old/);
  });
});
