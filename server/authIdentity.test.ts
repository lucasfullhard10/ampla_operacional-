import assert from "node:assert/strict";
import test from "node:test";
import type { Usuario } from "./database";
import { sessionMatchesClaimedUser } from "./authIdentity";

const supervisor = {
  id: "USR-SUPERVISOR",
  nome: "Supervisor da Operação",
  email: "supervisor@ampla.test",
  perfil: "admin_unidade",
  tipo_usuario: "SUPERVISOR",
  unidadeId: "unit-1",
  status: "ativo",
} as Usuario;

test("accepts the authenticated user's normalized login or id", () => {
  assert.equal(sessionMatchesClaimedUser(supervisor, "  SUPERVISOR@AMPLA.TEST "), true);
  assert.equal(sessionMatchesClaimedUser(supervisor, "usr-supervisor"), true);
});

test("rejects a stale screen claiming another user", () => {
  assert.equal(sessionMatchesClaimedUser(supervisor, "motorista@ampla.test"), false);
});

test("keeps compatibility with requests that do not claim a client user", () => {
  assert.equal(sessionMatchesClaimedUser(supervisor, undefined), true);
  assert.equal(sessionMatchesClaimedUser(supervisor, ""), true);
});
