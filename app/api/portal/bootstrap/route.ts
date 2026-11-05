import { NextResponse } from "next/server";
import { GET as getDocuments } from "@/app/api/portal/documents/route";
import { GET as getHistory } from "@/app/api/portal/history/route";
import { GET as getMessages } from "@/app/api/portal/messages/route";
import { GET as getSummary } from "@/app/api/portal/summary/route";

async function readSection(handler: (request: Request) => Promise<Response>, request: Request, fallback: unknown) {
  try {
    const response = await handler(request);
    if (!response.ok && response.status !== 503) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  const [summary, documents, history, messages] = await Promise.all([
    readSection(getSummary, request, { status: "unavailable", message: "No fue posible consultar el resumen." }),
    readSection(getDocuments, request, { documents: [] }),
    readSection(getHistory, request, { periods: [] }),
    readSection(getMessages, request, { messages: [] }),
  ]);

  return NextResponse.json({ summary, documents, history, messages });
}
