import PDFDocument from "pdfkit";

type ReportRoute = {
  dt: string;
  veiculo: string;
  motorista: string;
  tipo: string;
  destino: string;
  total: number;
  entregues: number;
  devolucoes: number;
  recusadas: number;
  pendentes: number;
  progresso: number;
  status: string;
};

export type HeinekenReportData = {
  unidade: string;
  dataReferencia: string;
  criadoEm: string;
  rotasSnapshot: ReportRoute[];
};

export function createHeinekenReportPdf(report: HeinekenReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28, info: { Title: "AMPLA - Acompanhamento de Rotas" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#07110d");
    doc.fillColor("#46d07f").fontSize(24).font("Helvetica-Bold").text("AMPLA", 28, 24);
    doc.fillColor("#ffffff").fontSize(15).text("ACOMPANHAMENTO DE ROTAS", 28, 55);
    doc.fillColor("#a7b6ae").fontSize(9).font("Helvetica")
      .text(`Unidade: ${report.unidade}`, 28, 78)
      .text(`Data: ${report.dataReferencia}`, 280, 78)
      .text(`Atualizado: ${new Date(report.criadoEm).toLocaleString("pt-BR")}`, 480, 78);

    const columns = [
      ["DT", 28, 68], ["VEÍCULO", 98, 62], ["MOTORISTA", 162, 105], ["TIPO", 270, 63],
      ["DESTINO", 335, 90], ["TOTAL", 428, 38], ["ENTR.", 469, 40], ["DEV", 512, 32],
      ["REC.", 547, 32], ["PEND.", 582, 40], ["PROG.", 625, 45], ["STATUS", 673, 78],
    ] as const;
    let y = 105;
    doc.roundedRect(24, y - 5, 752, 24, 4).fill("#123424");
    columns.forEach(([label, x]) => doc.fillColor("#d8f3e2").font("Helvetica-Bold").fontSize(7).text(label, x, y + 3));
    y += 25;

    for (const route of report.rotasSnapshot) {
      if (y > 535) {
        doc.addPage({ size: "A4", layout: "landscape", margin: 28 });
        doc.rect(0, 0, doc.page.width, doc.page.height).fill("#07110d");
        y = 30;
      }
      doc.rect(24, y - 3, 752, 21).fill(y % 2 === 0 ? "#0e2118" : "#0b1a13");
      const values = [route.dt, route.veiculo, route.motorista, route.tipo, route.destino, route.total, route.entregues, route.devolucoes, route.recusadas, route.pendentes, `${route.progresso}%`, route.status];
      columns.forEach(([, x, width], index) => doc.fillColor(index === 7 && route.devolucoes > 0 ? "#fbbf24" : "#edf6f0").font("Helvetica").fontSize(7).text(String(values[index] ?? "—"), x, y + 3, { width, ellipsis: true }));
      y += 22;
    }

    doc.fillColor("#6f8b7b").fontSize(7).text("Dados operacionais AMPLA. Status Ships não altera os indicadores.", 28, doc.page.height - 24);
    doc.end();
  });
}
