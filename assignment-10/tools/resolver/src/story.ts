// In-memory inkjs compile: the emitted ink file map -> a compiled Story.
// Feeds the file map to the Compiler through a file handler, so no disk
// round-trip is needed. Used by the CLI's `build --emit-story` and by the
// compile-proof tests. inkjs is a runtime dependency of this package.

import { Compiler, CompilerOptions } from "inkjs/full";
import type { Story } from "inkjs/full";
import type { InkFiles } from "./ink.ts";

export interface CompileResult {
  story: Story | null;
  errors: string[];
  warnings: string[];
}

export function compileInkFiles(files: InkFiles, entry = "main.ink"): CompileResult {
  const main = files.get(entry);
  if (!main) throw new Error(`compileInkFiles: no ${entry} in the emitted set`);

  const errors: string[] = [];
  const warnings: string[] = [];

  const fileHandler = {
    ResolveInkFilename: (filename: string): string => filename,
    LoadInkFileContents: (filename: string): string => {
      const content = files.get(filename);
      if (content === undefined) {
        throw new Error(`INCLUDE not found in emitted set: ${filename}`);
      }
      return content;
    },
  };

  // ErrorType: 0 Author, 1 Warning, 2 Error
  const errorHandler = (message: string, errorType: number): void => {
    if (errorType === 2) errors.push(message);
    else warnings.push(message);
  };

  const options = new CompilerOptions(entry, [], false, errorHandler, fileHandler);
  let story: Story | null = null;
  try {
    story = new Compiler(main, options).Compile();
  } catch (e) {
    if (errors.length === 0) errors.push(String(e));
  }
  if (story) {
    // The canned build runs on the ink-side no-op fallback stubs; the host
    // binds the EXTERNAL functions for real. inkjs needs the opt-in flag.
    story.allowExternalFunctionFallbacks = true;
  }
  return { story, errors, warnings };
}

/**
 * Compile the emitted ink and return the serialized story JSON string
 * (inkjs Story.ToJson()), ready to write to story.json for play. Throws on
 * a compile error, listing every error — a story.json is only written when
 * the whole project compiles.
 */
export function emitStoryJson(files: InkFiles, entry = "main.ink"): string {
  const { story, errors } = compileInkFiles(files, entry);
  if (!story || errors.length > 0) {
    throw new Error(`ink compile failed:\n${errors.join("\n")}`);
  }
  return story.ToJson() ?? "";
}
