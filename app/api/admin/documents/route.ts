import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditEvents, documents, fiscalPeriods, organizations } from "@/db/schema";
import { requireAdmin } from "@/lib/portal-auth";
import { acceptedDocumentTypes, getPrivateBucket, MAX_DOCUMENT_BYTES } from "@/lib/private-files";

const categories = ["report", "tax", "accounting", "legal", "other"] as const;

function forbidden() {
  return NextResponse.json({ message: "Acceso reservado al equipo de Vision Advisors." }, { status: 403 });
}

export async function GET(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const db = getDb();
  const rows = await db.select({
    id: documents.id,
    organizationId: documents.organizationId,
    organizationName: organizations.tradeName,
    periodId: documents.periodId,
    periodYear: fiscalPeriods.year,
    periodMonth: fiscalPeriods.month,
    title: documents.title,
    category: documents.category,
    mimeType: documents.mimeType,
    sizeBytes: documents.sizeBytes,
    status: documents.status,
    publishedAt: documents.publishedAt,
    createdAt: documents.createdAt,
  }).from(documents)
    .innerJoin(organizations, eq(organizations.id, documents.organizationId))
    .leftJoin(fiscalPeriods, eq(fiscalPeriods.id, documents.periodId))
    .where(organizationId ? eq(documents.organizationId, organizationId) : undefined)
    .orderBy(desc(documents.createdAt));
  return NextResponse.json({ documents: rows });
}

export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();
  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "").trim();
  const organizationId = String(form.get("organizationId") || "").trim();
  const periodId = String(form.get("periodId") || "").trim() || null;
  const category = String(form.get("category") || "other") as typeof categories[number];
  if (!(file instanceof File) || !title || !organizationId || !categories.includes(category)) {
    return NextResponse.json({ message: "Seleccione empresa, título, categoría y archivo válidos." }, { status: 400 });
  }
  const extension = acceptedDocumentTypes.get(file.type);
  if (!extension) return NextResponse.json({ message: "Formato no permitido. Use PDF, Excel, Word o CSV." }, { status: 415 });
  if (!file.size || file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ message: "El archivo debe pesar entre 1 byte y 15 MB." }, { status: 413 });

  const db = getDb();
  const [[organization], [period]] = await Promise.all([
    db.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, organizationId), ne(organizations.status, "archived"))).limit(1),
    periodId ? db.select({ id: fiscalPeriods.id, organizationId: fiscalPeriods.organizationId }).from(fiscalPeriods).where(eq(fiscalPeriods.id, periodId)).limit(1) : Promise.resolve([]),
  ]);
  if (!organization || (periodId && (!period || period.organizationId !== organizationId))) {
    return NextResponse.json({ message: "La empresa o el periodo seleccionado no son válidos." }, { status: 400 });
  }

  const id = `doc_${crypto.randomUUID()}`;
  const objectKey = `documents/${organizationId}/${crypto.randomUUID()}.${extension}`;
  const now = new Date().toISOString();
  const bucket = getPrivateBucket();
  await bucket.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { documentId: id } });
  try {
    await db.batch([
      db.insert(documents).values({ id, organizationId, periodId, title, category, objectKey, mimeType: file.type, sizeBytes: file.size, status: "draft", uploadedBy: actor.id, createdAt: now }),
      db.insert(auditEvents).values({ id: `aud_${crypto.randomUUID()}`, actorUserId: actor.id, organizationId, action: "document.uploaded", entityType: "document", entityId: id, metadataJson: JSON.stringify({ title, category, periodId, sizeBytes: file.size }), createdAt: now }),
    ]);
  } catch (error) {
    await bucket.delete(objectKey);
    throw error;
  }
  return NextResponse.json({ message: "Documento cargado como borrador.", id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();
  const body = (await request.json()) as { id?: string; status?: "draft" | "published" };
  if (!body.id || !["draft", "published"].includes(body.status ?? "")) return NextResponse.json({ message: "Solicitud inválida." }, { status: 400 });
  const db = getDb();
  const [document] = await db.select({ id: documents.id, organizationId: documents.organizationId, periodId: documents.periodId }).from(documents).where(eq(documents.id, body.id)).limit(1);
  if (!document) return NextResponse.json({ message: "El documento ya no existe." }, { status: 404 });
  if (body.status === "published" && document.periodId) {
    const [period] = await db.select({ status: fiscalPeriods.status }).from(fiscalPeriods).where(and(eq(fiscalPeriods.id, document.periodId), inArray(fiscalPeriods.status, ["published", "locked"]))).limit(1);
    if (!period) return NextResponse.json({ message: "Publique primero el periodo vinculado a este documento." }, { status: 409 });
  }
  const now = new Date().toISOString();
  await db.batch([
    db.update(documents).set({ status: body.status, publishedAt: body.status === "published" ? now : null, publishedBy: body.status === "published" ? actor.id : null }).where(eq(documents.id, document.id)),
    db.insert(auditEvents).values({ id: `aud_${crypto.randomUUID()}`, actorUserId: actor.id, organizationId: document.organizationId, action: body.status === "published" ? "document.published" : "document.unpublished", entityType: "document", entityId: document.id, createdAt: now }),
  ]);
  return NextResponse.json({ message: body.status === "published" ? "Documento publicado al cliente." : "Documento retirado del portal y conservado como borrador." });
}

export async function DELETE(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Documento no indicado." }, { status: 400 });
  const db = getDb();
  const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!document) return NextResponse.json({ message: "El documento ya no existe." }, { status: 404 });
  await getPrivateBucket().delete(document.objectKey);
  const now = new Date().toISOString();
  await db.batch([
    db.delete(documents).where(eq(documents.id, id)),
    db.insert(auditEvents).values({ id: `aud_${crypto.randomUUID()}`, actorUserId: actor.id, organizationId: document.organizationId, action: "document.deleted", entityType: "document", entityId: id, metadataJson: JSON.stringify({ title: document.title }), createdAt: now }),
  ]);
  return NextResponse.json({ message: "Documento eliminado definitivamente." });
}
