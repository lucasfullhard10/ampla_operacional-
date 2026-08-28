import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  normalizeShipsExtractedText,
  parseShipsPdfLines,
  type ShipsPdfPositionedTextItem,
  type ShipsPdfTextLine,
} from "../../shared/shipsPdfParser";
import type { ShipsParsedTrip } from "../../shared/ships";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function groupPageItems(items: ShipsPdfPositionedTextItem[], page: number): ShipsPdfTextLine[] {
  const rows: Array<{ y: number; items: ShipsPdfPositionedTextItem[] }> = [];

  for (const item of [...items].sort((first, second) => second.y - first.y || first.x - second.x)) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2.5);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }

  return rows
    .sort((first, second) => second.y - first.y)
    .map((row) => ({
      page,
      text: row.items
        .sort((first, second) => first.x - second.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    }))
    .filter((line) => line.text);
}

export class ShipsPdfParser {
  static async parse(file: File): Promise<ShipsParsedTrip> {
    if (!file || (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf"))) {
      throw new Error("Selecione um arquivo PDF válido do Ships.");
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = getDocument({ data });
    const document = await loadingTask.promise;
    const lines: ShipsPdfTextLine[] = [];
    const allPositionedItems: ShipsPdfPositionedTextItem[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const positioned = content.items
          .filter((item: any) => typeof item.str === "string" && item.str.trim())
          .map((item: any) => ({
            text: item.str.trim(),
            page: pageNumber,
            x: Number(item.transform?.[4] || 0),
            y: Number(item.transform?.[5] || 0),
            width: Number(item.width || 0),
            height: Number(item.height || 0),
          }));
        const pageLines = groupPageItems(positioned, pageNumber);
        if (import.meta.env.DEV && pageNumber === 1) {
          const rawText = positioned.map((item) => item.text).join(" ");
          console.debug("[ShipsPdfParser] rawItems", positioned);
          console.debug("[ShipsPdfParser] rawText", rawText);
          console.debug(
            "[ShipsPdfParser] normalizedText",
            normalizeShipsExtractedText(rawText),
          );
        }
        allPositionedItems.push(...positioned);
        lines.push(...pageLines);
        page.cleanup();
      }
    } finally {
      await loadingTask.destroy();
    }

    const parsed = parseShipsPdfLines(lines, allPositionedItems);
    if (import.meta.env.DEV) {
      console.debug("[ShipsPdfParser] trip", parsed.tripNo);
      console.debug("[ShipsPdfParser] vehicle", parsed.vehicleNumber);
    }
    return parsed;
  }
}
