import { NextResponse } from "next/server";
import { getSchemaHealth } from "@/db/schema-health";
import { requireAdmin } from "@/lib/portal-auth";

export async function GET(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) {
    return NextResponse.json(
      { message: "Acceso reservado al equipo de Vision Advisors." },
      { status: 403 },
    );
  }

  const health = await getSchemaHealth();
  if (!health.ready) {
    return NextResponse.json(
      {
        ...health,
        message: `La base D1 requiere una migración antes de usar este panel. Faltan: ${health.missing.join(", ")}.`,
      },
      { status: 503 },
    );
  }

  return NextResponse.json(health);
}
