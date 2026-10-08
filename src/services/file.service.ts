import { db, client } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";

let tableChecked = false;

export async function ensureFilesTable() {
  if (tableChecked) return;
  try {
    await client`
      CREATE TABLE IF NOT EXISTS files (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        mime_type text NOT NULL,
        size integer NOT NULL,
        data bytea NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `;
    // Create view alias 'file' if not already exists so both 'file' and 'files' queries work
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'file') THEN
          CREATE VIEW file AS SELECT * FROM files;
        END IF;
      END $$;
    `;
    tableChecked = true;
  } catch (err) {
    console.warn("Could not check/create files table:", err);
  }
}

export async function saveFile({
  name,
  mimeType,
  size,
  data,
}: {
  name: string;
  mimeType: string;
  size: number;
  data: Buffer;
}) {
  await ensureFilesTable();
  const [record] = await db
    .insert(files)
    .values({
      name,
      mimeType,
      size,
      data,
    })
    .returning();
  return record;
}

export async function getFile(id: string) {
  await ensureFilesTable();
  const record = await db.query.files.findFirst({
    where: eq(files.id, id),
  });
  return record || null;
}
