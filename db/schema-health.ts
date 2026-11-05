import { env } from "cloudflare:workers";

const requiredColumns: Record<string, string[]> = {
  organizations: ["id", "legal_name", "trade_name", "rfc", "status", "created_at", "updated_at"],
  documents: [
    "id", "organization_id", "title", "object_key", "status", "fiscal_type",
    "issue_date", "opinion_sense", "valid_until", "is_current", "deleted_at",
  ],
  fiscal_periods: ["id", "organization_id", "year", "month", "status"],
  users: ["id", "identity_subject", "email", "platform_role", "status"],
  messages: ["id", "organization_id", "subject", "body", "type", "created_at"],
};

async function tableColumns(table: string) {
  const result = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  return new Set(result.results.map((column) => column.name));
}

export async function getSchemaHealth() {
  const missing: string[] = [];

  for (const [table, columns] of Object.entries(requiredColumns)) {
    const existing = await tableColumns(table);
    if (!existing.size) {
      missing.push(`tabla ${table}`);
      continue;
    }
    for (const column of columns) {
      if (!existing.has(column)) missing.push(`${table}.${column}`);
    }
  }

  return { ready: missing.length === 0, missing };
}
