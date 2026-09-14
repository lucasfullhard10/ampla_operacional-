import assert from "node:assert/strict";
import test from "node:test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createChecklistPdf } from "./checklistPdf.ts";
import type { ChecklistDetail } from "./weeklyChecklistService.ts";

const onePixelPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("PDF apresenta motorista e ajudante como assinantes individuais", async () => {
  const detail: ChecklistDetail = {
    checklist: {
      id: "chk-pdf",
      protocolo: "CHK-2026-000001-ABCDEF12",
      veiculoId: "vei-1",
      unidadeId: "un-1",
      motoristaId: "mot-renato",
      usuarioMotoristaId: "usr-renato",
      motoristaNomeSnapshot: "Renato Motorista",
      motoristaCpfSnapshot: "111.222.333-44",
      ajudanteIdsSnapshot: ["aju-joao"],
      ajudanteNomesSnapshot: ["João Ajudante"],
      placaSnapshot: "REF9E90",
      origemMotorista: "ROTA_ATIVA",
      dataChecklist: "2026-09-09",
      dataInicioSemana: "2026-09-07",
      dataFimSemana: "2026-09-13",
      ano: 2026,
      identificadorSemana: "2026-09-07_2026-09-13",
      versaoChecklist: "teste",
      status: "CONFORME",
      resultado: "CONFORME",
      possuiNaoConformidade: false,
      possuiNaoConformidadeCritica: false,
      bloqueouVeiculo: false,
      responsavelId: "usr-renato",
      responsavelNomeSnapshot: "Renato Motorista",
      criadoEm: "2026-09-09T10:00:00.000Z",
      atualizadoEm: "2026-09-09T10:05:00.000Z",
      inspecaoConcluidaEm: "2026-09-09T10:04:00.000Z",
      finalizadoEm: "2026-09-09T10:05:00.000Z",
    },
    participantes: [
      {
        id: "chp-driver",
        checklistId: "chk-pdf",
        pessoaId: "mot-renato",
        userId: "usr-renato",
        tipoParticipante: "MOTORISTA",
        nomeSnapshot: "Renato Motorista",
        cpfSnapshot: "111.222.333-44",
        assinaturaAnexoId: "sig-driver",
        dataAssinatura: "2026-09-09T10:04:00.000Z",
        statusAssinatura: "ASSINADO",
      },
      {
        id: "chp-helper",
        checklistId: "chk-pdf",
        pessoaId: "aju-joao",
        userId: "usr-joao",
        tipoParticipante: "AJUDANTE",
        nomeSnapshot: "João Ajudante",
        cpfSnapshot: "555.666.777-88",
        assinaturaAnexoId: "sig-helper",
        dataAssinatura: "2026-09-09T10:05:00.000Z",
        statusAssinatura: "ASSINADO",
      },
    ],
    respostas: [],
    anexos: [
      { id: "sig-driver", checklistId: "chk-pdf", participanteId: "chp-driver", tipo: "ASSINATURA", nome: "motorista.png", mimeType: "image/png", dataUrl: onePixelPng, criadoEm: "2026-09-09T10:04:00.000Z", criadoPor: "usr-renato", unidadeId: "un-1" },
      { id: "sig-helper", checklistId: "chk-pdf", participanteId: "chp-helper", tipo: "ASSINATURA", nome: "ajudante.png", mimeType: "image/png", dataUrl: onePixelPng, criadoEm: "2026-09-09T10:05:00.000Z", criadoPor: "usr-joao", unidadeId: "un-1" },
    ],
    bloqueios: [],
    manutencoes: [],
    reinspecoes: [],
  };

  const pdf = await createChecklistPdf(detail);
  const document = await getDocument({ data: new Uint8Array(pdf) }).promise;
  const page = await document.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map((item) => "str" in item ? item.str : "").join(" ");

  assert.match(text, /MOTORISTA/);
  assert.match(text, /Renato Motorista/);
  assert.match(text, /111\.222\.333-44/);
  assert.match(text, /AJUDANTE/);
  assert.match(text, /João Ajudante/);
  assert.match(text, /555\.666\.777-88/);
  assert.equal((text.match(/Assinado/g) || []).length, 2);
});
