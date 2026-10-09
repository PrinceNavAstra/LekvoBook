import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";

const prisma = new PrismaClient();

const requiredTables = [
  "User", "Business", "BusinessUser", "Customer", "Supplier",
  "LedgerTransaction", "Invoice", "InvoiceItem", "Product", "Expense",
  "AuditLog", "OtpChallenge", "AuthSession", "ApplicationSetting",
  "NotificationProvider", "NotificationTemplate", "InventoryMovement",
  "Session", "Account", "Verification", "RateLimit",
];

function runPrisma(args) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, ["prisma", "migrate", ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`prisma migrate ${args.join(" ")} failed (exit ${result.status})`);
  }
}

try {
  const [migrationTable] = await prisma.$queryRaw`
    SELECT to_regclass('public._prisma_migrations') AS name
  `;

  if (migrationTable.name) {
    console.log("[migration-check] Prisma migration history exists; skipping baseline.");
  } else {
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    const present = new Set(tables.map((row) => row.table_name));
    const missing = requiredTables.filter((name) => !present.has(name));

    if (present.size === 0) {
      console.log("[migration-check] Empty database detected; normal migrations will create the schema.");
    } else {
      if (missing.length) {
        throw new Error(
          `Refusing to baseline a non-empty database: missing expected tables: ${missing.join(", ")}. No migration history was changed.`
        );
      }

      const userColumns = await prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'User'
      `;
      const columns = new Set(userColumns.map((row) => row.column_name));
      const requiredUserColumns = [
        "emailVerified", "image", "updatedAt", "emailVerifiedAt",
        "passwordHash", "preferredLanguage",
      ];
      const missingUserColumns = requiredUserColumns.filter((name) => !columns.has(name));
      if (missingUserColumns.length) {
        throw new Error(
          `Refusing to baseline: User is missing required columns: ${missingUserColumns.join(", ")}. No migration history was changed.`
        );
      }

      console.log("[migration-check] Existing schema verified. Recording migrations 0001-0003 as baseline.");
      runPrisma(["resolve", "--applied", "0001_init"]);
      runPrisma(["resolve", "--applied", "0002_inventory_movements"]);
      runPrisma(["resolve", "--applied", "0003_better_auth"]);
    }
  }
} finally {
  await prisma.$disconnect();
}
