import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditEvents, fiscalPeriods, monthlySnapshots, observations, organizations, taxSummaries } from "@/db/schema";
import { requireAdmin } from "@/lib/portal-auth";

const taxTypes = ["ISR", "IVA", "IMSS", "INFONAVIT", "ISN"] as const;

function forbidden() {
  return NextResponse.json({ message: "Acceso reservado al equipo de Vision Advisors." }, { status: 403 });
}

function validCents(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 900_000_000_000;
}

function validSignedCents(value: unknown) {
  return Number.isSafeInteger(value) && Math.abs(Number(value)) <= 900_000_000_000;
}

export async function GET(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();

  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");
  const periodId = url.searchParams.get("periodId");
  const db = getDb();

  if (periodId) {
    const [period] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.id, periodId)).limit(1);
    if (!period) return NextResponse.json({ message: "El periodo no existe." }, { status: 404 });
    const [snapshot, taxes, notes] = await Promise.all([
      db.select().from(monthlySnapshots).where(eq(monthlySnapshots.periodId, period.id)).limit(1),
      db.select().from(taxSummaries).where(eq(taxSummaries.periodId, period.id)),
      db.select().from(observations).where(eq(observations.periodId, period.id)).orderBy(observations.sortOrder),
    ]);
    return NextResponse.json({ period, snapshot: snapshot[0] ?? null, taxes, observations: notes });
  }

  if (!organizationId) return NextResponse.json({ message: "Seleccione una empresa." }, { status: 400 });
  const periods = await db
    .select()
    .from(fiscalPeriods)
    .where(eq(fiscalPeriods.organizationId, organizationId))
    .orderBy(desc(fiscalPeriods.year), desc(fiscalPeriods.month));
  return NextResponse.json({ periods });
}

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

export async function PUT(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();

  const body = (await request.json()) as {
    periodId?: string;
    healthScore?: number;
    healthLabel?: string;
    incomeMonthCents?: number;
    incomeYtdCents?: number;
    deductionsMonthCents?: number;
    deductionsYtdCents?: number;
    estimatedResultCents?: number;
    executiveSummary?: string;
    observation?: string;
    taxes?: Partial<Record<(typeof taxTypes)[number], number>>;
  };
  const amounts = [body.incomeMonthCents, body.incomeYtdCents, body.deductionsMonthCents, body.deductionsYtdCents];
  if (!body.periodId || amounts.some((amount) => !validCents(amount)) || !validSignedCents(body.estimatedResultCents) || !Number.isInteger(body.healthScore) || Number(body.healthScore) < 0 || Number(body.healthScore) > 100) {
    return NextResponse.json({ message: "Revise las cantidades y el indicador de salud." }, { status: 400 });
  }
  const summary = body.executiveSummary?.trim();
  const healthLabel = body.healthLabel?.trim();
  if (!summary || summary.length > 1800 || !healthLabel || healthLabel.length > 80) {
    return NextResponse.json({ message: "Capture un resumen ejecutivo y una evaluación válidos." }, { status: 400 });
  }
  for (const taxType of taxTypes) {
    if (!validCents(body.taxes?.[taxType] ?? 0)) {
      return NextResponse.json({ message: `El importe de ${taxType} no es válido.` }, { status: 400 });
    }
  }

  const db = getDb();
  const [period] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.id, body.periodId)).limit(1);
  if (!period) return NextResponse.json({ message: "El periodo no existe." }, { status: 404 });
  if (period.status === "locked") return NextResponse.json({ message: "El periodo está bloqueado y no puede modificarse." }, { status: 409 });

  const now = new Date().toISOString();
  const result = Number(body.estimatedResultCents);
  const income = Number(body.incomeMonthCents);
  const margin = income > 0 ? Math.round((result / income) * 10_000) : 0;
  await db.insert(monthlySnapshots).values({
    id: `snp_${crypto.randomUUID()}`,
    periodId: period.id,
    healthScore: Number(body.healthScore),
    healthLabel,
    incomeMonthCents: income,
    incomeYtdCents: Number(body.incomeYtdCents),
    deductionsMonthCents: Number(body.deductionsMonthCents),
    deductionsYtdCents: Number(body.deductionsYtdCents),
    estimatedResultCents: result,
    estimatedMarginBasisPoints: margin,
    executiveSummary: summary,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: monthlySnapshots.periodId,
    set: {
      healthScore: Number(body.healthScore), healthLabel, incomeMonthCents: income,
      incomeYtdCents: Number(body.incomeYtdCents), deductionsMonthCents: Number(body.deductionsMonthCents),
      deductionsYtdCents: Number(body.deductionsYtdCents), estimatedResultCents: result,
      estimatedMarginBasisPoints: margin, executiveSummary: summary, updatedAt: now,
    },
  });

  await db.delete(taxSummaries).where(eq(taxSummaries.periodId, period.id));
  for (const taxType of taxTypes) {
    const amount = body.taxes?.[taxType] ?? 0;
    await db.insert(taxSummaries).values({
      id: `tax_${crypto.randomUUID()}`, periodId: period.id, taxType, amountCents: amount,
      status: "estimated", createdAt: now, updatedAt: now,
    });
  }

  await db.delete(observations).where(eq(observations.periodId, period.id));
  if (body.observation?.trim()) {
    await db.insert(observations).values({
      id: `obs_${crypto.randomUUID()}`, periodId: period.id, severity: "attention",
      title: "Observación del periodo", detail: body.observation.trim().slice(0, 1600),
      sortOrder: 0, createdAt: now, updatedAt: now,
    });
  }
  await db.update(fiscalPeriods).set({ status: "review", updatedAt: now }).where(eq(fiscalPeriods.id, period.id));
  await db.insert(auditEvents).values({
    id: `aud_${crypto.randomUUID()}`, actorUserId: actor.id, organizationId: period.organizationId,
    action: "period.updated", entityType: "fiscal_period", entityId: period.id, createdAt: now,
  });
  return NextResponse.json({ message: "Información guardada para revisión.", status: "review" });
}

export async function PATCH(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();
  const body = (await request.json()) as { periodId?: string };
  if (!body.periodId) return NextResponse.json({ message: "Seleccione un periodo." }, { status: 400 });

  const db = getDb();
  const [period] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.id, body.periodId)).limit(1);
  if (!period) return NextResponse.json({ message: "El periodo no existe." }, { status: 404 });
  const [snapshot] = await db.select({ id: monthlySnapshots.id }).from(monthlySnapshots).where(eq(monthlySnapshots.periodId, period.id)).limit(1);
  if (!snapshot) return NextResponse.json({ message: "Guarde la información del periodo antes de publicarlo." }, { status: 409 });

  const now = new Date().toISOString();
  await db.update(fiscalPeriods).set({ status: "published", publishedAt: now, publishedBy: actor.id, updatedAt: now }).where(eq(fiscalPeriods.id, period.id));
  await db.insert(auditEvents).values({
    id: `aud_${crypto.randomUUID()}`, actorUserId: actor.id, organizationId: period.organizationId,
    action: "period.published", entityType: "fiscal_period", entityId: period.id, createdAt: now,
  });
  return NextResponse.json({ message: "Periodo publicado para el cliente.", status: "published", publishedAt: now });
}
