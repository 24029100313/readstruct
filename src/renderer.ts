import { readFile } from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";

import type { TreeNode } from "./scanner";

export interface RenderContext {
  rootDir: string;
  templatePath: string | null;
  emoji: boolean;
  totalFiles: number;
  totalDirs: number;
  generatedAt?: Date;
}

export async function renderStructure(
  tree: TreeNode[],
  context: RenderContext,
): Promise<string> {
  const templateSource = await loadTemplate(context.templatePath);
  const template = Handlebars.compile(templateSource);
  const treeString = renderTree(tree, context.emoji);
  const title = await resolveTitle(context.rootDir);
  const sectionTitle = context.emoji ? "📁 Project Structure" : "Project Structure";

  const markdown = template({
    title,
    tree: new Handlebars.SafeString(treeString),
    date: formatLocalDate(context.generatedAt ?? new Date()),
    totalFiles: context.totalFiles,
    totalDirs: context.totalDirs,
    emojiEnabled: context.emoji,
    sectionTitle,
  });

  return normalizeLineEndings(markdown).trimEnd() + "\n";
}

export function renderTree(tree: TreeNode[], emojiEnabled: boolean): string {
  const lines: string[] = [];

  for (const [index, node] of tree.entries()) {
    lines.push(
      ...renderNode(node, "", index === tree.length - 1, true, emojiEnabled),
    );
  }

  return lines.join("\n");
}

async function loadTemplate(templatePath: string | null): Promise<string> {
  const resolvedPath =
    templatePath ?? path.resolve(__dirname, "..", "templates", "default.hbs");

  const raw = await readFile(resolvedPath, "utf8");

  return stripBom(raw);
}

async function resolveTitle(rootDir: string): Promise<string> {
  const packageJsonPath = path.join(rootDir, "package.json");
  const fallbackTitle = path.basename(path.resolve(rootDir)) || rootDir;

  try {
    const raw = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { name?: unknown };

    return typeof parsed.name === "string" && parsed.name.length > 0
      ? parsed.name
      : fallbackTitle;
  } catch {
    return fallbackTitle;
  }
}

function renderNode(
  node: TreeNode,
  prefix: string,
  isLast: boolean,
  isRoot: boolean,
  emojiEnabled: boolean,
): string[] {
  const label = formatNodeLabel(node, emojiEnabled);
  const currentLine = isRoot
    ? label
    : `${prefix}${isLast ? "└── " : "├── "}${label}`;

  const childPrefix = isRoot
    ? ""
    : `${prefix}${isLast ? "    " : "│   "}`;

  const lines = [currentLine];

  for (const [index, child] of (node.children ?? []).entries()) {
    lines.push(
      ...renderNode(
        child,
        childPrefix,
        index === (node.children?.length ?? 0) - 1,
        false,
        emojiEnabled,
      ),
    );
  }

  return lines;
}

function formatNodeLabel(node: TreeNode, emojiEnabled: boolean): string {
  const suffix = node.isDir ? "/" : "";
  const icon = emojiEnabled ? getNodeIcon(node) : null;
  const name = `${node.name}${suffix}`;

  return icon ? `${icon} ${name}` : name;
}

function getNodeIcon(node: TreeNode): string {
  if (node.isDir) {
    return "📁";
  }

  const extension = path.extname(node.name).toLowerCase();

  switch (extension) {
    case ".md":
      return "📝";
    case ".json":
      return "⚙️";
    case ".png":
    case ".jpg":
    case ".jpeg":
      return "🖼️";
    case ".sh":
      return "🔧";
    case ".ts":
    case ".js":
    default:
      return "📄";
  }
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
