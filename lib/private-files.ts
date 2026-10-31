import { env } from "cloudflare:workers";

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export const acceptedDocumentTypes = new Map([
  ["application/pdf", "pdf"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["text/csv", "csv"],
]);

export function getPrivateBucket() {
  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!bucket) throw new Error("El almacenamiento privado BUCKET no está disponible.");
  return bucket;
}

export function safeDownloadName(title: string, extension: string) {
  const stem = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "documento";
  return `${stem}.${extension}`;
}
