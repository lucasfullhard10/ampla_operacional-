import PDFDocument from "pdfkit";
import type { Unidade } from "./database.ts";
import type { ChecklistDetail } from "./weeklyChecklistService.ts";

const answerLabel = (value?: string) => {
  if (value === "CONFORME") return "Conforme";
  if (value === "NAO_CONFORME") return "Não Conforme";
  if (value === "NAO_APLICA") return "Não se Aplica";
  return "Sem resposta";
};

const statusLabel = (value: string) => value.replaceAll("_", " ");

const dataUrlBuffer = (dataUrl?: string): Buffer | null => {
  if (!dataUrl) return null;
  const match = /^data:image\/(?:png|jpe?g);base64,(.+)$/s.exec(dataUrl);
  return match ? Buffer.from(match[1], "base64") : null;
};

export function createChecklistPdf(detail: ChecklistDetail, unit?: Unidade): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42, info: { Title: "Checklist Semanal de Veículo" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { checklist, respostas, anexos, bloqueios, manutencoes, reinspecoes } = detail;
    doc.rect(0, 0, doc.page.width, 82).fill("#0f172a");
    doc.fillColor("#34d399").fontSize(10).font("Helvetica-Bold").text("SISTEMA AMPLA", 42, 25);
    doc.fillColor("#ffffff").fontSize(18).text("CHECKLIST SEMANAL DE VEÍCULO", 42, 42);
    doc.moveDown(2.4);

    const line = (label: string, value?: string | number) => {
      doc.fillColor("#475569").fontSize(8).font("Helvetica-Bold").text(`${label}:`, { continued: true });
      doc.fillColor("#0f172a").font("Helvetica").text(` ${value ?? "—"}`);
    };
    line("Unidade", checklist.unidadeNomeSnapshot || unit?.nome || checklist.unidadeId);
    line("Protocolo", checklist.protocolo || "Não emitido");
    line("Data/hora", checklist.finalizadoEm ? new Date(checklist.finalizadoEm).toLocaleString("pt-BR") : checklist.dataChecklist);
    line("Semana", `${checklist.dataInicioSemana.split("-").reverse().join("/")} a ${checklist.dataFimSemana.split("-").reverse().join("/")}`);
    line("Veículo", `${checklist.placaSnapshot}${checklist.veiculoModeloSnapshot ? ` — ${checklist.veiculoModeloSnapshot}` : ""}`);
    line("Motorista", checklist.motoristaNomeSnapshot || "Nenhum motorista vinculado");
    line("CPF", checklist.motoristaCpfSnapshot || "—");
    line("Rota / DT", checklist.rotaSnapshot || checklist.dtId || "Não aplicável");
    line("Responsável", checklist.responsavelNomeSnapshot);
    line("Quilometragem", checklist.km ? `${checklist.km.toLocaleString("pt-BR")} km` : "Não informada");
    line("Resultado", checklist.resultado ? statusLabel(checklist.resultado) : statusLabel(checklist.status));

    doc.moveDown(0.7);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("Itens inspecionados");
    doc.moveDown(0.4);
    respostas.forEach((response, index) => {
      if (doc.y > 700) doc.addPage();
      const isNonConforming = response.resposta === "NAO_CONFORME";
      doc.fillColor(index % 2 === 0 ? "#f8fafc" : "#ffffff").rect(42, doc.y, 511, 34).fill();
      const rowY = doc.y - 34;
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8).text(
        `${response.codigoSnapshot} · ${response.categoriaSnapshot}`,
        48,
        rowY + 6,
        { width: 330 },
      );
      doc.font("Helvetica").fontSize(8).text(response.descricaoSnapshot, 48, rowY + 17, { width: 330 });
      doc.fillColor(isNonConforming ? "#be123c" : "#047857").font("Helvetica-Bold").text(
        answerLabel(response.resposta),
        390,
        rowY + 12,
        { width: 150, align: "right" },
      );
      if (response.observacao || response.acaoCorretiva) {
        doc.fillColor("#334155").font("Helvetica").fontSize(7).text(
          [response.observacao && `Observação: ${response.observacao}`, response.acaoCorretiva && `Ação: ${response.acaoCorretiva}`].filter(Boolean).join(" | "),
          48,
          rowY + 37,
          { width: 490 },
        );
        doc.moveDown(1.2);
      }
    });

    const nonConformities = respostas.filter((response) => response.resposta === "NAO_CONFORME");
    doc.moveDown(0.8);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text(`Não conformidades: ${nonConformities.length}`);
    doc.font("Helvetica").fontSize(8).text(`Bloqueios vinculados: ${bloqueios.length} · Manutenções vinculadas: ${manutencoes.length} · Reinspeções: ${reinspecoes.length}`);

    const photoAttachments = anexos.filter((attachment) => attachment.tipo !== "ASSINATURA");
    if (photoAttachments.length > 0) {
      doc.addPage();
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Evidências fotográficas");
      doc.moveDown(0.5);
      photoAttachments.forEach((attachment) => {
        const image = dataUrlBuffer(attachment.dataUrl);
        if (!image) return;
        if (doc.y > 610) doc.addPage();
        try {
          doc.image(image, 42, doc.y, { fit: [240, 160] });
          doc.moveDown(11);
        } catch {
          doc.fillColor("#64748b").fontSize(8).text(`Evidência ${attachment.nome} não pôde ser incorporada.`);
        }
      });
    }

    if (doc.y > 620) doc.addPage();
    doc.moveDown(1);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Declaração e assinatura");
    doc.fillColor("#334155").font("Helvetica").fontSize(8).text(
      "Declaro que realizei a inspeção do veículo e que as informações registradas neste checklist são verdadeiras.",
      { width: 500 },
    );
    const signature = anexos.find((attachment) => attachment.id === checklist.assinaturaAnexoId);
    const signatureImage = dataUrlBuffer(signature?.dataUrl);
    if (signatureImage) {
      try {
        doc.image(signatureImage, 42, doc.y + 8, { fit: [210, 75] });
        doc.moveDown(6.5);
      } catch {
        doc.moveDown(1);
      }
    }
    line("Assinado por", checklist.assinaturaUsuarioNomeSnapshot || checklist.assinaturaMotoristaNomeSnapshot || checklist.motoristaNomeSnapshot);
    line("Perfil do signatário", checklist.assinaturaUsuarioTipoSnapshot || "MOTORISTA");
    line("CPF do motorista vinculado", checklist.assinaturaMotoristaCpfSnapshot || checklist.motoristaCpfSnapshot);
    line("Data/hora da assinatura", checklist.dataAssinatura ? new Date(checklist.dataAssinatura).toLocaleString("pt-BR") : "—");
    line("Bloqueio operacional", checklist.bloqueouVeiculo ? "VEÍCULO BLOQUEADO" : "Não");

    doc.end();
  });
}
