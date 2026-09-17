import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
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
      observacoes: [{ id: "obs-1", texto: "Pequeno risco na lateral direita, sem impacto operacional.", autorId: "usr-renato", autorNome: "Renato Motorista", criadoEm: "2026-09-09T10:06:00.000Z", fotoAnexoId: "photo-obs" }],
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
    respostas: Array.from({ length: 22 }, (_, index) => ({
      id: `response-${index}`,
      checklistId: "chk-pdf",
      itemTemplateId: `item-${index}`,
      codigoSnapshot: `ITEM-${index + 1}`,
      categoriaSnapshot: "Segurança operacional",
      descricaoSnapshot: index % 4 === 0
        ? "Descrição longa para validar a quebra de linha sem invadir a coluna de resultado ou a margem direita da página."
        : `Item de inspeção ${index + 1}`,
      ordemSnapshot: index + 1,
      obrigatorioSnapshot: true,
      criticidadeSnapshot: "NORMAL",
      permiteNASnapshot: false,
      exigeObservacaoSnapshot: false,
      exigeFotoSnapshot: false,
      exigeAcaoCorretivaSnapshot: false,
      bloqueiaVeiculoSnapshot: false,
      resposta: "CONFORME",
      respondidoPor: "usr-renato",
      respondidoEm: "2026-09-09T10:04:00.000Z",
    })),
    anexos: [
      { id: "sig-driver", checklistId: "chk-pdf", participanteId: "chp-driver", tipo: "ASSINATURA", nome: "motorista.png", mimeType: "image/png", dataUrl: onePixelPng, criadoEm: "2026-09-09T10:04:00.000Z", criadoPor: "usr-renato", unidadeId: "un-1" },
      { id: "sig-helper", checklistId: "chk-pdf", participanteId: "chp-helper", tipo: "ASSINATURA", nome: "ajudante.png", mimeType: "image/png", dataUrl: onePixelPng, criadoEm: "2026-09-09T10:05:00.000Z", criadoPor: "usr-joao", unidadeId: "un-1" },
      ...(["DIREITA", "ESQUERDA", "FRENTE", "TRASEIRA"] as const).map((posicaoVeiculo) => ({ id: `photo-${posicaoVeiculo}`, checklistId: "chk-pdf", posicaoVeiculo, tipo: "FOTO_VEICULO" as const, nome: `${posicaoVeiculo}.png`, mimeType: "image/png", dataUrl: onePixelPng, criadoEm: "2026-09-09T10:04:00.000Z", criadoPor: "usr-renato", unidadeId: "un-1" })),
      { id: "photo-obs", checklistId: "chk-pdf", observacaoId: "obs-1", tipo: "FOTO_OBSERVACAO", nome: "observacao.png", mimeType: "image/png", dataUrl: onePixelPng, criadoEm: "2026-09-09T10:06:00.000Z", criadoPor: "usr-renato", unidadeId: "un-1" },
    ],
    bloqueios: [],
    manutencoes: [],
    reinspecoes: [],
  };

  const pdf = await createChecklistPdf(detail);
  if (process.env.CHECKLIST_PDF_SAMPLE_PATH) writeFileSync(process.env.CHECKLIST_PDF_SAMPLE_PATH, pdf);
  const document = await getDocument({ data: new Uint8Array(pdf) }).promise;
  const pages = await Promise.all(Array.from({ length: document.numPages }, (_, index) => document.getPage(index + 1)));
  const contents = await Promise.all(pages.map((page) => page.getTextContent()));
  const text = contents.flatMap((content) => content.items).map((item) => "str" in item ? item.str : "").join(" ");

  assert.match(text, /MOTORISTA/);
  assert.match(text, /Renato Motorista/);
  assert.match(text, /111\.222\.333-44/);
  assert.match(text, /AJUDANTE/);
  assert.match(text, /João Ajudante/);
  assert.match(text, /555\.666\.777-88/);
  assert.equal((text.match(/Assinado/g) || []).length, 2);
  assert.match(text, /Pequeno risco na lateral direita/);
  assert.match(text, /Adendo posterior à conclusão/);
  assert.match(text, /Veículo - lado direito/);
  assert.match(text, /Veículo - lado esquerdo/);
  assert.match(text, /Veículo - frente/);
  assert.match(text, /Veículo - parte de trás/);
  assert.match(text, /Foto da observação/);
  assert.ok(document.numPages >= 2, "O cenário extenso deve validar a paginação automática");
  for (let index = 0; index < pages.length; index += 1) {
    const width = pages[index].view[2];
    const pageText = contents[index].items.map((item) => "str" in item ? item.str : "").join(" ");
    assert.match(pageText, /SISTEMA AMPLA/, `Cabeçalho ausente na página ${index + 1}`);
    for (const item of contents[index].items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      assert.ok(x >= 35, `Texto fora da margem esquerda na página ${index + 1}: ${item.str}`);
      assert.ok(x + item.width <= width - 34, `Texto cortado na margem direita na página ${index + 1}: ${item.str}`);
      assert.ok(y >= 40 && y <= 820, `Texto fora da área vertical segura na página ${index + 1}: ${item.str}`);
    }
  }
});
