import { execSync } from "child_process";

export async function runMigrate() {
  console.log("Running database migration / schema push...");
  try {
    execSync("bun x drizzle-kit push", { stdio: "inherit" });
    console.log("Migration completed.");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

if ((import.meta as any).main || (typeof require !== "undefined" && require.main === module)) {
  runMigrate();
}
