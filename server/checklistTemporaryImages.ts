import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const temporaryImageDirectory = path.join(os.tmpdir(), "ampla-operacional-checklist-images");

const getImagePath = (attachmentId: string) => {
  if (!/^[a-zA-Z0-9-]+$/.test(attachmentId)) throw new Error("Identificador de imagem temporária inválido.");
  return path.join(temporaryImageDirectory, `${attachmentId}.image`);
};

export function saveTemporaryChecklistImage(attachmentId: string, dataUrl: string): void {
  const match = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/s.exec(dataUrl);
  if (!match) throw new Error("Imagem temporária inválida.");
  fs.mkdirSync(temporaryImageDirectory, { recursive: true });
  fs.writeFileSync(getImagePath(attachmentId), Buffer.from(match[2], "base64"));
}

export function readTemporaryChecklistImage(attachmentId: string, mimeType: string): string | undefined {
  const imagePath = getImagePath(attachmentId);
  if (!fs.existsSync(imagePath)) return undefined;
  const bytes = fs.readFileSync(imagePath);
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

export function deleteTemporaryChecklistImages(attachmentIds: string[]): void {
  attachmentIds.forEach((attachmentId) => {
    const imagePath = getImagePath(attachmentId);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  });
}
