export const DOCUMENT_UNAVAILABLE_EVENT = "ampla:document-unavailable";

const INVALID_DOCUMENT_VALUES = new Set([
  "",
  "#",
  "about:blank",
  "false",
  "null",
  "undefined",
  "nenhum",
  "nenhuma",
  "n/a",
]);

const ARTIFICIAL_DOCUMENT_NAMES = /^(?:Simulacao_(?:CNH_Digital|Atestado_ASO|Integracao)|CRLV_Atualizado_Assinado|Recibo_Compra_Venda|Apolice_Seguro_Completo|Comprovante_Licenciamento_Exerc|antt_validacao|Foto_Lateral_Veiculo)\.(?:pdf|jpg)$/i;

export function getDocumentReference(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (INVALID_DOCUMENT_VALUES.has(normalized.toLowerCase())) return null;
    if (ARTIFICIAL_DOCUMENT_NAMES.test(normalized)) return null;
    if (/^javascript:/i.test(normalized)) return null;
    return normalized;
  }

  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    return getDocumentReference(candidate.url ?? candidate.path ?? candidate.arquivoUrl ?? candidate.fileUrl);
  }

  return null;
}

export function notifyDocumentUnavailable(): void {
  window.dispatchEvent(new CustomEvent(DOCUMENT_UNAVAILABLE_EVENT));
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;,]+)?;base64,(.+)$/s);
  if (!match) throw new Error("Data URL de documento inválida.");

  const binary = window.atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: match[1] || "application/octet-stream" });
}

export function openDocumentOrNotify(value: unknown): boolean {
  const reference = getDocumentReference(value);
  if (!reference) {
    notifyDocumentUnavailable();
    return false;
  }

  try {
    const target = reference.startsWith("data:")
      ? URL.createObjectURL(dataUrlToBlob(reference))
      : reference;
    window.open(target, "_blank", "noopener,noreferrer");

    if (reference.startsWith("data:")) {
      window.setTimeout(() => URL.revokeObjectURL(target), 60_000);
    }
    return true;
  } catch (error) {
    console.error("Falha ao abrir documento:", error);
    notifyDocumentUnavailable();
    return false;
  }
}

export function downloadDocumentOrNotify(value: unknown, filename?: string): boolean {
  const reference = getDocumentReference(value);
  if (!reference) {
    notifyDocumentUnavailable();
    return false;
  }

  try {
    const target = reference.startsWith("data:")
      ? URL.createObjectURL(dataUrlToBlob(reference))
      : reference;
    const link = document.createElement("a");
    link.href = target;
    if (filename?.trim()) link.download = filename.trim();
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (reference.startsWith("data:")) {
      window.setTimeout(() => URL.revokeObjectURL(target), 60_000);
    }
    return true;
  } catch (error) {
    console.error("Falha ao baixar documento:", error);
    notifyDocumentUnavailable();
    return false;
  }
}
