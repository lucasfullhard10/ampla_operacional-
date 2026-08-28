import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  groupShipsPdfPageItems,
  inspectShipsPdfHeader,
  isShipsPdfFileDescriptor,
  normalizeShipsExtractedText,
  parseShipsPdfLines,
  type ShipsPdfPositionedTextItem,
  type ShipsPdfTextLine,
} from "../../shared/shipsPdfParser";
import type { ShipsParsedTrip } from "../../shared/ships";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export class ShipsPdfParser {
  static async parse(file: File): Promise<ShipsParsedTrip> {
    if (!isShipsPdfFileDescriptor(file)) {
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
            hasEOL: Boolean(item.hasEOL),
          }));
        const pageLines = groupShipsPdfPageItems(positioned, pageNumber);
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

    const inspection = inspectShipsPdfHeader(lines, allPositionedItems);
    if (import.meta.env.DEV) {
      console.debug("[ShipsPdfParser] trip", inspection.tripNoRaw || null);
      console.debug("[ShipsPdfParser] vehicleSearch", inspection.vehicleSearch);
      console.debug("[ShipsPdfParser] vehicle", inspection.vehicleRaw || null);
      console.debug("[ShipsPdfParser] tripDateSearch", inspection.tripDateSearch);
    }
    try {
      return parseShipsPdfLines(lines, allPositionedItems);
    } catch (error) {
      const firstPageItems = allPositionedItems.filter((item) => item.page === 1);
      const rawText = firstPageItems.map((item) => item.text).join(" ");
      console.error("[ShipsPdfParser] extraction failure", {
        fileName: file.name,
        rawItems: firstPageItems,
        rawText,
        normalizedText: normalizeShipsExtractedText(rawText),
        reconstructedLines: lines.filter((line) => (line.page || 1) === 1),
        trip: inspection.tripNoRaw || null,
        vehicleSearch: inspection.vehicleSearch,
        vehicle: inspection.vehicleRaw || null,
        tripDateSearch: inspection.tripDateSearch,
        tripDate: inspection.tripDateRaw || null,
      });
      throw error;
    }
  }
}
