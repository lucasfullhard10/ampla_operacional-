import assert from "node:assert/strict";
import test from "node:test";
import {
  getAvailabilityOperationalDriverId,
  resolveVehicleDriverLink
} from "./vehicleDriverLink.ts";

const joao = { id: "mot-joao", nome: "João", unidadeId: "un-go", tipo: "Motorista" };
const renato = { id: "mot-renato", nome: "Renato", unidadeId: "un-go", tipo: "Motorista" };
const drivers = [joao, renato];

test("veículo sem motorista oficial não herda escala antiga", () => {
  const vehicle = { motoristaId: "", unidadeId: "un-go" };
  assert.equal(resolveVehicleDriverLink(vehicle, drivers).message, "Nenhum motorista vinculado");
  assert.equal(getAvailabilityOperationalDriverId(vehicle, drivers), "");
});

test("vínculo oficial válido retorna exatamente o motorista pelo ID", () => {
  const result = resolveVehicleDriverLink({ motoristaId: joao.id, unidadeId: "un-go" }, drivers);
  assert.equal(result.status, "linked");
  assert.equal(result.driver?.nome, "João");
});

test("remoção do motorista passa imediatamente ao estado sem vínculo", () => {
  const vehicle = { motoristaId: joao.id, unidadeId: "un-go" };
  vehicle.motoristaId = "";
  assert.equal(resolveVehicleDriverLink(vehicle, drivers).status, "none");
});

test("motorista histórico permanece no registro operacional sem virar vínculo atual", () => {
  const vehicle = { motoristaId: "", unidadeId: "un-go" };
  const oldOperation = { motoristaId: renato.id };
  assert.equal(getAvailabilityOperationalDriverId(vehicle, drivers, oldOperation), renato.id);
  assert.equal(resolveVehicleDriverLink(vehicle, drivers).status, "none");
});

test("nova disponibilidade não copia motorista de disponibilidade anterior", () => {
  const vehicle = { motoristaId: "", unidadeId: "un-go" };
  assert.equal(getAvailabilityOperationalDriverId(vehicle, drivers, null), "");
});

test("alterar a escala operacional não modifica o vínculo permanente", () => {
  const vehicle = { motoristaId: joao.id, unidadeId: "un-go" };
  const operation = { motoristaId: renato.id };
  assert.equal(getAvailabilityOperationalDriverId(vehicle, drivers, operation), renato.id);
  assert.equal(vehicle.motoristaId, joao.id);
});

test("ID inexistente é sinalizado e nunca substituído por outro motorista", () => {
  const result = resolveVehicleDriverLink({ motoristaId: "mot-inexistente", unidadeId: "un-go" }, drivers);
  assert.equal(result.status, "invalid_driver");
  assert.equal(result.message, "Vínculo inválido — motorista não encontrado");
  assert.equal(result.driver, null);
});

test("vínculo entre unidades diferentes é sinalizado", () => {
  const result = resolveVehicleDriverLink(
    { motoristaId: joao.id, unidadeId: "un-sp" },
    drivers
  );
  assert.equal(result.status, "unit_mismatch");
});
