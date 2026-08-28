import assert from "node:assert/strict";
import test from "node:test";
import {
  countUniqueShipsCustomers,
  normalizeShipsDtKey,
  normalizeShipsVehicleNumber,
  sanitizeShipsDeliveries,
} from "./ships.ts";

test("normaliza DTs numéricas com zeros à esquerda", () => {
  assert.equal(normalizeShipsDtKey("DT-0012688623"), "12688623");
  assert.equal(normalizeShipsDtKey("AB-001"), "AB-001");
});

test("compara placas sem pontuação, espaços ou diferença de caixa", () => {
  assert.equal(normalizeShipsVehicleNumber("ref-9e90"), "REF9E90");
  assert.equal(normalizeShipsVehicleNumber(" REF 9E90 "), "REF9E90");
});

test("sanitiza pedidos, remove repetidos e preserva clientes repetidos", () => {
  const deliveries = sanitizeShipsDeliveries([
    { deliveryOrder: "8080635859", customerId: "0002615081", customerName: "Cliente Um" },
    { deliveryOrder: "8080635859", customerId: "0009999999" },
    { deliveryOrder: "8080636746", customerId: "0002615081" },
    { deliveryOrder: "inválido", customerId: "" },
  ]);

  assert.equal(deliveries.length, 2);
  assert.equal(deliveries[0].sequencia, 1);
  assert.equal(deliveries[1].sequencia, 2);
  assert.equal(countUniqueShipsCustomers(deliveries), 1);
});
