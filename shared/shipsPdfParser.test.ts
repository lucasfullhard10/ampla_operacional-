import assert from "node:assert/strict";
import test from "node:test";
import {
  groupShipsPdfPageItems,
  isShipsPdfFileDescriptor,
  normalizeShipsExtractedText,
  parseShipsPdfLines,
  parseShipsPdfText,
  parseShipsTripDate,
  type ShipsPdfPositionedTextItem,
} from "./shipsPdfParser.ts";

const shipsText = `
Trip No: 0012688623
Vehicle Number: REF9E90
Vendor: AMPLA
Trip Date: Friday, August 28, 2026 7:43 AM
Trip Type: Delivery
Vehicle Type: Truck
Vehicle Make: VW
Sr No. Secondary Trip No. Delivery Order Customer ID Customer Name
1 0012688623 8080635859 0002615081 CLIENTE UM
2 0012688623 8080636746 0002694130 CLIENTE DOIS
3 0012688623 8080635856 0002266737 0002266737
4 0012688623 8080636366 0002266737 0002266737
`;

test("interpreta cabeçalho, data, horário e placa do PDF do Ships", () => {
  const parsed = parseShipsPdfText(shipsText);
  assert.equal(parsed.tripNo, "0012688623");
  assert.equal(parsed.tripNoNormalized, "12688623");
  assert.equal(parsed.vehicleNumber, "REF9E90");
  assert.equal(parsed.tripDate, "2026-08-28");
  assert.equal(parsed.tripTime, "07:43");
});

test("aceita rótulos e valores extraídos em linhas separadas", () => {
  const parsed = parseShipsPdfText(`
Trip No:
0012688623
Vehicle Number:
REF9E90
Trip Date:
Friday, August 28, 2026 7:43 AM
Delivery Order Customer ID
8080635859 0002615081 CLIENTE UM`);

  assert.equal(parsed.tripNo, "0012688623");
  assert.equal(parsed.vehicleNumber, "REF9E90");
  assert.equal(parsed.tripTime, "07:43");
});

test("extrai o cabeçalho real quando vários campos ocupam a mesma linha interna", () => {
  const parsed = parseShipsPdfLines([
    { page: 1, text: "Trip No : 0012688623 Vehicle Number: REF9E90 Vendor: Ampla Service Grupo Ltda." },
    { page: 1, text: "Trip Date: Friday, August 28, 2026 7:43 AM Trip Type: Delivery" },
    { page: 1, text: "Sr No. Secondary Trip No. Delivery Order Customer ID Customer Name" },
    { page: 1, text: "1 0012688623 8080635859 0002615081 CLIENTE UM" },
  ]);

  assert.equal(parsed.tripNo, "0012688623");
  assert.ok(parsed.vehicleNumber, "Vehicle Number não pode ser nulo ou indefinido");
  assert.equal(parsed.vehicleNumber, "REF9E90");
  assert.equal(parsed.tripDate, "2026-08-28");
  assert.equal(parsed.tripTime, "07:43");
});

test("recompõe labels fragmentados em spans, NBSP e caracteres invisíveis", () => {
  const parsed = parseShipsPdfLines([
    { page: 1, text: "Trip\u200B" },
    { page: 1, text: "Number\u00A0 :" },
    { page: 1, text: "0012688623" },
    { page: 1, text: "VEHICLE" },
    { page: 1, text: "NUMBER\u00A0:" },
    { page: 1, text: "REF9E90" },
    { page: 1, text: "Trip" },
    { page: 1, text: "Date:" },
    { page: 1, text: "Friday,\tAugust 28, 2026 7:43 AM" },
    { page: 1, text: "Delivery Order Customer ID" },
    { page: 1, text: "8080635859 0002615081 CLIENTE UM" },
  ]);

  assert.equal(parsed.tripNo, "0012688623");
  assert.equal(parsed.vehicleNumber, "REF9E90");
  assert.equal(parsed.tripTime, "07:43");
  assert.equal(normalizeShipsExtractedText(" Vehicle\u00A0 Num\u200Eber \u200B :  REF9E90 "), "Vehicle Number:REF9E90");
});

test("procura o cabeçalho nas páginas seguintes quando a primeira não o contém", () => {
  const parsed = parseShipsPdfLines([
    { page: 1, text: "Relatório de viagem Ships" },
    { page: 2, text: "Trip No: 0012688623 Vehicle Number: REF9E90" },
    { page: 2, text: "Trip Date: Friday, August 28, 2026 7:43 AM" },
    { page: 2, text: "Delivery Order Customer ID" },
    { page: 2, text: "8080635859 0002615081 CLIENTE UM" },
  ]);

  assert.equal(parsed.tripNo, "0012688623");
  assert.equal(parsed.vehicleNumber, "REF9E90");
});

test("aceita as quatro variações textuais de Vehicle Number", () => {
  const variants = [
    ["Vehicle Number: REF9E90"],
    ["Vehicle Number:", "REF9E90"],
    ["Vehicle", "Number:", "REF9E90"],
    ["Vehicle   Number :   REF9E90"],
  ];

  for (const vehicleLines of variants) {
    const parsed = parseShipsPdfLines([
      "Trip No: 0012688623",
      ...vehicleLines,
      "Trip Date: Friday, August 28, 2026 7:43 AM",
      "Delivery Order Customer ID",
      "8080635859 0002615081 CLIENTE UM",
    ]);
    assert.equal(parsed.vehicleNumber, "REF9E90");
  }
});

test("usa coordenadas quando a ordem textual separa visualmente Vehicle e Number", () => {
  const parsed = parseShipsPdfLines(
    [
      { page: 1, text: "Trip No: 0012688623" },
      { page: 1, text: "Vehicle" },
      { page: 1, text: "Vendor: Ampla Service Grupo Ltda." },
      { page: 1, text: "Number:" },
      { page: 1, text: "ABC-1D23" },
      { page: 1, text: "Trip Date: Friday, August 28, 2026 7:43 AM" },
      { page: 1, text: "Delivery Order Customer ID" },
      { page: 1, text: "8080635859 0002615081 CLIENTE UM" },
    ],
    [
      { page: 1, text: "Vehicle", x: 100, y: 700, width: 42, height: 10 },
      { page: 1, text: "Number:", x: 148, y: 700, width: 46, height: 10 },
      { page: 1, text: "ABC-1D23", x: 225, y: 700, width: 58, height: 10 },
      { page: 1, text: "Vendor: Ampla Service Grupo Ltda.", x: 100, y: 675, width: 180, height: 10 },
    ],
  );

  assert.equal(parsed.vehicleNumber, "ABC-1D23");
});

test("reconhece outras placas sem hardcode", () => {
  for (const vehicleNumber of ["XYZ1234", "QWE-8R76", "TRK90876"]) {
    const parsed = parseShipsPdfText(`
Trip Number: 0012688623
Vehicle Number: ${vehicleNumber}
Trip Date: Friday, August 28, 2026 7:43 AM
Delivery Order Customer ID
8080635859 0002615081 CLIENTE UM`);
    assert.equal(parsed.vehicleNumber, vehicleNumber);
  }
});

test("produz o mesmo resultado com o mesmo conteúdo e nomes de arquivo diferentes", () => {
  const fileNames = ["reports.pdf", "NWQ6602 ENTREGA.pdf", "arquivo-teste.pdf", "ROTA MANHÃ.pdf"];
  const parsedByFileName = fileNames.map((name) => {
    assert.equal(isShipsPdfFileDescriptor({ name, type: "application/pdf" }), true);
    return parseShipsPdfText(shipsText);
  });

  for (const parsed of parsedByFileName.slice(1)) {
    assert.deepEqual(parsed, parsedByFileName[0]);
  }
});

test("reconstrói palavras quando o PDF.js retorna uma letra por TextItem", () => {
  const items: ShipsPdfPositionedTextItem[] = [];
  let x = 100;
  for (const segment of ["Vehicle", "Number:", "NWQ6602"]) {
    for (const character of segment) {
      items.push({ page: 1, text: character, x, y: 700, width: 5, height: 10 });
      x += 5;
    }
    x += 8;
  }

  const reconstructedVehicleLine = groupShipsPdfPageItems(items, 1);
  assert.equal(reconstructedVehicleLine[0].text, "Vehicle Number:NWQ6602");

  const parsed = parseShipsPdfLines(
    [
      { page: 1, text: "Trip No: 0012688623" },
      ...reconstructedVehicleLine,
      { page: 1, text: "Trip Date: Friday, August 28, 2026 7:43 AM" },
      { page: 1, text: "Delivery Order Customer ID" },
      { page: 1, text: "8080635859 0002615081 CLIENTE UM" },
    ],
    items,
  );

  assert.equal(parsed.vehicleNumber, "NWQ6602");
});

test("interpreta o layout real do reports.pdf com cabeçalho em duas linhas e Secondary Trip vazio", () => {
  const lines = [
    { page: 1, text: "Vehicle Trip Friday, August 28, 2026 8:15" },
    { page: 1, text: "Trip No:0012688621 NWQ6602 Vendor:Ampla Service Grupo Ltda." },
    { page: 1, text: "Number:Date:AM" },
    { page: 1, text: "Sr Secondary Delivery Customer" },
    { page: 1, text: "Customer ID Area Article No Article Description Qty Box Remarks" },
    { page: 1, text: "No. Trip No. Order Name" },
    { page: 1, text: "1 8080636680 0002203432 0002203432" },
    { page: 1, text: "2 8080636847 0002203432 0002203432" },
    { page: 1, text: "3 8080637113 0002203432 0002203432" },
  ];
  const positionedItems: ShipsPdfPositionedTextItem[] = [
    { page: 1, text: "Vehicle", x: 144.677, y: 515.76, width: 39.519, height: 9.605 },
    { page: 1, text: "Number:", x: 144.677, y: 504.355, width: 46.821, height: 9.605 },
    { page: 1, text: "NWQ6602", x: 240.729, y: 510.358, width: 48.618, height: 9.605 },
    { page: 1, text: "Trip", x: 609.926, y: 515.76, width: 21.396, height: 9.605 },
    { page: 1, text: "Date:", x: 609.926, y: 504.355, width: 29, height: 9.605 },
    { page: 1, text: "Friday, August 28, 2026 8:15", x: 670.558, y: 515.76, width: 139.839, height: 9.605 },
    { page: 1, text: "AM", x: 670.558, y: 504.355, width: 14, height: 9.605 },
  ];

  const parsed = parseShipsPdfLines(lines, positionedItems);

  assert.equal(parsed.tripNo, "0012688621");
  assert.equal(parsed.vehicleNumber, "NWQ6602");
  assert.equal(parsed.tripDate, "2026-08-28");
  assert.equal(parsed.tripTime, "08:15");
  assert.deepEqual(parsed.deliveries.map((delivery) => delivery.deliveryOrder), [
    "8080636680",
    "8080636847",
    "8080637113",
  ]);
  assert.equal(parsed.uniqueCustomerCount, 1);
  assert.ok(parsed.deliveries.every((delivery) => delivery.customerId === "0002203432"));
});

test("conta pedidos e clientes separadamente, mantendo cliente repetido", () => {
  const parsed = parseShipsPdfText(shipsText);
  assert.equal(parsed.deliveries.length, 4);
  assert.equal(parsed.uniqueCustomerCount, 3);
  assert.deepEqual(
    parsed.deliveries.filter((delivery) => delivery.customerId === "0002266737").map((delivery) => delivery.deliveryOrder),
    ["8080635856", "8080636366"],
  );
  assert.equal(parsed.deliveries[2].customerName, "0002266737");
});

test("mantém os 27 pedidos e conta 25 clientes no cenário de referência", () => {
  const rows = Array.from({ length: 27 }, (_, index) => {
    const customerIndex = index >= 25 ? 24 : index;
    return `${index + 1} 0012688623 ${String(8080635800 + index)} ${String(2266700 + customerIndex).padStart(10, "0")} CLIENTE ${customerIndex + 1}`;
  }).join("\n");
  const parsed = parseShipsPdfText(`
Trip No: 0012688623
Vehicle Number: REF9E90
Trip Date: Friday, August 28, 2026 7:43 AM
Sr No. Secondary Trip No. Delivery Order Customer ID Customer Name
${rows}`);

  assert.equal(parsed.deliveries.length, 27);
  assert.equal(parsed.uniqueCustomerCount, 25);
});

test("ignora Delivery Order repetido dentro da mesma DT", () => {
  const parsed = parseShipsPdfText(`${shipsText}\n5 0012688623 8080635859 0009999999 CLIENTE REPETIDO`);
  assert.equal(parsed.deliveries.length, 4);
  assert.equal(parsed.warnings.length, 1);
});

test("converte corretamente meio-dia e meia-noite", () => {
  assert.deepEqual(parseShipsTripDate("Friday, August 28, 2026 12:03 AM"), { date: "2026-08-28", time: "00:03" });
  assert.deepEqual(parseShipsTripDate("Friday, August 28, 2026 12:03 PM"), { date: "2026-08-28", time: "12:03" });
});

test("rejeita arquivo sem pedidos válidos", () => {
  assert.throws(
    () => parseShipsPdfText("Trip No: 0012688623\nVehicle Number: REF9E90\nTrip Date: Friday, August 28, 2026 7:43 AM"),
    /Nenhum Delivery Order/,
  );
});
