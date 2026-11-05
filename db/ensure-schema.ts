const REQUIRED_SCHEMA_VERSION = 4;

let schemaReady: Promise<void> | null = null;

type ColumnDefinition = {
  table: "documents" | "organizations";
  name: string;
  definition: string;
};

const requiredColumns: ColumnDefinition[] = [
  { table: "documents", name: "fiscal_type", definition: "TEXT NOT NULL DEFAULT 'general'" },
  { table: "documents", name: "issue_date", definition: "TEXT" },
  { table: "documents", name: "opinion_sense", definition: "TEXT" },
  { table: "documents", name: "valid_until", definition: "TEXT" },
  { table: "documents", name: "is_current", definition: "INTEGER NOT NULL DEFAULT 1" },
  { table: "documents", name: "replaces_id", definition: "TEXT" },
  { table: "documents", name: "sha256", definition: "TEXT" },
  { table: "documents", name: "detected_rfc", definition: "TEXT" },
  { table: "documents", name: "rfc_validated", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "documents", name: "manual_confirmed", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "documents", name: "deleted_at", definition: "TEXT" },
  { table: "organizations", name: "rfc", definition: "TEXT" },
];

async function columnNames(db: D1Database, table: string) {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  return new Set(result.results.map((column) => column.name));
}

async function addMissingColumn(db: D1Database, column: ColumnDefinition, existing: Set<string>) {
  if (existing.has(column.name)) return;

  try {
    await db.exec(`ALTER TABLE ${column.table} ADD COLUMN ${column.name} ${column.definition}`);
  } catch (error) {
    // Two fresh isolates can detect the same missing column simultaneously.
    // Re-read the table before treating the migration as failed.
    const refreshed = await columnNames(db, column.table);
    if (!refreshed.has(column.name)) throw error;
  }
  existing.add(column.name);
}

async function migrate(db: D1Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS portal_schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const current = await db
    .prepare("SELECT COALESCE(MAX(version), 0) AS version FROM portal_schema_migrations")
    .first<{ version: number }>();
  if (Number(current?.version || 0) >= REQUIRED_SCHEMA_VERSION) return;

  const documentColumns = await columnNames(db, "documents");
  const organizationColumns = await columnNames(db, "organizations");

  for (const column of requiredColumns) {
    await addMissingColumn(
      db,
      column,
      column.table === "documents" ? documentColumns : organizationColumns,
    );
  }

  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS organizations_rfc_unique ON organizations (rfc)");
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      organization_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'informative',
      due_date TEXT,
      document_id TEXT,
      read_at TEXT,
      sent_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
      FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await db
    .prepare("INSERT OR IGNORE INTO portal_schema_migrations (version, applied_at) VALUES (?, ?)")
    .bind(REQUIRED_SCHEMA_VERSION, new Date().toISOString())
    .run();
}

/**
 * Ensures production D1 is compatible with the deployed Worker before any
 * route can query newly introduced columns. The promise is cached per isolate.
 */
export function ensureDatabaseSchema(db: D1Database) {
  schemaReady ??= migrate(db).catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}
