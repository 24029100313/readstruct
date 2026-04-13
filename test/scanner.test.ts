import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  DEFAULT_IGNORE_PATTERNS,
  type ReadstructConfig,
} from "../src/config";
import { countTreeNodes, scanDirectory } from "../src/scanner";
import { withTempDir, writeFiles } from "./helpers";

test("scanDirectory honors default ignore rules, custom ignore rules, and .gitignore rules", async () => {
  await withTempDir("readstruct-scanner-rules-", async (tempDir) => {
    await writeFiles(tempDir, {
      "package.json": JSON.stringify({ name: "fixture-project" }),
      ".gitignore": "ignored-by-gitignore.md\ncustom-dir/\n",
      ".git/config": "[core]\nrepositoryformatversion = 0\n",
      "a-dir/z.ts": "export const z = 1;\n",
      "a-dir/a.ts": "export const a = 1;\n",
      "b-dir/file.ts": "export const b = 1;\n",
      "a-file.txt": "keep\n",
      "z-file.txt": "keep\n",
      "ignored-by-gitignore.md": "ignore me\n",
      "custom-dir/skip.ts": "ignore me\n",
      "ignore.tmp": "ignore me\n",
      "dist/out.js": "ignore me\n",
      "node_modules/pkg/index.js": "ignore me\n",
    });

    const config: ReadstructConfig = {
      rootDir: tempDir,
      outputPath: path.join(tempDir, "README.md"),
      templatePath: null,
      depth: 2,
      dryRun: true,
      emoji: true,
      ignore: [...DEFAULT_IGNORE_PATTERNS, "*.tmp"],
    };

    const tree = await scanDirectory(config);
    const root = tree[0];
    const childNames = (root.children ?? []).map((child) => child.name);
    const aDir = root.children?.find((child) => child.name === "a-dir");
    const stats = countTreeNodes(tree);

    assert.deepEqual(childNames, [
      "a-dir",
      "b-dir",
      ".gitignore",
      "a-file.txt",
      "package.json",
      "z-file.txt",
    ]);
    assert.deepEqual(aDir?.children?.map((child) => child.name), ["a.ts", "z.ts"]);
    assert.equal(stats.totalDirs, 3);
    assert.equal(stats.totalFiles, 7);
  });
});

test("scanDirectory truncates children when max depth is reached", async () => {
  await withTempDir("readstruct-scanner-depth-", async (tempDir) => {
    await writeFiles(tempDir, {
      "deep/child/grandchild.txt": "nested\n",
    });

    const config: ReadstructConfig = {
      rootDir: tempDir,
      outputPath: path.join(tempDir, "README.md"),
      templatePath: null,
      depth: 1,
      dryRun: true,
      emoji: true,
      ignore: [],
    };

    const tree = await scanDirectory(config);
    const deepDir = tree[0].children?.find((child) => child.name === "deep");

    assert.ok(deepDir);
    assert.deepEqual(deepDir.children, []);
  });
});
