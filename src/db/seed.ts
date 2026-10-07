import { db, client } from "./index";
import {
  roles,
  permissions,
  rolePermissions,
  categories,
  units,
  customers,
} from "./schema";
import { ALL_PERMISSIONS, ROLE_DEFINITIONS } from "../lib/permissions";
import { eq } from "drizzle-orm";

export async function runSeed() {
  console.log("Starting database seed...");

  // 1. Create invoice sequence if not exists
  await client`CREATE SEQUENCE IF NOT EXISTS invoice_no_seq START WITH 1 INCREMENT BY 1;`;

  // 2. Seed Permissions
  console.log("Seeding permissions...");
  for (const perm of ALL_PERMISSIONS) {
    const existing = await db.query.permissions.findFirst({
      where: eq(permissions.key, perm.key),
    });
    if (!existing) {
      await db.insert(permissions).values({
        key: perm.key,
      });
    }
  }

  const allPermRows = await db.query.permissions.findMany();
  const permMap = new Map(allPermRows.map((p) => [p.key, p.id]));

  // 3. Seed Roles & Role Permissions
  console.log("Seeding roles and role-permissions...");
  for (const [key, roleDef] of Object.entries(ROLE_DEFINITIONS)) {
    let roleRow = await db.query.roles.findFirst({
      where: eq(roles.key, key),
    });

    if (!roleRow) {
      const [inserted] = await db
        .insert(roles)
        .values({
          key,
          name: roleDef.name,
          isSystem: roleDef.isSystem,
        })
        .returning();
      roleRow = inserted;
    }

    // Attach permissions
    for (const permKey of roleDef.permissions) {
      const permId = permMap.get(permKey);
      if (permId) {
        await client`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES (${roleRow.id}, ${permId})
          ON CONFLICT DO NOTHING;
        `;
      }
    }
  }

  // 4. Default Units
  console.log("Seeding default units...");
  const defaultUnits = [
    { name: "Pieces", shortName: "pcs" },
    { name: "Kilogram", shortName: "kg" },
    { name: "Box", shortName: "box" },
    { name: "Litre", shortName: "L" },
    { name: "Meter", shortName: "m" },
  ];

  for (const u of defaultUnits) {
    const existing = await db.query.units.findFirst({
      where: eq(units.name, u.name),
    });
    if (!existing) {
      await db.insert(units).values(u);
    }
  }

  // 5. Default Category
  console.log("Seeding default category...");
  const defaultCategory = "General";
  const existingCat = await db.query.categories.findFirst({
    where: eq(categories.name, defaultCategory),
  });
  if (!existingCat) {
    await db.insert(categories).values({ name: defaultCategory });
  }

  // 6. Walk-in Customer
  console.log("Seeding walk-in customer...");
  const existingWalkIn = await db.query.customers.findFirst({
    where: eq(customers.isWalkIn, true),
  });
  if (!existingWalkIn) {
    await db.insert(customers).values({
      name: "Walk-in Customer",
      isWalkIn: true,
      isActive: true,
      notes: "Default customer record for cash and direct retail transactions.",
    });
  }

  console.log("Seed completed successfully!");
}

if ((import.meta as any).main || (typeof require !== "undefined" && require.main === module)) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
