import { readFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_CONFIG_FILE = ".readstructrc";

export const DEFAULT_IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".cache",
  "coverage",
  "*.log",
  ".DS_Store",
  "Thumbs.db",
  ".env",
  ".env.*",
];

export interface ReadstructRcFile {
  ignore?: string[];
  depth?: number;
  emoji?: boolean;
  template?: string | null;
}

export interface CliOptions {
  dir?: string;
  output?: string;
  template?: string;
  depth?: number;
  dryRun?: boolean;
  emoji?: boolean;
}

export interface ReadstructConfig {
  rootDir: string;
  outputPath: string;
  templatePath: string | null;
  depth: number;
  dryRun: boolean;
  emoji: boolean;
  ignore: string[];
}

export async function loadConfig(
  cliOptions: CliOptions,
  cwd: string = process.cwd(),
): Promise<ReadstructConfig> {
  const rcPath = path.resolve(cwd, DEFAULT_CONFIG_FILE);
  const fileConfig = await readRcFile(rcPath);

  const depth = validateDepth(cliOptions.depth ?? fileConfig.depth ?? 3);
  const templateOption = cliOptions.template ?? fileConfig.template ?? null;

  return {
    rootDir: path.resolve(cwd, cliOptions.dir ?? "."),
    outputPath: path.resolve(cwd, cliOptions.output ?? "./README.md"),
    templatePath:
      templateOption === null ? null : path.resolve(cwd, templateOption),
    depth,
    dryRun: Boolean(cliOptions.dryRun),
    emoji: cliOptions.emoji ?? fileConfig.emoji ?? true,
    ignore: mergeIgnorePatterns(
      DEFAULT_IGNORE_PATTERNS,
      fileConfig.ignore ?? [],
    ),
  };
}

async function readRcFile(filePath: string): Promise<ReadstructRcFile> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(stripBom(raw)) as unknown;

    if (!isPlainObject(parsed)) {
      throw new Error(".readstructrc 必须是一个 JSON 对象。");
    }

    return validateRcFile(parsed);
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return {};
    }

    if (error instanceof SyntaxError) {
      throw new Error(`.readstructrc 不是合法的 JSON：${error.message}`);
    }

    throw error;
  }
}

function validateRcFile(value: Record<string, unknown>): ReadstructRcFile {
  const config: ReadstructRcFile = {};

  if (value.ignore !== undefined) {
    if (!Array.isArray(value.ignore) || value.ignore.some((item) => typeof item !== "string")) {
      throw new Error(".readstructrc 的 ignore 必须是字符串数组。");
    }

    config.ignore = value.ignore;
  }

  if (value.depth !== undefined) {
    config.depth = validateDepth(value.depth);
  }

  if (value.emoji !== undefined) {
    if (typeof value.emoji !== "boolean") {
      throw new Error(".readstructrc 的 emoji 必须是布尔值。");
    }

    config.emoji = value.emoji;
  }

  if (value.template !== undefined) {
    if (value.template !== null && typeof value.template !== "string") {
      throw new Error(".readstructrc 的 template 必须是字符串或 null。");
    }

    config.template = value.template;
  }

  return config;
}

function validateDepth(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error("depth 必须是大于等于 0 的整数。");
  }

  return value;
}

function mergeIgnorePatterns(...groups: string[][]): string[] {
  const merged = new Set<string>();

  for (const group of groups) {
    for (const pattern of group) {
      const normalized = pattern.trim();

      if (normalized.length > 0) {
        merged.add(normalized);
      }
    }
  }

  return [...merged];
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
