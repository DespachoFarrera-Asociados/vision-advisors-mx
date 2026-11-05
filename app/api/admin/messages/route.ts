import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditEvents, documents, messages, organizations } from "@/db/schema";
import { requireAdmin } from "@/lib/portal-auth";

export async function GET(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return NextResponse.json({ message: "Acceso reservado al despacho." }, { status: 403 });
  const rows = await getDb().select({ id: messages.id, organizationId: messages.organizationId, organizationName: organizations.tradeName, subject: messages.subject, body: messages.body, type: messages.type, dueDate: messages.dueDate, documentId: messages.documentId, readAt: messages.readAt, createdAt: messages.createdAt })
    .from(messages).innerJoin(organizations, eq(organizations.id, messages.organizationId)).orderBy(desc(messages.createdAt));
  return NextResponse.json({ messages: rows });
}

export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return NextResponse.json({ message: "Acceso reservado al despacho." }, { status: 403 });
  const body = (await request.json()) as { organizationId?: string; subject?: string; body?: string; type?: "informative" | "action" | "urgent"; dueDate?: string | null; documentId?: string | null };
  const subject = body.subject?.trim(); const content = body.body?.trim();
  if (!body.organizationId || !subject || subject.length > 180 || !content || content.length > 3000 || !["informative", "action", "urgent"].includes(body.type || "")) return NextResponse.json({ message: "Revise el destinatario, asunto, mensaje y tipo." }, { status: 400 });
  const db = getDb();
  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, body.organizationId)).limit(1);
  if (!organization) return NextResponse.json({ message: "La empresa no existe." }, { status: 404 });
  if (body.documentId) { const [document] = await db.select({ organizationId: documents.organizationId }).from(documents).where(eq(documents.id, body.documentId)).limit(1); if (!document || document.organizationId !== organization.id) return NextResponse.json({ message: "El documento adjunto no pertenece a la empresa." }, { status: 400 }); }
  const now = new Date().toISOString(); const id = `msg_${crypto.randomUUID()}`;
  await db.batch([
    db.insert(messages).values({ id, organizationId: organization.id, subject, body: content, type: body.type!, dueDate: body.dueDate || null, documentId: body.documentId || null, sentBy: actor.id, createdAt: now }),
    db.insert(auditEvents).values({ id: `aud_${crypto.randomUUID()}`, actorUserId: actor.id, organizationId: organization.id, action: "message.sent", entityType: "message", entityId: id, createdAt: now }),
  ]);
  return NextResponse.json({ message: "Aviso enviado al portal del cliente.", id }, { status: 201 });
}
