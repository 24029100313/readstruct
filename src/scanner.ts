import fg from "fast-glob";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";

import type { ReadstructConfig } from "./config";

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  depth: number;
  children?: TreeNode[];
}

export interface TreeStats {
  totalFiles: number;
  totalDirs: number;
}

interface ScannedEntry {
  relativePath: string;
  isDir: boolean;
  depth: number;
}

export async function scanDirectory(config: ReadstructConfig): Promise<TreeNode[]> {
  const rootStat = await stat(config.rootDir);

  if (!rootStat.isDirectory()) {
    throw new Error(`扫描目录不存在或不是文件夹：${config.rootDir}`);
  }

  const rootName = await resolveRootName(config.rootDir);
  const rootNode: TreeNode = {
    name: rootName,
    path: ".",
    isDir: true,
    depth: 0,
    children: [],
  };

  if (config.depth === 0) {
    return [rootNode];
  }

  const matcher = ignore({ allowRelativePaths: true });
  matcher.add(config.ignore);
  matcher.add(await readGitignoreRules(config.rootDir));

  const entries = await fg("**/*", {
    cwd: config.rootDir,
    deep: config.depth,
    dot: true,
    followSymbolicLinks: false,
    markDirectories: true,
    objectMode: true,
    onlyFiles: false,
    suppressErrors: true,
    unique: true,
  });

  const filteredEntries = entries
    .filter((entry) => !entry.dirent.isSymbolicLink())
    .map<ScannedEntry>((entry) => {
      const relativePath = normalizeRelativePath(entry.path);

      return {
        relativePath,
        isDir: entry.dirent.isDirectory(),
        depth: getDepth(relativePath),
      };
    })
    .filter((entry) => entry.relativePath.length > 0 && entry.depth <= config.depth)
    .filter((entry) => {
      const candidate = entry.isDir ? `${entry.relativePath}/` : entry.relativePath;
      return !matcher.ignores(candidate);
    })
    .sort(compareScannedEntries);

  const nodeByPath = new Map<string, TreeNode>();
  nodeByPath.set(".", rootNode);

  for (const entry of filteredEntries) {
    ensureParentNodes(entry.relativePath, nodeByPath);

    const existingNode = nodeByPath.get(entry.relativePath);

    if (existingNode) {
      existingNode.isDir = entry.isDir;
      existingNode.depth = entry.depth;

      if (entry.isDir) {
        existingNode.children ??= [];
      }

      continue;
    }

    const node: TreeNode = {
      name: path.posix.basename(entry.relativePath),
      path: entry.relativePath,
      isDir: entry.isDir,
      depth: entry.depth,
      ...(entry.isDir ? { children: [] } : {}),
    };

    const parentPath = getParentPath(entry.relativePath);
    const parentNode = nodeByPath.get(parentPath);

    if (!parentNode) {
      throw new Error(`无法构建目录树，缺少父节点：${parentPath}`);
    }

    parentNode.children ??= [];
    parentNode.children.push(node);
    nodeByPath.set(entry.relativePath, node);
  }

  sortTree(rootNode.children ?? []);

  return [rootNode];
}

export function countTreeNodes(tree: TreeNode[]): TreeStats {
  let totalFiles = 0;
  let totalDirs = 0;

  const visit = (node: TreeNode): void => {
    if (node.isDir) {
      totalDirs += 1;
    } else {
      totalFiles += 1;
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  };

  for (const node of tree) {
    visit(node);
  }

  return { totalFiles, totalDirs };
}

async function readGitignoreRules(rootDir: string): Promise<string[]> {
  try {
    const content = await readFile(path.join(rootDir, ".gitignore"), "utf8");
    return content.split(/\r?\n/);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function resolveRootName(rootDir: string): Promise<string> {
  const fallbackName = path.basename(path.resolve(rootDir)) || rootDir;

  try {
    const raw = await readFile(path.join(rootDir, "package.json"), "utf8");
    const parsed = JSON.parse(stripBom(raw)) as { name?: unknown };

    return typeof parsed.name === "string" && parsed.name.trim().length > 0
      ? parsed.name.trim()
      : fallbackName;
  } catch {
    return fallbackName;
  }
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/\/$/, "");
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function getDepth(relativePath: string): number {
  return relativePath.split("/").length;
}

function compareScannedEntries(left: ScannedEntry, right: ScannedEntry): number {
  if (left.depth !== right.depth) {
    return left.depth - right.depth;
  }

  if (left.isDir !== right.isDir) {
    return left.isDir ? -1 : 1;
  }

  return left.relativePath.localeCompare(right.relativePath, undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function ensureParentNodes(
  relativePath: string,
  nodeByPath: Map<string, TreeNode>,
): void {
  const segments = relativePath.split("/");

  for (let index = 1; index < segments.length; index += 1) {
    const currentPath = segments.slice(0, index).join("/");

    if (nodeByPath.has(currentPath)) {
      continue;
    }

    const parentPath = index === 1 ? "." : segments.slice(0, index - 1).join("/");
    const parentNode = nodeByPath.get(parentPath);

    if (!parentNode) {
      throw new Error(`无法创建父目录节点：${parentPath}`);
    }

    const node: TreeNode = {
      name: segments[index - 1],
      path: currentPath,
      isDir: true,
      depth: index,
      children: [],
    };

    parentNode.children ??= [];
    parentNode.children.push(node);
    nodeByPath.set(currentPath, node);
  }
}

function getParentPath(relativePath: string): string {
  const segments = relativePath.split("/");

  return segments.length === 1 ? "." : segments.slice(0, -1).join("/");
}

function sortTree(nodes: TreeNode[]): void {
  nodes.sort((left, right) => {
    if (left.isDir !== right.isDir) {
      return left.isDir ? -1 : 1;
    }

    return left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
      numeric: true,
    });
  });

  for (const node of nodes) {
    if (node.children) {
      sortTree(node.children);
    }
  }
}
