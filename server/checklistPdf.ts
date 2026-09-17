import PDFDocument from "pdfkit";
import type { Unidade } from "./database.ts";
import type { ChecklistDetail } from "./weeklyChecklistService.ts";
import { CHECKLIST_SIGNATURE_DECLARATION } from "../shared/weeklyChecklist.ts";
import { CHECKLIST_VEHICLE_SIDES } from "../shared/weeklyChecklist.ts";

const COLORS = {
  ink: "#0f172a",
  muted: "#475569",
  subtle: "#64748b",
  border: "#cbd5e1",
  surface: "#f8fafc",
  alternate: "#f1f5f9",
  white: "#ffffff",
  green: "#047857",
  greenSoft: "#d1fae5",
  rose: "#be123c",
  roseSoft: "#ffe4e6",
  amber: "#b45309",
  amberSoft: "#fef3c7",
  blue: "#2563eb",
};

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

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
};

export function createChecklistPdf(detail: ChecklistDetail, unit?: Unidade): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 42,
      bufferPages: true,
      info: { Title: "Checklist Semanal de Veículo" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { checklist, participantes, respostas, anexos, bloqueios, manutencoes, reinspecoes } = detail;
    const left = 42;
    const contentWidth = doc.page.width - 84;
    const contentBottom = doc.page.height - 72;
    let cursorY = 108;

    const checklistStatus = statusLabel(checklist.resultado || checklist.status);
    const resultColor = checklist.resultado === "CONFORME" ? COLORS.green : checklist.bloqueouVeiculo ? COLORS.rose : COLORS.amber;

    const drawHeader = () => {
      doc.rect(0, 0, doc.page.width, 88).fill(COLORS.ink);
      doc.rect(0, 0, doc.page.width, 3).fill(COLORS.blue);
      doc.fillColor("#34d399").font("Helvetica-Bold").fontSize(9).text("SISTEMA AMPLA", left, 24, { width: 250 });
      doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(17).text("CHECKLIST SEMANAL DE VEÍCULO", left, 42, { width: 380 });
      doc.fillColor(resultColor).font("Helvetica-Bold").fontSize(7.5).text(checklistStatus, 400, 37, { width: 153, align: "right", lineBreak: false, ellipsis: true });
      doc.fillColor("#94a3b8").font("Helvetica").fontSize(7).text(checklist.protocolo || "PROTOCOLO PENDENTE", 400, 52, { width: 153, align: "right" });
    };

    const addPage = () => {
      doc.addPage();
      drawHeader();
      cursorY = 108;
    };

    const ensureSpace = (height: number) => {
      if (cursorY + height > contentBottom) addPage();
    };

    const drawSectionTitle = (title: string) => {
      ensureSpace(30);
      doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(11).text(title, left, cursorY, { width: contentWidth });
      doc.moveTo(left, cursorY + 17).lineTo(left + contentWidth, cursorY + 17).lineWidth(0.8).strokeColor(COLORS.border).stroke();
      cursorY += 27;
    };

    const metadata = [
      ["Unidade", checklist.unidadeNomeSnapshot || unit?.nome || checklist.unidadeId],
      ["Protocolo", checklist.protocolo || "Não emitido"],
      ["Data/hora", formatDateTime(checklist.finalizadoEm || checklist.inspecaoConcluidaEm || checklist.dataChecklist)],
      ["Semana", `${checklist.dataInicioSemana.split("-").reverse().join("/")} a ${checklist.dataFimSemana.split("-").reverse().join("/")}`],
      ["Veículo", `${checklist.placaSnapshot}${checklist.veiculoModeloSnapshot ? ` - ${checklist.veiculoModeloSnapshot}` : ""}`],
      ["Motorista", checklist.motoristaNomeSnapshot || "Nenhum motorista vinculado"],
      ["CPF", checklist.motoristaCpfSnapshot || "—"],
      ["Rota / DT", checklist.rotaSnapshot || checklist.dtId || "Não aplicável"],
      ["Responsável", checklist.responsavelNomeSnapshot],
      ["Quilometragem", checklist.km ? `${checklist.km.toLocaleString("pt-BR")} km` : "Não informada"],
    ] as Array<[string, string]>;

    drawHeader();
    drawSectionTitle("Identificação da inspeção");
    const metadataGap = 11;
    const metadataWidth = (contentWidth - metadataGap) / 2;
    for (let index = 0; index < metadata.length; index += 2) {
      const entries = metadata.slice(index, index + 2);
      doc.font("Helvetica").fontSize(8);
      const rowHeight = Math.max(...entries.map(([, value]) => 25 + doc.heightOfString(String(value), { width: metadataWidth - 20 })), 42);
      ensureSpace(rowHeight + 6);
      entries.forEach(([label, value], column) => {
        const x = left + column * (metadataWidth + metadataGap);
        doc.roundedRect(x, cursorY, metadataWidth, rowHeight, 4).fillAndStroke(COLORS.surface, COLORS.border);
        doc.fillColor(COLORS.subtle).font("Helvetica-Bold").fontSize(7).text(label.toUpperCase(), x + 10, cursorY + 8, { width: metadataWidth - 20 });
        doc.fillColor(COLORS.ink).font("Helvetica").fontSize(8).text(String(value), x + 10, cursorY + 21, { width: metadataWidth - 20 });
      });
      cursorY += rowHeight + 6;
    }

    drawSectionTitle("Itens inspecionados");
    if (respostas.length === 0) {
      doc.roundedRect(left, cursorY, contentWidth, 38, 4).fillAndStroke(COLORS.surface, COLORS.border);
      doc.fillColor(COLORS.muted).font("Helvetica-Oblique").fontSize(8).text("Nenhum item de inspeção registrado.", left + 12, cursorY + 14, { width: contentWidth - 24 });
      cursorY += 48;
    }

    respostas.forEach((response, index) => {
      const resultWidth = 116;
      const textWidth = contentWidth - resultWidth - 30;
      doc.font("Helvetica").fontSize(8);
      const descriptionHeight = doc.heightOfString(response.descricaoSnapshot, { width: textWidth });
      const notes = [
        response.observacao && `Observação: ${response.observacao}`,
        response.acaoCorretiva && `Ação corretiva: ${response.acaoCorretiva}`,
      ].filter(Boolean).join("\n");
      doc.font("Helvetica").fontSize(7);
      const notesHeight = notes ? doc.heightOfString(notes, { width: contentWidth - 24 }) + 7 : 0;
      const rowHeight = Math.max(48, 28 + descriptionHeight + notesHeight);
      ensureSpace(rowHeight + 5);

      const rowY = cursorY;
      const isNonConforming = response.resposta === "NAO_CONFORME";
      const badgeFill = isNonConforming ? COLORS.roseSoft : response.resposta === "NAO_APLICA" ? COLORS.amberSoft : COLORS.greenSoft;
      const badgeColor = isNonConforming ? COLORS.rose : response.resposta === "NAO_APLICA" ? COLORS.amber : COLORS.green;
      doc.roundedRect(left, rowY, contentWidth, rowHeight, 4).fillAndStroke(index % 2 === 0 ? COLORS.surface : COLORS.white, COLORS.border);
      doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(8).text(`${response.codigoSnapshot} - ${response.categoriaSnapshot}`, left + 11, rowY + 9, { width: textWidth });
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(response.descricaoSnapshot, left + 11, rowY + 22, { width: textWidth });
      doc.roundedRect(left + contentWidth - resultWidth - 10, rowY + 11, resultWidth, 22, 5).fill(badgeFill);
      doc.fillColor(badgeColor).font("Helvetica-Bold").fontSize(7).text(answerLabel(response.resposta).toUpperCase(), left + contentWidth - resultWidth - 6, rowY + 18, { width: resultWidth - 8, align: "center" });
      if (notes) {
        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7).text(notes, left + 11, rowY + 31 + descriptionHeight, { width: contentWidth - 22 });
      }
      cursorY += rowHeight + 5;
    });

    ensureSpace(66);
    const nonConformities = respostas.filter((response) => response.resposta === "NAO_CONFORME");
    doc.roundedRect(left, cursorY, contentWidth, 54, 5).fillAndStroke(nonConformities.length > 0 ? COLORS.roseSoft : COLORS.greenSoft, nonConformities.length > 0 ? "#fda4af" : "#6ee7b7");
    doc.fillColor(nonConformities.length > 0 ? COLORS.rose : COLORS.green).font("Helvetica-Bold").fontSize(10).text(`Resultado: ${checklistStatus} | Não conformidades: ${nonConformities.length}`, left + 12, cursorY + 10, { width: contentWidth - 24 });
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(`Bloqueios vinculados: ${bloqueios.length} | Manutenções vinculadas: ${manutencoes.length} | Reinspeções: ${reinspecoes.length}`, left + 12, cursorY + 30, { width: contentWidth - 24 });
    cursorY += 66;

    if (checklist.observacoes?.length) {
      drawSectionTitle("Observações adicionais");
      checklist.observacoes.forEach((observation) => {
        const isAddendum = Boolean(checklist.inspecaoConcluidaEm && observation.criadoEm > checklist.inspecaoConcluidaEm);
        doc.font("Helvetica").fontSize(8);
        const textHeight = doc.heightOfString(observation.texto, { width: contentWidth - 24 });
        const rowHeight = 43 + textHeight + (isAddendum ? 15 : 0);
        ensureSpace(rowHeight + 7);
        doc.roundedRect(left, cursorY, contentWidth, rowHeight, 5).fillAndStroke(COLORS.surface, COLORS.border);
        doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(8).text(observation.autorNome, left + 12, cursorY + 10, { width: contentWidth - 24 });
        doc.fillColor(COLORS.subtle).font("Helvetica").fontSize(7).text(formatDateTime(observation.criadoEm), left + 12, cursorY + 23, { width: contentWidth - 24 });
        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(observation.texto, left + 12, cursorY + 36, { width: contentWidth - 24 });
        if (isAddendum) doc.fillColor(COLORS.amber).font("Helvetica-Bold").fontSize(7).text("Adendo posterior à conclusão - assinatura original preservada", left + 12, cursorY + 39 + textHeight, { width: contentWidth - 24 });
        cursorY += rowHeight + 7;
      });
    }

    const photoAttachments = anexos.filter((attachment) => attachment.tipo !== "ASSINATURA").sort((a, b) => {
      const rank = (attachment: typeof a) => attachment.tipo === "FOTO_VEICULO"
        ? CHECKLIST_VEHICLE_SIDES.indexOf(attachment.posicaoVeiculo || "DIREITA")
        : attachment.tipo === "FOTO_OBSERVACAO" ? 4 : 5;
      return rank(a) - rank(b);
    });
    if (photoAttachments.length > 0) {
      addPage();
      drawSectionTitle("Evidências fotográficas");
      const photoGap = 11;
      const photoWidth = (contentWidth - photoGap) / 2;
      photoAttachments.forEach((attachment, index) => {
        const column = index % 2;
        if (column === 0) ensureSpace(203);
        const x = left + column * (photoWidth + photoGap);
        const cardY = cursorY;
        doc.roundedRect(x, cardY, photoWidth, 190, 5).fillAndStroke(COLORS.surface, COLORS.border);
        const caption = attachment.tipo === "FOTO_VEICULO"
          ? `Veículo - ${attachment.posicaoVeiculo === "DIREITA" ? "lado direito" : attachment.posicaoVeiculo === "ESQUERDA" ? "lado esquerdo" : attachment.posicaoVeiculo === "FRENTE" ? "frente" : "parte de trás"}`
          : attachment.tipo === "FOTO_OBSERVACAO" ? "Foto da observação" : attachment.nome || `Evidência ${index + 1}`;
        doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(8).text(caption, x + 10, cardY + 10, { width: photoWidth - 20, ellipsis: true });
        const image = dataUrlBuffer(attachment.dataUrl);
        if (image) {
          try {
            doc.image(image, x + 10, cardY + 30, { fit: [photoWidth - 20, 145], align: "center", valign: "center" });
          } catch {
            doc.fillColor(COLORS.subtle).font("Helvetica").fontSize(8).text("A imagem não pôde ser incorporada.", x + 10, cardY + 85, { width: photoWidth - 20, align: "center" });
          }
        }
        if (column === 1 || index === photoAttachments.length - 1) cursorY += 203;
      });
    }

    ensureSpace(95);
    drawSectionTitle("Declaração e assinaturas individuais");
    doc.roundedRect(left, cursorY, contentWidth, 48, 5).fillAndStroke(COLORS.alternate, COLORS.border);
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(CHECKLIST_SIGNATURE_DECLARATION, left + 12, cursorY + 11, { width: contentWidth - 24, lineGap: 1 });
    cursorY += 60;

    const operationalParticipants = participantes.filter((participant) => participant.tipoParticipante === "MOTORISTA" || participant.tipoParticipante === "AJUDANTE");
    operationalParticipants.forEach((participant) => {
      const cardHeight = 116;
      ensureSpace(cardHeight + 9);
      const cardY = cursorY;
      const signed = participant.statusAssinatura === "ASSINADO";
      doc.roundedRect(left, cardY, contentWidth, cardHeight, 5).fillAndStroke(COLORS.white, COLORS.border);
      doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(9).text(participant.tipoParticipante, left + 12, cardY + 10, { width: 260 });
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(`Nome: ${participant.nomeSnapshot}`, left + 12, cardY + 28, { width: 270 });
      doc.text(`CPF: ${participant.cpfSnapshot || "Não informado"}`, left + 12, cardY + 43, { width: 270 });
      doc.fillColor(signed ? COLORS.green : COLORS.amber).font("Helvetica-Bold").text(`Status: ${signed ? "Assinado" : "Assinatura não registrada"}`, left + 12, cardY + 58, { width: 270 });
      doc.fillColor(COLORS.muted).font("Helvetica").text(`Data/hora: ${formatDateTime(participant.dataAssinatura)}`, left + 12, cardY + 73, { width: 270 });

      const signatureX = left + 300;
      doc.fillColor(COLORS.subtle).font("Helvetica-Bold").fontSize(7).text("ASSINATURA", signatureX, cardY + 10, { width: contentWidth - 312, align: "center" });
      doc.roundedRect(signatureX, cardY + 25, contentWidth - 312, 72, 4).fillAndStroke(COLORS.surface, COLORS.border);
      const signature = anexos.find((attachment) => attachment.id === participant.assinaturaAnexoId);
      const signatureImage = dataUrlBuffer(signature?.dataUrl);
      if (signatureImage) {
        try {
          doc.image(signatureImage, signatureX + 8, cardY + 32, { fit: [contentWidth - 328, 56], align: "center", valign: "center" });
        } catch {
          doc.fillColor(COLORS.subtle).font("Helvetica-Oblique").fontSize(7).text("Assinatura indisponível", signatureX + 8, cardY + 57, { width: contentWidth - 328, align: "center" });
        }
      } else {
        doc.fillColor(COLORS.subtle).font("Helvetica-Oblique").fontSize(7).text("Sem imagem de assinatura", signatureX + 8, cardY + 57, { width: contentWidth - 328, align: "center" });
      }
      cursorY += cardHeight + 9;
    });

    if (!operationalParticipants.some((participant) => participant.tipoParticipante === "AJUDANTE")) {
      ensureSpace(40);
      doc.roundedRect(left, cursorY, contentWidth, 34, 4).fillAndStroke(COLORS.surface, COLORS.border);
      doc.fillColor(COLORS.subtle).font("Helvetica-Oblique").fontSize(8).text("Ajudante não escalado nesta operação.", left + 12, cursorY + 12, { width: contentWidth - 24 });
      cursorY += 45;
    }

    ensureSpace(46);
    doc.roundedRect(left, cursorY, contentWidth, 38, 4).fillAndStroke(checklist.bloqueouVeiculo ? COLORS.roseSoft : COLORS.greenSoft, checklist.bloqueouVeiculo ? "#fda4af" : "#6ee7b7");
    doc.fillColor(checklist.bloqueouVeiculo ? COLORS.rose : COLORS.green).font("Helvetica-Bold").fontSize(9).text(`Bloqueio operacional: ${checklist.bloqueouVeiculo ? "VEÍCULO BLOQUEADO" : "Não"}`, left + 12, cursorY + 14, { width: contentWidth - 24 });

    const pageRange = doc.bufferedPageRange();
    for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      doc.moveTo(left, doc.page.height - 59).lineTo(left + contentWidth, doc.page.height - 59).lineWidth(0.6).strokeColor(COLORS.border).stroke();
      doc.fillColor(COLORS.subtle).font("Helvetica").fontSize(7).text(`${checklist.protocolo || checklist.id} | Página ${pageIndex + 1} de ${pageRange.count}`, left, doc.page.height - 52, { width: contentWidth, align: "center", lineBreak: false });
    }

    doc.end();
  });
}
