import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ChecklistAnexo } from "../shared/weeklyChecklist.ts";

const temporaryImageDirectory = path.join(os.tmpdir(), "ampla-operacional-checklist-images");

const getImagePath = (attachmentId: string) => {
  if (!/^[a-zA-Z0-9-]+$/.test(attachmentId)) throw new Error("Identificador de imagem temporária inválido.");
  return path.join(temporaryImageDirectory, `${attachmentId}.image`);
};

const getMetadataPath = (attachmentId: string) => {
  if (!/^[a-zA-Z0-9-]+$/.test(attachmentId)) throw new Error("Identificador de imagem temporária inválido.");
  return path.join(temporaryImageDirectory, `${attachmentId}.json`);
};

export function saveTemporaryChecklistImage(attachmentId: string, dataUrl: string): void {
  const match = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/s.exec(dataUrl);
  if (!match) throw new Error("Imagem temporária inválida.");
  fs.mkdirSync(temporaryImageDirectory, { recursive: true });
  fs.writeFileSync(getImagePath(attachmentId), Buffer.from(match[2], "base64"));
}

export function saveTemporaryChecklistAttachment(attachment: ChecklistAnexo, dataUrl: string): void {
  saveTemporaryChecklistImage(attachment.id, dataUrl);
  const { dataUrl: _dataUrl, ...metadata } = attachment;
  fs.writeFileSync(getMetadataPath(attachment.id), JSON.stringify(metadata), "utf-8");
}

export function getTemporaryChecklistAttachments(checklistId: string): ChecklistAnexo[] {
  if (!fs.existsSync(temporaryImageDirectory)) return [];
  return fs.readdirSync(temporaryImageDirectory)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) => {
      try {
        const metadata = JSON.parse(fs.readFileSync(path.join(temporaryImageDirectory, name), "utf-8")) as ChecklistAnexo;
        return metadata.checklistId === checklistId ? [metadata] : [];
      } catch {
        return [];
      }
    });
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
    const metadataPath = getMetadataPath(attachmentId);
    if (fs.existsSync(metadataPath)) fs.unlinkSync(metadataPath);
  });
}
