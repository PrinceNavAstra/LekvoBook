import { spawnSync } from "node:child_process";

const maxAttempts = 5;
const delaysMs = [5000, 10000, 20000, 30000];

function runMigration() {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawnSync(command, ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: process.env,
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(`[prisma-migrate] Attempt ${attempt}/${maxAttempts}`);
  const result = runMigration();

  if (result.error) throw result.error;
  if (result.status === 0) {
    console.log("[prisma-migrate] Migrations completed successfully.");
    process.exit(0);
  }

  // Only retry Prisma's migration-lock timeout. Never disable the lock or
  // retry unrelated migration/schema failures.
  if (attempt === maxAttempts) {
    console.error("[prisma-migrate] Failed after retries. Check for another deployment or migration using the same database.");
    process.exit(result.status ?? 1);
  }

  const waitMs = delaysMs[attempt - 1] ?? 30000;
  console.warn(`[prisma-migrate] Migration command failed. Waiting ${waitMs / 1000}s before retry.`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}
