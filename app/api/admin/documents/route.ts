import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditEvents, documents, fiscalPeriods, organizations } from "@/db/schema";
import { requireAdmin } from "@/lib/portal-auth";
import { acceptedDocumentTypes, getPrivateBucket, MAX_DOCUMENT_BYTES } from "@/lib/private-files";

const categories = ["report", "tax", "accounting", "legal", "other"] as const;
const fiscalTypes = ["general", "csf", "opinion", "acuse"] as const;
const opinionSenses = ["positive", "negative", "no_obligations", "registered_no_obligations"] as const;
const MAX_FISCAL_BYTES = 5 * 1024 * 1024;

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
    fiscalType: documents.fiscalType,
    issueDate: documents.issueDate,
    opinionSense: documents.opinionSense,
    validUntil: documents.validUntil,
    isCurrent: documents.isCurrent,
    rfcValidated: documents.rfcValidated,
    mimeType: documents.mimeType,
    sizeBytes: documents.sizeBytes,
    status: documents.status,
    publishedAt: documents.publishedAt,
    createdAt: documents.createdAt,
  }).from(documents)
    .innerJoin(organizations, eq(organizations.id, documents.organizationId))
    .leftJoin(fiscalPeriods, eq(fiscalPeriods.id, documents.periodId))
    .where(organizationId ? and(eq(documents.organizationId, organizationId), isNull(documents.deletedAt)) : isNull(documents.deletedAt))
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
  const fiscalType = String(form.get("fiscalType") || "general") as typeof fiscalTypes[number];
  const issueDate = String(form.get("issueDate") || "").trim() || null;
  const opinionSense = String(form.get("opinionSense") || "").trim() || null;
  const manualConfirmed = form.get("manualConfirmed") === "on";
  if (!(file instanceof File) || !title || !organizationId || !categories.includes(category) || !fiscalTypes.includes(fiscalType)) {
    return NextResponse.json({ message: "Seleccione empresa, título, categoría y archivo válidos." }, { status: 400 });
  }
  const extension = acceptedDocumentTypes.get(file.type);
  if (!extension) return NextResponse.json({ message: "Formato no permitido. Use PDF, Excel, Word o CSV." }, { status: 415 });
  if (!file.size || file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ message: "El archivo debe pesar entre 1 byte y 15 MB." }, { status: 413 });
  const specialized = fiscalType === "csf" || fiscalType === "opinion";
  if (specialized && (file.type !== "application/pdf" || file.size > MAX_FISCAL_BYTES || !issueDate || (fiscalType === "opinion" && !opinionSenses.includes(opinionSense as typeof opinionSenses[number])))) {
    return NextResponse.json({ message: "CSF y opinión requieren PDF menor a 5 MB, fecha de emisión y sentido cuando corresponda." }, { status: 400 });
  }

  const db = getDb();
  const [[organization], [period]] = await Promise.all([
    db.select({ id: organizations.id, rfc: organizations.rfc }).from(organizations).where(and(eq(organizations.id, organizationId), ne(organizations.status, "archived"))).limit(1),
    periodId ? db.select({ id: fiscalPeriods.id, organizationId: fiscalPeriods.organizationId }).from(fiscalPeriods).where(eq(fiscalPeriods.id, periodId)).limit(1) : Promise.resolve([]),
  ]);
  if (!organization || (periodId && (!period || period.organizationId !== organizationId))) {
    return NextResponse.json({ message: "La empresa o el periodo seleccionado no son válidos." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  let sha256: string | null = null;
  let detectedRfc: string | null = null;
  let rfcValidated = false;
  let validUntil: string | null = null;
  if (specialized) {
    if (!organization.rfc) return NextResponse.json({ message: "Capture primero el RFC de la empresa para validar el documento." }, { status: 409 });
    const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5));
    if (signature !== "%PDF-") return NextResponse.json({ message: "El archivo no es un PDF real." }, { status: 415 });
    const issued = new Date(`${issueDate}T00:00:00Z`);
    const ageDays = Math.floor((Date.now() - issued.getTime()) / 86_400_000);
    if (!Number.isFinite(issued.getTime()) || ageDays < 0 || ageDays > 60) return NextResponse.json({ message: "La fecha de emisión no puede ser futura ni anterior a 60 días." }, { status: 400 });
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    sha256 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
    const [duplicate] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.organizationId, organizationId), eq(documents.sha256, sha256), isNull(documents.deletedAt))).limit(1);
    if (duplicate) return NextResponse.json({ message: "Este archivo ya está cargado para la empresa." }, { status: 409 });
    const pdfText = new TextDecoder("latin1").decode(bytes).toUpperCase();
    const extracted = pdfText.match(/[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}/g) || [];
    detectedRfc = extracted[0] || null;
    if (detectedRfc && detectedRfc !== organization.rfc) return NextResponse.json({ message: `Este PDF pertenece al RFC ${detectedRfc}, no a ${organization.rfc}.` }, { status: 400 });
    if (!detectedRfc && !manualConfirmed) return NextResponse.json({ message: "No fue posible leer el RFC del PDF. Marque la confirmación manual para continuar." }, { status: 422 });
    rfcValidated = detectedRfc === organization.rfc;
    if (fiscalType === "opinion") {
      const detectedSense = pdfText.includes("NEGATIVO") ? "negative" : pdfText.includes("POSITIVO") ? "positive" : null;
      if (detectedSense && detectedSense !== opinionSense) return NextResponse.json({ message: `El PDF parece indicar sentido ${detectedSense === "positive" ? "positivo" : "negativo"}, distinto al capturado.` }, { status: 400 });
      const expiry = new Date(issued); expiry.setUTCDate(expiry.getUTCDate() + 30); validUntil = expiry.toISOString().slice(0, 10);
    }
  }

  const id = `doc_${crypto.randomUUID()}`;
  const objectKey = specialized ? `${organization.rfc}/${fiscalType}/${issueDate}-${Date.now()}.${extension}` : `documents/${organizationId}/${crypto.randomUUID()}.${extension}`;
  const now = new Date().toISOString();
  const bucket = getPrivateBucket();
  await bucket.put(objectKey, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { documentId: id } });
  try {
    const [previous] = specialized ? await db.select({ id: documents.id }).from(documents).where(and(eq(documents.organizationId, organizationId), eq(documents.fiscalType, fiscalType), eq(documents.isCurrent, true), isNull(documents.deletedAt))).orderBy(desc(documents.createdAt)).limit(1) : [];
    await db.batch([
      db.update(documents).set({ isCurrent: false }).where(specialized ? and(eq(documents.organizationId, organizationId), eq(documents.fiscalType, fiscalType), eq(documents.isCurrent, true), isNull(documents.deletedAt)) : eq(documents.id, "__none__")),
      db.insert(documents).values({ id, organizationId, periodId, title, category, fiscalType, issueDate, opinionSense: opinionSense as typeof opinionSenses[number] | null, validUntil, isCurrent: true, replacesId: previous?.id || null, sha256, detectedRfc, rfcValidated, manualConfirmed, objectKey, mimeType: file.type, sizeBytes: file.size, status: "draft", uploadedBy: actor.id, createdAt: now }),
      db.insert(auditEvents).values({ id: `aud_${crypto.randomUUID()}`, actorUserId: actor.id, organizationId, action: "document.uploaded", entityType: "document", entityId: id, metadataJson: JSON.stringify({ title, category, fiscalType, periodId, sizeBytes: file.size, detectedRfc, rfcValidated, manualConfirmed }), createdAt: now }),
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
  const body = (await request.json()) as { id?: string; status?: "draft" | "published"; periodId?: string | null };
  const updatesStatus = body.status !== undefined;
  const updatesPeriod = Object.prototype.hasOwnProperty.call(body, "periodId");
  if (!body.id || (!updatesStatus && !updatesPeriod) || (updatesStatus && !["draft", "published"].includes(body.status ?? ""))) {
    return NextResponse.json({ message: "Solicitud inválida." }, { status: 400 });
  }
  const db = getDb();
  const [document] = await db.select({ id: documents.id, organizationId: documents.organizationId, periodId: documents.periodId }).from(documents).where(eq(documents.id, body.id)).limit(1);
  if (!document) return NextResponse.json({ message: "El documento ya no existe." }, { status: 404 });
  const nextPeriodId = updatesPeriod ? (body.periodId?.trim() || null) : document.periodId;
  if (nextPeriodId) {
    const [targetPeriod] = await db.select({ organizationId: fiscalPeriods.organizationId }).from(fiscalPeriods).where(eq(fiscalPeriods.id, nextPeriodId)).limit(1);
    if (!targetPeriod || targetPeriod.organizationId !== document.organizationId) {
      return NextResponse.json({ message: "El periodo seleccionado no pertenece a la empresa del documento." }, { status: 400 });
    }
  }
  const nextStatus = updatesStatus ? body.status! : undefined;
  if (nextStatus === "published" && nextPeriodId) {
    const [period] = await db.select({ status: fiscalPeriods.status }).from(fiscalPeriods).where(and(eq(fiscalPeriods.id, nextPeriodId), inArray(fiscalPeriods.status, ["published", "locked"]))).limit(1);
    if (!period) return NextResponse.json({ message: "Publique primero el periodo vinculado a este documento." }, { status: 409 });
  }
  const now = new Date().toISOString();
  const updateValues = updatesStatus
    ? { periodId: nextPeriodId, status: nextStatus, publishedAt: nextStatus === "published" ? now : null, publishedBy: nextStatus === "published" ? actor.id : null }
    : { periodId: nextPeriodId };
  await db.batch([
    db.update(documents).set(updateValues).where(eq(documents.id, document.id)),
    db.insert(auditEvents).values({ id: `aud_${crypto.randomUUID()}`, actorUserId: actor.id, organizationId: document.organizationId, action: updatesStatus ? (nextStatus === "published" ? "document.published" : "document.unpublished") : "document.period.updated", entityType: "document", entityId: document.id, metadataJson: JSON.stringify({ periodId: nextPeriodId }), createdAt: now }),
  ]);
  return NextResponse.json({ message: updatesStatus ? (nextStatus === "published" ? "Documento publicado al cliente." : "Documento retirado del portal y conservado como borrador.") : "Periodo del documento actualizado." });
}

export async function DELETE(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Documento no indicado." }, { status: 400 });
  const db = getDb();
  const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!document) return NextResponse.json({ message: "El documento ya no existe." }, { status: 404 });
  const now = new Date().toISOString();
  await db.batch([
    db.update(documents).set({ deletedAt: now, status: "draft", isCurrent: false }).where(eq(documents.id, id)),
    db.update(documents).set({ isCurrent: true }).where(eq(documents.id, document.replacesId || "__none__")),
    db.insert(auditEvents).values({ id: `aud_${crypto.randomUUID()}`, actorUserId: actor.id, organizationId: document.organizationId, action: "document.deleted", entityType: "document", entityId: id, metadataJson: JSON.stringify({ title: document.title, softDelete: true }), createdAt: now }),
  ]);
  return NextResponse.json({ message: "Documento retirado y conservado en la bitácora." });
}
