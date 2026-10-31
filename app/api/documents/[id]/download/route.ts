import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents, memberships } from "@/db/schema";
import { getPortalUser } from "@/lib/portal-auth";
import { acceptedDocumentTypes, getPrivateBucket, safeDownloadName } from "@/lib/private-files";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getPortalUser(request);
  if (!user) return Response.json({ message: "Sesión no autorizada." }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!document) return Response.json({ message: "Documento no encontrado." }, { status: 404 });
  const isStaff = ["admin", "advisor"].includes(user.platformRole);
  if (!isStaff) {
    const [membership] = await db.select({ id: memberships.id }).from(memberships).where(and(eq(memberships.userId, user.id), eq(memberships.organizationId, document.organizationId))).limit(1);
    if (!membership || document.status !== "published") return Response.json({ message: "No tiene permiso para descargar este documento." }, { status: 403 });
  }
  const object = await getPrivateBucket().get(document.objectKey);
  if (!object) return Response.json({ message: "El archivo no está disponible en el almacenamiento." }, { status: 404 });
  const extension = acceptedDocumentTypes.get(document.mimeType) || "bin";
  const fileName = safeDownloadName(document.title, extension);
  return new Response(object.body, { headers: {
    "content-type": document.mimeType,
    "content-length": String(object.size),
    "content-disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  } });
}
