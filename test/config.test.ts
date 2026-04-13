import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { DEFAULT_IGNORE_PATTERNS, loadConfig } from "../src/config";
import { withTempDir, writeFiles } from "./helpers";

test("loadConfig uses defaults when .readstructrc is missing", async () => {
  await withTempDir("readstruct-config-defaults-", async (tempDir) => {
    const config = await loadConfig({}, tempDir);

    assert.equal(config.rootDir, tempDir);
    assert.equal(config.outputPath, path.join(tempDir, "README.md"));
    assert.equal(config.templatePath, null);
    assert.equal(config.depth, 3);
    assert.equal(config.dryRun, false);
    assert.equal(config.emoji, true);
    assert.deepEqual(config.ignore, DEFAULT_IGNORE_PATTERNS);
  });
});

test("loadConfig lets CLI options override .readstructrc", async () => {
  await withTempDir("readstruct-config-override-", async (tempDir) => {
    await writeFiles(tempDir, {
      ".readstructrc": JSON.stringify({
        ignore: ["logs", "coverage"],
        depth: 5,
        emoji: false,
        template: "./from-config.hbs",
      }),
    });

    const config = await loadConfig(
      {
        dir: "./project",
        output: "./docs/README.md",
        template: "./custom.hbs",
        depth: 2,
        dryRun: true,
        emoji: true,
      },
      tempDir,
    );

    assert.equal(config.rootDir, path.join(tempDir, "project"));
    assert.equal(config.outputPath, path.join(tempDir, "docs", "README.md"));
    assert.equal(config.templatePath, path.join(tempDir, "custom.hbs"));
    assert.equal(config.depth, 2);
    assert.equal(config.dryRun, true);
    assert.equal(config.emoji, true);
    assert.ok(config.ignore.includes("logs"));
    assert.ok(config.ignore.includes("coverage"));
    assert.ok(config.ignore.includes("node_modules"));
  });
});

test("loadConfig accepts UTF-8 BOM in .readstructrc", async () => {
  await withTempDir("readstruct-config-bom-", async (tempDir) => {
    await writeFiles(tempDir, {
      ".readstructrc": "\ufeff{\"depth\":1,\"emoji\":false}",
    });

    const config = await loadConfig({}, tempDir);

    assert.equal(config.depth, 1);
    assert.equal(config.emoji, false);
  });
});

test("loadConfig rejects invalid JSON in .readstructrc", async () => {
  await withTempDir("readstruct-config-invalid-", async (tempDir) => {
    await writeFiles(tempDir, {
      ".readstructrc": "{bad json",
    });

    await assert.rejects(
      () => loadConfig({}, tempDir),
      /不是合法的 JSON/,
    );
  });
});
