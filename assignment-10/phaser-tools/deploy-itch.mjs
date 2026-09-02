/**
 * Push a fresh build to itch.io with butler.
 *
 * One command, every time: rebuilds `dist/` from the current content and run
 * folder, then `butler push`s it to the same channel, so the live itch.io
 * page always reflects this repo's current mode 5 build.
 *
 * Reads the push target from `itch.config.json` (gitignored — it's a
 * per-machine/per-project pointer, not content) rather than hardcoding it,
 * so this script never needs editing once that file exists:
 *   { "target": "your-itch-username/your-game-slug" }
 *
 * Requires `butler login` to have been run once already — that step opens a
 * browser to authorize and cannot be scripted.
 *
 * Run: npm run deploy:itch
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = path.join(root, "itch.config.json");
const CHANNEL = "html5";
// `npm run deploy:itch` downloaded butler here rather than onto PATH, so it
// works with no machine-wide setup. Falls back to PATH if someone installed
// it themselves instead.
const LOCAL_BUTLER = path.join(root, "tools", "bin", "butler.exe");
const BUTLER = fs.existsSync(LOCAL_BUTLER) ? `"${LOCAL_BUTLER}"` : "butler";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

function main() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(
      [
        "No itch.config.json found.",
        "",
        "Create one at phaser/itch.config.json:",
        '  { "target": "your-itch-username/your-game-slug" }',
        "",
        "The slug is whatever you set when creating the project page on itch.io",
        "(New Project -> URL). This file is gitignored on purpose — it's a",
        "per-project pointer, not something to commit.",
      ].join("\n"),
    );
    process.exit(1);
  }

  const { target } = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  if (!target || !target.includes("/")) {
    console.error(`itch.config.json's "target" must look like "username/game-slug", got: ${JSON.stringify(target)}`);
    process.exit(1);
  }

  try {
    execSync(`${BUTLER} version`, { cwd: root, stdio: "ignore" });
  } catch {
    console.error("butler not found. Install it first: https://itch.io/docs/butler/installing.html");
    process.exit(1);
  }

  run("npm run build:itch");
  run(`${BUTLER} push dist ${target}:${CHANNEL}`);
  console.log(`\nPushed to ${target}:${CHANNEL}. Check the build at https://${target.split("/")[0]}.itch.io/${target.split("/")[1]}`);
}

main();
