import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const START_MARKER = "<!-- READSTRUCT:START -->";
export const END_MARKER = "<!-- READSTRUCT:END -->";

export interface InjectResult {
  outputPath: string;
  backupPath: string | null;
  beforeChars: number;
  afterChars: number;
  deltaChars: number;
  mode: "created" | "appended" | "replaced";
}

export async function injectIntoReadme(
  readmePath: string,
  content: string,
): Promise<InjectResult> {
  const normalizedContent = ensureTrailingNewline(content);
  await mkdir(path.dirname(readmePath), { recursive: true });

  let existingContent = "";
  let fileExists = true;

  try {
    existingContent = await readFile(readmePath, "utf8");
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      fileExists = false;
    } else {
      throw error;
    }
  }

  if (!fileExists) {
    await writeFile(readmePath, normalizedContent, "utf8");

    return {
      outputPath: readmePath,
      backupPath: null,
      beforeChars: 0,
      afterChars: normalizedContent.length,
      deltaChars: normalizedContent.length,
      mode: "created",
    };
  }

  const startIndex = existingContent.indexOf(START_MARKER);
  const endIndex =
    startIndex === -1
      ? existingContent.indexOf(END_MARKER)
      : existingContent.indexOf(END_MARKER, startIndex);

  let updatedContent = normalizedContent;
  let mode: InjectResult["mode"] = "appended";

  if (startIndex === -1 && endIndex === -1) {
    const separator = existingContent.length === 0
      ? ""
      : existingContent.endsWith("\n\n")
        ? ""
        : existingContent.endsWith("\n")
          ? "\n"
          : "\n\n";

    updatedContent = `${existingContent}${separator}${normalizedContent}`;
    mode = "appended";
  } else if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      "README 中的 READSTRUCT 标记不完整或顺序错误，请同时保留 START 和 END 注释。",
    );
  } else {
    const afterEnd = endIndex + END_MARKER.length;
    updatedContent =
      `${existingContent.slice(0, startIndex)}${normalizedContent}${existingContent.slice(afterEnd)}`;
    mode = "replaced";
  }

  const backupPath = `${readmePath}.bak`;
  await writeFile(backupPath, existingContent, "utf8");
  await writeFile(readmePath, updatedContent, "utf8");

  return {
    outputPath: readmePath,
    backupPath,
    beforeChars: existingContent.length,
    afterChars: updatedContent.length,
    deltaChars: updatedContent.length - existingContent.length,
    mode,
  };
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
