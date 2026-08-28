import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { parseShipsPdfLines, type ShipsPdfTextLine } from "../../shared/shipsPdfParser";
import type { ShipsParsedTrip } from "../../shared/ships";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PositionedText = {
  text: string;
  x: number;
  y: number;
};

function groupPageItems(items: PositionedText[], page: number): ShipsPdfTextLine[] {
  const rows: Array<{ y: number; items: PositionedText[] }> = [];

  for (const item of items.sort((first, second) => second.y - first.y || first.x - second.x)) {
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

    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const positioned = content.items
          .filter((item: any) => typeof item.str === "string" && item.str.trim())
          .map((item: any) => ({
            text: item.str.trim(),
            x: Number(item.transform?.[4] || 0),
            y: Number(item.transform?.[5] || 0),
          }));
        lines.push(...groupPageItems(positioned, pageNumber));
        page.cleanup();
      }
    } finally {
      await loadingTask.destroy();
    }

    return parseShipsPdfLines(lines);
  }
}
