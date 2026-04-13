import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { renderStructure, renderTree } from "../src/renderer";
import type { TreeNode } from "../src/scanner";
import { withTempDir, writeFiles } from "./helpers";

function createFixtureTree(): TreeNode[] {
  return [
    {
      name: "fixture-project",
      path: ".",
      isDir: true,
      depth: 0,
      children: [
        {
          name: "src",
          path: "src",
          isDir: true,
          depth: 1,
          children: [
            {
              name: "index.ts",
              path: "src/index.ts",
              isDir: false,
              depth: 2,
            },
          ],
        },
        {
          name: "README.md",
          path: "README.md",
          isDir: false,
          depth: 1,
        },
      ],
    },
  ];
}

test("renderTree renders emoji and plain tree variants", () => {
  const tree = createFixtureTree();

  const emojiTree = renderTree(tree, true);
  const plainTree = renderTree(tree, false);

  assert.match(emojiTree, /📁 fixture-project\//);
  assert.match(emojiTree, /📝 README\.md/);
  assert.match(plainTree, /^fixture-project\//);
  assert.doesNotMatch(plainTree, /📁|📝|📄|⚙️|🖼️|🔧/);
});

test("renderStructure renders the default template with a stable generated date", async () => {
  await withTempDir("readstruct-renderer-default-", async (tempDir) => {
    await writeFiles(tempDir, {
      "package.json": JSON.stringify({ name: "fixture-project" }),
    });

    const markdown = await renderStructure(createFixtureTree(), {
      rootDir: tempDir,
      templatePath: null,
      emoji: true,
      totalFiles: 2,
      totalDirs: 2,
      generatedAt: new Date(2024, 0, 2, 12, 0, 0),
    });

    assert.match(markdown, /<!-- READSTRUCT:START -->/);
    assert.match(markdown, /## 📁 Project Structure/);
    assert.match(markdown, /2024-01-02/);
    assert.match(markdown, /共 2 个文件夹，2 个文件/);
    assert.match(markdown, /📁 fixture-project\//);
  });
});

test("renderStructure accepts a custom template with UTF-8 BOM", async () => {
  await withTempDir("readstruct-renderer-template-", async (tempDir) => {
    const templatePath = path.join(tempDir, "custom.hbs");

    await writeFiles(tempDir, {
      "package.json": JSON.stringify({ name: "fixture-project" }),
      "custom.hbs":
        "\ufeff<!-- READSTRUCT:START -->\n# {{title}}\n{{date}}\n{{tree}}\n<!-- READSTRUCT:END -->\n",
    });

    const markdown = await renderStructure(createFixtureTree(), {
      rootDir: tempDir,
      templatePath,
      emoji: false,
      totalFiles: 2,
      totalDirs: 2,
      generatedAt: new Date(2024, 0, 2, 12, 0, 0),
    });

    assert.equal(markdown.charCodeAt(0), "<".charCodeAt(0));
    assert.match(markdown, /# fixture-project/);
    assert.match(markdown, /2024-01-02/);
    assert.match(markdown, /fixture-project\//);
    assert.doesNotMatch(markdown, /^\ufeff/);
  });
});
