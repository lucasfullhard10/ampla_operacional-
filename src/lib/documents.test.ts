import assert from "node:assert/strict";
import test from "node:test";
import { getDocumentReference } from "./documents.ts";

test("rejeita referências de documento vazias ou artificiais", () => {
  for (const value of [null, undefined, false, "", "   ", "null", "undefined", "false", "about:blank", "#", "Nenhum", "Simulacao_CNH_Digital.pdf", "CRLV_Atualizado_Assinado.pdf"]) {
    assert.equal(getDocumentReference(value), null);
  }
});

test("aceita URL, caminho de API, data URL e objetos com referência", () => {
  assert.equal(getDocumentReference("https://example.com/documento.pdf"), "https://example.com/documento.pdf");
  assert.equal(getDocumentReference("/api/documentos/123"), "/api/documentos/123");
  assert.equal(getDocumentReference("data:application/pdf;base64,QQ=="), "data:application/pdf;base64,QQ==");
  assert.equal(getDocumentReference({ arquivoUrl: "/arquivo.pdf" }), "/arquivo.pdf");
});
