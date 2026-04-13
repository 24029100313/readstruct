import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { END_MARKER, injectIntoReadme, START_MARKER } from "../src/injector";
import { readText, withTempDir, writeFiles } from "./helpers";

test("injectIntoReadme replaces an existing READSTRUCT block and writes a backup", async () => {
  await withTempDir("readstruct-injector-replace-", async (tempDir) => {
    const readmePath = path.join(tempDir, "README.md");
    const original = [
      "# Demo",
      START_MARKER,
      "old content",
      END_MARKER,
      "tail",
      "",
    ].join("\n");

    await writeFiles(tempDir, { "README.md": original });

    const result = await injectIntoReadme(
      readmePath,
      `${START_MARKER}\nnew content\n${END_MARKER}\n`,
    );

    const updated = await readText(readmePath);
    const backup = await readText(`${readmePath}.bak`);

    assert.equal(result.mode, "replaced");
    assert.match(updated, /new content/);
    assert.doesNotMatch(updated, /old content/);
    assert.equal(backup, original);
  });
});

test("injectIntoReadme appends when markers are missing", async () => {
  await withTempDir("readstruct-injector-append-", async (tempDir) => {
    const readmePath = path.join(tempDir, "README.md");

    await writeFiles(tempDir, { "README.md": "# Demo\n" });

    const result = await injectIntoReadme(
      readmePath,
      `${START_MARKER}\nappended block\n${END_MARKER}\n`,
    );

    const updated = await readText(readmePath);

    assert.equal(result.mode, "appended");
    assert.match(updated, /# Demo/);
    assert.match(updated, /appended block/);
  });
});

test("injectIntoReadme creates README when it does not exist", async () => {
  await withTempDir("readstruct-injector-create-", async (tempDir) => {
    const readmePath = path.join(tempDir, "README.md");

    const result = await injectIntoReadme(
      readmePath,
      `${START_MARKER}\ncreated block\n${END_MARKER}\n`,
    );

    const updated = await readText(readmePath);

    assert.equal(result.mode, "created");
    assert.equal(result.backupPath, null);
    assert.match(updated, /created block/);
  });
});

test("injectIntoReadme rejects incomplete markers", async () => {
  await withTempDir("readstruct-injector-invalid-", async (tempDir) => {
    const readmePath = path.join(tempDir, "README.md");

    await writeFiles(tempDir, { "README.md": `${START_MARKER}\nonly start\n` });

    await assert.rejects(
      () => injectIntoReadme(readmePath, `${START_MARKER}\nnew\n${END_MARKER}\n`),
      /标记不完整或顺序错误/,
    );
  });
});
