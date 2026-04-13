#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { Command } from "commander";

import { loadConfig, type CliOptions } from "./config";
import { injectIntoReadme } from "./injector";
import { renderStructure } from "./renderer";
import { countTreeNodes, scanDirectory } from "./scanner";

interface GenerateCommandOptions {
  dir?: string;
  output?: string;
  template?: string;
  depth?: number;
  dryRun?: boolean;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = new Command();

  program
    .name("readstruct")
    .description("Auto-generate file structure section for your README")
    .version(getPackageVersion())
    .showHelpAfterError();

  program
    .command("generate")
    .alias("gen")
    .description("扫描目录并把生成结果写入 README")
    .option("-d, --dir <path>", '要扫描的目录，默认当前目录 "."')
    .option("-o, --output <path>", 'README 文件路径，默认 "./README.md"')
    .option("-t, --template <path>", "自定义 Handlebars 模板路径")
    .option("--depth <number>", "最大扫描深度，默认 3", parseDepth)
    .option("--dry-run", "只打印结果，不写入文件")
    .option("--no-emoji", "不在输出里加文件/文件夹 emoji")
    .action(async (options: GenerateCommandOptions) => {
      const cliOptions = getCliOptions(options, argv);
      const config = await loadConfig(cliOptions);
      const tree = await scanDirectory(config);
      const stats = countTreeNodes(tree);
      const markdown = await renderStructure(tree, {
        rootDir: config.rootDir,
        templatePath: config.templatePath,
        emoji: config.emoji,
        totalFiles: stats.totalFiles,
        totalDirs: stats.totalDirs,
      });

      if (config.dryRun) {
        process.stdout.write(markdown);
        console.error(
          `Dry run 完成：${stats.totalDirs} 个文件夹，${stats.totalFiles} 个文件。`,
        );
        return;
      }

      const injectResult = await injectIntoReadme(config.outputPath, markdown);

      console.log(`已更新 README：${injectResult.outputPath}`);

      if (injectResult.backupPath) {
        console.log(`备份文件：${injectResult.backupPath}`);
      }

      console.log(
        `字符数变化：${injectResult.beforeChars} -> ${injectResult.afterChars} (${formatDelta(
          injectResult.deltaChars,
        )})`,
      );
      console.log(`扫描结果：${stats.totalDirs} 个文件夹，${stats.totalFiles} 个文件。`);
    });

  if (argv.slice(2).length === 0) {
    program.outputHelp();
    return;
  }

  await program.parseAsync(argv);
}

function getCliOptions(
  options: GenerateCommandOptions,
  argv: string[],
): CliOptions {
  return {
    dir: options.dir,
    output: options.output,
    template: options.template,
    depth: options.depth,
    dryRun: Boolean(options.dryRun),
    emoji: argv.includes("--no-emoji") ? false : undefined,
  };
}

function parseDepth(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("--depth 必须是大于等于 0 的整数。");
  }

  return parsed;
}

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function getPackageVersion(): string {
  try {
    const packageJsonPath = path.resolve(__dirname, "..", "package.json");
    const packageJson = JSON.parse(
      readFileSync(packageJsonPath, "utf8"),
    ) as { version?: unknown };

    return typeof packageJson.version === "string"
      ? packageJson.version
      : "0.1.0";
  } catch {
    return "0.1.0";
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
