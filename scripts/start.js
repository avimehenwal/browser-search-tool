#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { existsSync } = require("fs");
const { spawn } = require("child_process");
const path = require("path");

const cwd = process.cwd();
const outDir = path.join(cwd, "out");

function run(cmd, args) {
  const isWin = process.platform === "win32";
  const proc = spawn(isWin ? `${cmd}.cmd` : cmd, args, {
    stdio: "inherit",
    shell: false,
  });
  proc.on("exit", (code) => process.exit(code));
}

if (existsSync(outDir)) {
  console.log(
    "Static export `out` found — serving with `npx serve@latest -s out -l 3000`.",
  );
  // Use npx to avoid adding an extra dependency; this will download serve if needed.
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  run(npx, ["serve@latest", "-s", "out", "-l", process.env.PORT || "3000"]);
} else {
  console.log("No `out` directory found — running `next start`.");
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  run(npx, ["next", "start"]);
}
