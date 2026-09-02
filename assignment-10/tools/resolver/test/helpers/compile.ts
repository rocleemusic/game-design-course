// The compile helper now lives in src/story.ts (it is used by the CLI's
// --emit-story as well as the tests). Re-exported here so existing test
// imports keep working.

export { compileInkFiles, emitStoryJson } from "../../src/story.ts";
export type { CompileResult } from "../../src/story.ts";
