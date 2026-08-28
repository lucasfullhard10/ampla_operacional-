import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, FileText, Loader2, Package, Upload, Users, X } from "lucide-react";
import type { Motorista, Rota, Veiculo } from "../types";
import { normalizeShipsDtKey, normalizeShipsVehicleNumber, type ShipsParsedTrip } from "../../shared/ships";

type Props = {
  open: boolean;
  rotas: Rota[];
  veiculos: Veiculo[];
  motoristas: Motorista[];
  onClose: () => void;
  onImported: (route: Rota) => void;
  onViewRoute: (route: Rota) => void;
};

const STATUS_OPTIONS = [
  "Aguardando Carregamento",
  "Em Carregamento",
  "Em Rota",
  "Em Descarga",
  "AG.DESCARGA",
  "Finalizada",
  "Cancelada",
  "Veículo Quebrado",
  "Retorno Base",
];

function vehicleCanBeUsed(vehicle: Veiculo): boolean {
  if (vehicle.status !== "Liberado" || vehicle.documentacaoStatus === "Pendente") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return [vehicle.licenciamentoVencimento, vehicle.seguroVencimento, vehicle.anttVencimento, vehicle.proximaManutencao]
    .filter(Boolean)
    .every((value) => new Date(String(value)) >= today);
}

function driverCanBeUsed(driver: Motorista): boolean {
  return (!driver.tipo || driver.tipo === "Motorista") && driver.statusFinal === "LIBERADO";
}

function formatDate(date: string): string {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function ShipsPdfImportModal({
  open,
  rotas,
  veiculos,
  motoristas,
  onClose,
  onImported,
  onViewRoute,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ShipsParsedTrip | null>(null);
  const [fileName, setFileName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [status, setStatus] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [vehicleMatchStatus, setVehicleMatchStatus] = useState<"matched" | "unavailable" | "not_found" | null>(null);

  const existingRoute = useMemo(() => {
    if (!parsed) return undefined;
    return rotas.find((route) => normalizeShipsDtKey(route.dt_normalizada || route.dt) === parsed.tripNoNormalized);
  }, [parsed, rotas]);
  const selectedVehicle = useMemo(() => veiculos.find((vehicle) => vehicle.id === vehicleId), [vehicleId, veiculos]);

  useEffect(() => {
    if (open) return;
    setParsed(null);
    setFileName("");
    setVehicleId("");
    setDriverId("");
    setStatus("");
    setParsing(false);
    setSubmitting(false);
    setError("");
    setVehicleMatchStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open]);

  if (!open) return null;

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setParsed(null);
    setFileName(file.name);
    setVehicleId("");
    setVehicleMatchStatus(null);
    if (file.size > 20 * 1024 * 1024) {
      setError("O PDF excede o limite de 20 MB.");
      return;
    }

    setParsing(true);
    try {
      // pdf.js is intentionally loaded only when the user selects a file so
      // the regular monitoring screen does not pay its bundle cost.
      const { ShipsPdfParser } = await import("../services/ShipsPdfParser");
      const result = await ShipsPdfParser.parse(file);
      setParsed(result);
      const registeredVehicle = veiculos.find(
        (vehicle) => normalizeShipsVehicleNumber(vehicle.placa) === result.vehicleNumber,
      );
      if (registeredVehicle && vehicleCanBeUsed(registeredVehicle)) {
        setVehicleId(registeredVehicle.id);
        setVehicleMatchStatus("matched");
      } else {
        setVehicleMatchStatus(registeredVehicle ? "unavailable" : "not_found");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível interpretar o PDF do Ships.");
    } finally {
      setParsing(false);
    }
  };

  const confirmImport = async () => {
    if (!parsed || existingRoute || !vehicleId || !driverId || !status || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/rotas/import-ships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed,
          vehicleId,
          driverId,
          status_viagem: status,
          fileName,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível importar a DT.");
      onImported(payload.route as Rota);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível importar a DT.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ships-import-title">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div>
            <h2 id="ships-import-title" className="flex items-center gap-2 text-sm font-bold text-white">
              <Upload className="h-4 w-4 text-sky-400" /> {parsed ? "Importação da DT" : "Importar PDF do Ships"}
            </h2>
            <p className="mt-1 text-[10px] font-mono text-slate-500">O arquivo é lido no navegador e só é salvo após sua confirmação.</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar importação">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
          <button
            type="button"
            disabled={parsing || submitting}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files?.[0]); }}
            className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-sky-500/40 bg-sky-500/5 px-4 py-7 text-center transition hover:border-sky-400 hover:bg-sky-500/10 disabled:opacity-60"
          >
            {parsing ? <Loader2 className="mb-2 h-7 w-7 animate-spin text-sky-400" /> : <FileText className="mb-2 h-7 w-7 text-sky-400" />}
            <span className="text-xs font-semibold text-slate-200">{parsing ? "Lendo o PDF..." : fileName || "Selecione ou arraste o PDF do Ships"}</span>
            <span className="mt-1 text-[10px] font-mono text-slate-500">PDF de até 20 MB</span>
          </button>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {parsed && (
            <>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {[
                  ["DT / Trip No", parsed.tripNo === parsed.tripNoNormalized ? parsed.tripNo : `${parsed.tripNo} (busca: ${parsed.tripNoNormalized})`],
                  ["Veículo no PDF", parsed.vehicleNumber],
                  ["Data / hora", `${formatDate(parsed.tripDate)} ${parsed.tripTime}`],
                  ["Delivery Orders", String(parsed.deliveries.length)],
                  ["Clientes únicos", String(parsed.uniqueCustomerCount)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <span className="block text-[9px] font-mono uppercase text-slate-500">{label}</span>
                    <strong className="mt-1 block text-xs text-slate-100">{value}</strong>
                  </div>
                ))}
              </div>

              {existingRoute && (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div>
                      <strong className="block text-xs text-amber-300">ATENÇÃO: Esta DT já está cadastrada no Sistema Ampla.</strong>
                      <span className="text-[10px] font-mono text-amber-200/70">A importação foi bloqueada para impedir duplicidade.</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => onViewRoute(existingRoute)} className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/10">
                    <Eye className="h-3.5 w-3.5" /> Visualizar DT
                  </button>
                </div>
              )}

              {parsed.warnings.map((warning) => (
                <div key={warning} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] font-mono text-amber-300">{warning}</div>
              ))}

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1.5 text-[10px] font-mono uppercase text-slate-400">
                  Veículo cadastrado
                  <select value={vehicleId} onChange={(event) => { setVehicleId(event.target.value); setVehicleMatchStatus(null); setDriverId(""); }} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs normal-case text-white outline-none focus:border-sky-500">
                    <option value="">Selecione o veículo</option>
                    {veiculos.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id} disabled={!vehicleCanBeUsed(vehicle)}>
                        {vehicle.placa} — {vehicle.modelo} {!vehicleCanBeUsed(vehicle) ? `(INDISPONÍVEL: ${vehicle.status})` : ""}
                      </option>
                    ))}
                  </select>
                  <span className={vehicleMatchStatus === "matched" ? "block normal-case text-emerald-400" : "block normal-case text-amber-400"}>
                    {vehicleMatchStatus === "matched"
                      ? "Veículo identificado automaticamente pela placa."
                      : vehicleMatchStatus === "unavailable"
                        ? "Veículo localizado, mas indisponível. Selecione outro veículo liberado."
                        : vehicleMatchStatus === "not_found"
                          ? "Veículo não localizado no cadastro. Selecione manualmente."
                          : "Confirme o veículo selecionado."}
                  </span>
                </label>

                <label className="space-y-1.5 text-[10px] font-mono uppercase text-slate-400">
                  Motorista
                  <select value={driverId} onChange={(event) => setDriverId(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs normal-case text-white outline-none focus:border-sky-500">
                    <option value="">Selecione o motorista</option>
                    {motoristas
                      .filter((driver) => (!driver.tipo || driver.tipo === "Motorista") && (!selectedVehicle || driver.unidadeId === selectedVehicle.unidadeId))
                      .map((driver) => (
                      <option key={driver.id} value={driver.id} disabled={!driverCanBeUsed(driver)}>
                        {driver.nome} {!driverCanBeUsed(driver) ? `(${driver.statusFinal})` : ""}
                      </option>
                    ))}
                  </select>
                  <span className="block normal-case text-slate-500">Seleção obrigatória; o PDF não define o motorista.</span>
                </label>

                <label className="space-y-1.5 text-[10px] font-mono uppercase text-slate-400">
                  Status inicial
                  <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs normal-case text-white outline-none focus:border-sky-500">
                    <option value="">Selecione o status</option>
                    {STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <span className="block normal-case text-slate-500">Definido manualmente antes da gravação.</span>
                </label>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-sky-300"><Package className="h-3.5 w-3.5" /> Pedidos encontrados</span>
                  <span className="flex items-center gap-1 text-[10px] text-purple-300"><Users className="h-3.5 w-3.5" /> {parsed.uniqueCustomerCount} clientes</span>
                </div>
                <table className="w-full min-w-[480px] text-left text-[10px] font-mono">
                  <thead className="bg-slate-950/60 text-slate-500 uppercase"><tr><th className="px-3 py-2">Seq.</th><th className="px-3 py-2">Delivery Order</th><th className="px-3 py-2">Customer ID</th><th className="px-3 py-2">Cliente</th></tr></thead>
                  <tbody className="divide-y divide-slate-850">
                    {parsed.deliveries.map((delivery) => (
                      <tr key={delivery.deliveryOrder} className="text-slate-300"><td className="px-3 py-2 text-slate-500">{delivery.sequencia}</td><td className="px-3 py-2 font-semibold text-sky-300">{delivery.deliveryOrder}</td><td className="px-3 py-2">{delivery.customerId}</td><td className="px-3 py-2 text-slate-400">{delivery.customerName || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-800 bg-slate-950 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={confirmImport} disabled={!parsed || Boolean(existingRoute) || !vehicleId || !driverId || !status || parsing || submitting} className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirmar importação
          </button>
        </footer>
      </div>
    </div>
  );
}
