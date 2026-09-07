import { execFileSync } from "node:child_process";

const CONFIG = "platform-worker/wrangler.jsonc";
const DATABASE = "ica-saas-db";
const MIGRATION = "platform-worker/migrations/0002_ica_platform.sql";

function run(command, args) {
  execFileSync(command, args, {
    stdio: "inherit",
  });
}

console.log("ICA Master: applying central platform schema...");
run("npx", [
  "wrangler@4.129.1",
  "d1",
  "execute",
  DATABASE,
  "--remote",
  "--file",
  MIGRATION,
  "--yes",
]);

console.log("ICA Master: deploying platform Worker...");
run("npx", [
  "wrangler@4.129.1",
  "deploy",
  "--config",
  CONFIG,
]);

console.log("");
console.log("ICA Master platform backend deployed.");
console.log("Turnstile secret still must be set with:");
console.log(
  "npx wrangler@4.129.1 secret put TURNSTILE_SECRET_KEY --config platform-worker/wrangler.jsonc"
);
