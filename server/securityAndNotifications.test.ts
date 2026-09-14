import assert from "node:assert/strict";
import test from "node:test";

import type { Usuario, UsuarioUnidadePermissao } from "./database.ts";
import {
  canUseExistingSession,
  getActiveFieldLinkConflict,
  hashPassword,
  normalizeLogin,
  requiresPasswordChange,
  validatePasswordPolicy,
  verifyPassword,
} from "./authSecurity.ts";
import { SessionStore } from "./sessionStore.ts";
import {
  buildChecklistNotifications,
  getChecklistFinalNotificationTypes,
  mergeChecklistNotifications,
  selectChecklistNotificationRecipients,
} from "./checklistNotifications.ts";
import type { ChecklistVeiculo } from "../shared/weeklyChecklist.ts";

const user = (changes: Partial<Usuario>): Usuario => ({
  id: "usr-default",
  email: "default",
  nome: "Usuário",
  perfil: "operador",
  unidadeId: "un-1",
  status: "ativo",
  tipo_usuario: "OPERADOR",
  ...changes,
});

const checklist = (changes: Partial<ChecklistVeiculo> = {}): ChecklistVeiculo => ({
  id: "chk-1",
  veiculoId: "vei-1",
  unidadeId: "un-1",
  motoristaId: "mot-renato",
  motoristaNomeSnapshot: "Renato dos Santos",
  motoristaCpfSnapshot: "000",
  ajudanteIdsSnapshot: ["aju-1"],
  ajudanteNomesSnapshot: ["Paulo Ajudante"],
  placaSnapshot: "REF9E90",
  veiculoModeloSnapshot: "Caminhão",
  unidadeNomeSnapshot: "Unidade 1",
  origemMotorista: "ROTA_ATIVA",
  dataChecklist: "2026-09-01",
  dataInicioSemana: "2026-08-31",
  dataFimSemana: "2026-09-06",
  ano: 2026,
  identificadorSemana: "2026-08-31_2026-09-06",
  versaoChecklist: "v1",
  status: "CONFORME",
  resultado: "CONFORME",
  possuiNaoConformidade: false,
  possuiNaoConformidadeCritica: false,
  bloqueouVeiculo: false,
  responsavelId: "usr-renato",
  responsavelNomeSnapshot: "Renato dos Santos",
  protocolo: "CHK-2026-000001",
  criadoEm: "2026-09-01T10:00:00.000Z",
  atualizadoEm: "2026-09-01T11:00:00.000Z",
  finalizadoEm: "2026-09-01T11:00:00.000Z",
  ...changes,
});

test("login é normalizado e continua independente do ID/vínculo interno", () => {
  const renato = user({ id: "usr-renato-stable", email: " Renato.Santos ", motoristaId: "mot-renato" });
  const updated = { ...renato, email: normalizeLogin(" NOVO.Login ") };
  assert.equal(updated.email, "novo.login");
  assert.equal(updated.id, "usr-renato-stable");
  assert.equal(updated.motoristaId, "mot-renato");
});

test("redefinição substitui o hash e a senha antiga deixa de funcionar", () => {
  const credentials = { senhaHash: hashPassword("Antiga123") };
  assert.equal(verifyPassword("Antiga123", credentials), true);
  credentials.senhaHash = hashPassword("NovaSenha456");
  assert.equal(verifyPassword("Antiga123", credentials), false);
  assert.equal(verifyPassword("NovaSenha456", credentials), true);
  assert.deepEqual(validatePasswordPolicy("fraca"), ["A senha deve possuir pelo menos 8 caracteres.", "A senha deve conter pelo menos um número."]);
});

test("troca obrigatória é detectada e conta bloqueada não pode manter sessão", () => {
  assert.equal(requiresPasswordChange(user({ mustChangePassword: true })), true);
  assert.equal(canUseExistingSession(user({ bloqueado: true })), false);
  assert.equal(canUseExistingSession(user({ status: "inativo" })), false);
});

test("redefinir senha ou bloquear permite revogar todas as sessões do usuário", () => {
  const sessions = new SessionStore(60_000);
  sessions.issue("usr-renato", "token-1", 0);
  sessions.issue("usr-renato", "token-2", 0);
  sessions.issue("usr-outro", "token-3", 0);
  assert.equal(sessions.revokeUser("usr-renato"), 2);
  assert.equal(sessions.get("token-1"), undefined);
  assert.equal(sessions.get("token-3")?.userId, "usr-outro");
});

test("não permite dois usuários ativos para o mesmo motorista ou ajudante", () => {
  const users = [
    user({ id: "usr-renato", tipo_usuario: "MOTORISTA", motoristaId: "mot-renato" }),
    user({ id: "usr-joao", tipo_usuario: "AJUDANTE", ajudanteId: "aju-joao" }),
  ];
  assert.equal(getActiveFieldLinkConflict({ users, type: "MOTORISTA", linkId: "mot-renato" }), "Este motorista já possui um usuário ativo de acesso ao sistema.");
  assert.equal(getActiveFieldLinkConflict({ users, type: "AJUDANTE", linkId: "aju-joao" }), "Este ajudante já possui um usuário ativo de acesso ao sistema.");
  assert.equal(getActiveFieldLinkConflict({ users, type: "MOTORISTA", linkId: "mot-renato", resultingStatus: "inativo" }), null);
});

test("superior da unidade e MASTER recebem; outra unidade sem permissão não recebe", () => {
  const users = [
    user({ id: "sup-1", email: "sup1", nome: "Supervisor 1", perfil: "admin_unidade", tipo_usuario: "SUPERVISOR", unidadeId: "un-1" }),
    user({ id: "sup-2", email: "sup2", nome: "Supervisor 2", perfil: "admin_unidade", tipo_usuario: "SUPERVISOR", unidadeId: "un-2" }),
    user({ id: "gestor", email: "gestor", nome: "Gestor", tipo_usuario: "GESTOR_OPERACIONAL", unidadeId: "un-2" }),
    user({ id: "master", email: "master", nome: "Master", perfil: "admin_master", tipo_usuario: "MASTER", unidadeId: "Todas" }),
  ];
  const permissions: UsuarioUnidadePermissao[] = [{ id: "p1", usuario_id: "gestor", unidade_id: "un-1", ativo: true, created_at: "2026-09-01" }];
  const recipients = selectChecklistNotificationRecipients(users, permissions, "un-1").map((item) => item.id);
  assert.deepEqual(recipients.sort(), ["gestor", "master", "sup-1"]);
  assert.equal(recipients.includes("sup-2"), false);
});

test("checklist crítico gera notificação urgente, bloqueio e chave idempotente", () => {
  const critical = checklist({ status: "BLOQUEADO", resultado: "BLOQUEADO", possuiNaoConformidade: true, possuiNaoConformidadeCritica: true, bloqueouVeiculo: true });
  const types = getChecklistFinalNotificationTypes(critical);
  assert.deepEqual(types, ["CHECKLIST_CRITICO", "VEICULO_BLOQUEADO"]);
  const recipient = user({ id: "sup-1", email: "sup1", perfil: "admin_unidade", tipo_usuario: "SUPERVISOR" });
  const generated = buildChecklistNotifications({ checklist: critical, recipients: [recipient], types, actorName: "Renato dos Santos", eventAt: critical.finalizadoEm! });
  assert.equal(generated.every((item) => item.severidade === "URGENTE"), true);
  assert.equal(generated[0].checklistId, critical.id);
  assert.equal(generated[0].mensagem.includes("REF9E90"), true);
  assert.equal(mergeChecklistNotifications(generated, generated).length, generated.length);
});

