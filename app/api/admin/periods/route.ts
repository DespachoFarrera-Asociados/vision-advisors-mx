import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditEvents, fiscalPeriods, organizations } from "@/db/schema";
import { requireAdmin } from "@/lib/portal-auth";

export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) {
    return NextResponse.json({ message: "Acceso reservado al equipo de Vision Advisors." }, { status: 403 });
  }

  const body = (await request.json()) as { organizationId?: string; year?: number; month?: number };
  const year = Number(body.year);
  const month = Number(body.month);
  if (!body.organizationId || !Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ message: "Seleccione una empresa y un periodo válido." }, { status: 400 });
  }

  const db = getDb();
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.id, body.organizationId), eq(organizations.status, "active")))
    .limit(1);
  if (!organization) return NextResponse.json({ message: "La empresa no existe o no está activa." }, { status: 404 });

  const [existing] = await db
    .select({ id: fiscalPeriods.id })
    .from(fiscalPeriods)
    .where(and(eq(fiscalPeriods.organizationId, organization.id), eq(fiscalPeriods.year, year), eq(fiscalPeriods.month, month)))
    .limit(1);
  if (existing) return NextResponse.json({ message: "Ese periodo ya existe." }, { status: 409 });

  const now = new Date().toISOString();
  const periodId = `prd_${crypto.randomUUID()}`;
  await db.batch([
    db.insert(fiscalPeriods).values({
      id: periodId,
      organizationId: organization.id,
      year,
      month,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(auditEvents).values({
      id: `aud_${crypto.randomUUID()}`,
      actorUserId: actor.id,
      organizationId: organization.id,
      action: "period.created",
      entityType: "fiscal_period",
      entityId: periodId,
      metadataJson: JSON.stringify({ year, month }),
      createdAt: now,
    }),
  ]);

  return NextResponse.json({ id: periodId, organizationId: organization.id, year, month, status: "draft" }, { status: 201 });
}
