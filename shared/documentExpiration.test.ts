import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyExpirationDays,
  differenceInOperationalCalendarDays,
  EXPIRATION_ALERT_WINDOW_DAYS,
} from "./documentExpiration.ts";

const reference = new Date("2026-08-16T15:00:00.000Z");

test("calcula dias por calendário operacional sem deslocamento de timezone", () => {
  assert.equal(differenceInOperationalCalendarDays("2026-08-17", reference), 1);
  assert.equal(differenceInOperationalCalendarDays("2026-08-16", reference), 0);
  assert.equal(differenceInOperationalCalendarDays("2026-08-11", reference), -5);
});

test("aplica a janela corporativa inclusiva de 40 dias", () => {
  assert.equal(EXPIRATION_ALERT_WINDOW_DAYS, 40);
  assert.equal(classifyExpirationDays(40), "VENCIMENTO_PROXIMO");
  assert.equal(classifyExpirationDays(41), "REGULAR");
  assert.equal(classifyExpirationDays(0), "VENCE_HOJE");
  assert.equal(classifyExpirationDays(-5), "VENCIDO");
});

test("ignora datas vazias, artificiais ou inválidas", () => {
  assert.equal(differenceInOperationalCalendarDays("", reference), null);
  assert.equal(differenceInOperationalCalendarDays("Pendente", reference), null);
  assert.equal(differenceInOperationalCalendarDays("2026-02-31", reference), null);
});
