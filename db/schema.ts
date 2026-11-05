import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  legalName: text("legal_name").notNull(),
  tradeName: text("trade_name").notNull(),
  rfc: text("rfc"),
  rfcCiphertext: text("rfc_ciphertext"),
  status: text("status", { enum: ["active", "suspended", "archived"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("organizations_rfc_unique").on(table.rfc)]);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  identitySubject: text("identity_subject").notNull(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  platformRole: text("platform_role", { enum: ["client", "advisor", "admin"] }).notNull().default("client"),
  status: text("status", { enum: ["invited", "active", "suspended"] }).notNull().default("invited"),
  lastAccessAt: text("last_access_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("users_identity_subject_unique").on(table.identitySubject), uniqueIndex("users_email_unique").on(table.email)]);

export const memberships = sqliteTable("memberships", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["viewer", "manager", "advisor"] }).notNull().default("viewer"),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("memberships_org_user_unique").on(table.organizationId, table.userId)]);

export const fiscalPeriods = sqliteTable("fiscal_periods", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  status: text("status", { enum: ["draft", "review", "published", "locked"] }).notNull().default("draft"),
  publishedAt: text("published_at"),
  publishedBy: text("published_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("fiscal_periods_org_year_month_unique").on(table.organizationId, table.year, table.month)]);

export const monthlySnapshots = sqliteTable("monthly_snapshots", {
  id: text("id").primaryKey(),
  periodId: text("period_id").notNull().references(() => fiscalPeriods.id, { onDelete: "cascade" }),
  healthScore: integer("health_score").notNull().default(0),
  healthLabel: text("health_label").notNull(),
  incomeMonthCents: integer("income_month_cents").notNull().default(0),
  incomeYtdCents: integer("income_ytd_cents").notNull().default(0),
  deductionsMonthCents: integer("deductions_month_cents").notNull().default(0),
  deductionsYtdCents: integer("deductions_ytd_cents").notNull().default(0),
  vatTransferredCents: integer("vat_transferred_cents").notNull().default(0),
  vatCreditableCents: integer("vat_creditable_cents").notNull().default(0),
  vatWithheldCents: integer("vat_withheld_cents").notNull().default(0),
  issuedCfdiCount: integer("issued_cfdi_count").notNull().default(0),
  receivedCfdiCount: integer("received_cfdi_count").notNull().default(0),
  paymentDueDate: text("payment_due_date"),
  filingStatus: text("filing_status", { enum: ["determined", "filed", "paid"] }).notNull().default("determined"),
  estimatedResultCents: integer("estimated_result_cents").notNull().default(0),
  estimatedMarginBasisPoints: integer("estimated_margin_basis_points").notNull().default(0),
  executiveSummary: text("executive_summary").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("monthly_snapshots_period_unique").on(table.periodId)]);

export const taxSummaries = sqliteTable("tax_summaries", {
  id: text("id").primaryKey(),
  periodId: text("period_id").notNull().references(() => fiscalPeriods.id, { onDelete: "cascade" }),
  taxType: text("tax_type", { enum: ["ISR", "IVA", "IMSS", "INFONAVIT", "ISN", "OTHER"] }).notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  status: text("status", { enum: ["estimated", "determined", "filed", "paid"] }).notNull().default("estimated"),
  dueDate: text("due_date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const observations = sqliteTable("observations", {
  id: text("id").primaryKey(),
  periodId: text("period_id").notNull().references(() => fiscalPeriods.id, { onDelete: "cascade" }),
  severity: text("severity", { enum: ["info", "attention", "critical", "resolved"] }).notNull().default("info"),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  actionRequired: text("action_required"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  periodId: text("period_id").references(() => fiscalPeriods.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  category: text("category", { enum: ["report", "tax", "accounting", "legal", "other"] }).notNull().default("other"),
  fiscalType: text("fiscal_type", { enum: ["general", "csf", "opinion", "acuse"] }).notNull().default("general"),
  issueDate: text("issue_date"),
  opinionSense: text("opinion_sense", { enum: ["positive", "negative", "no_obligations", "registered_no_obligations"] }),
  validUntil: text("valid_until"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(true),
  replacesId: text("replaces_id"),
  sha256: text("sha256"),
  detectedRfc: text("detected_rfc"),
  rfcValidated: integer("rfc_validated", { mode: "boolean" }).notNull().default(false),
  manualConfirmed: integer("manual_confirmed", { mode: "boolean" }).notNull().default(false),
  deletedAt: text("deleted_at"),
  objectKey: text("object_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  publishedAt: text("published_at"),
  publishedBy: text("published_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("documents_object_key_unique").on(table.objectKey)]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadataJson: text("metadata_json"),
  ipHash: text("ip_hash"),
  createdAt: text("created_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  type: text("type", { enum: ["informative", "action", "urgent"] }).notNull().default("informative"),
  dueDate: text("due_date"),
  documentId: text("document_id").references(() => documents.id, { onDelete: "set null" }),
  readAt: text("read_at"),
  sentBy: text("sent_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});
