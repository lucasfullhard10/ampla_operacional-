import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileDown, History, Save, X } from "lucide-react";
import { toPng } from "html-to-image";
import type { Motorista, Rota, Unidade, Veiculo } from "../types";
import { getOperationalRouteTotals } from "../../shared/shipsComplement";

type Props = { routes: Rota[]; vehicles: Veiculo[]; drivers: Motorista[]; units: Unidade[]; userEmail: string; onClose: () => void };
type Snapshot = { id: string; unidade: string; unidadeId: string; dataReferencia: string; criadoEm: string; criadoPor: string; rotasSnapshot: any[] };
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function HeinekenReportModal({ routes, vehicles, drivers, units, userEmail, onClose }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState("");
  const [unitId, setUnitId] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [showFinished, setShowFinished] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(routes.map((route) => route.id)));
  const [returns, setReturns] = useState<any[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historical, setHistorical] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const headers = { "Content-Type": "application/json", "x-user-email": userEmail };
  const loadHistory = () => fetch("/api/reportes/heineken", { headers }).then(async (response) => response.ok && setHistory(await response.json())).catch(() => undefined);
  useEffect(() => {
    fetch("/api/devolucoes/registros", { headers }).then(async (response) => response.ok && setReturns(await response.json())).catch(() => undefined);
    void loadHistory();
  }, []);

  const filtered = useMemo(() => routes.filter((route) => {
    const routeStatus = route.status_viagem || route.status;
    return (!date || route.data === date) && (!unitId || route.unidadeId === unitId) && (!status || routeStatus === status) && (!type || route.tipo === type) && (showFinished || routeStatus !== "Finalizada");
  }), [routes, date, unitId, status, type, showFinished]);

  const currentRows = useMemo(() => filtered.filter((route) => selected.has(route.id)).map((route) => {
    const totals = getOperationalRouteTotals(route);
    const effectiveReturns = returns.filter((item) => item.rotaId === route.id && item.status !== "Cancelada" && (item.geraDevolucao === true || (item.geraDevolucao === undefined && item.resolvido !== "SIM")));
    return { rotaId: route.id, dt: route.dt, veiculo: vehicles.find((item) => item.id === route.veiculoId)?.placa || route.shipsVehicleNumber || "N/D", motorista: drivers.find((item) => item.id === route.motoristaId)?.nome || "N/D", tipo: route.tipo, destino: route.cidadeDestino || route.clienteCidade || "—", ...totals, devolucoes: effectiveReturns.length || totals.devolucoes, status: route.status_viagem || route.status };
  }), [filtered, selected, returns, vehicles, drivers]);
  const rows = historical?.rotasSnapshot || currentRows;
  const reportUnit = historical?.unidade || (unitId ? units.find((unit) => unit.id === unitId)?.nome : "Todas as unidades visíveis") || "AMPLA";
  const reportDate = historical?.dataReferencia || date || new Date().toISOString().slice(0, 10);
  const reportTime = historical?.criadoEm || new Date().toISOString();

  const selectVisible = () => setSelected(new Set(filtered.map((route) => route.id)));
  const generateImage = async () => {
    if (!reportRef.current) return;
    setBusy(true); setMessage("");
    try { const dataUrl = await toPng(reportRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#07110d" }); const link = document.createElement("a"); link.href = dataUrl; link.download = `reporte-heineken-${reportDate}.png`; link.click(); setMessage("Imagem gerada com sucesso."); }
    catch { setMessage("Falha ao gerar a imagem."); } finally { setBusy(false); }
  };
  const generatePdf = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/reportes/heineken/pdf", { method: "POST", headers, body: JSON.stringify(historical ? { snapshotId: historical.id } : { routeIds: currentRows.map((row) => row.rotaId), dataReferencia: reportDate }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Falha ao gerar PDF.");
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `reporte-heineken-${reportDate}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000); setMessage("PDF gerado com sucesso.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Falha ao gerar PDF."); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/reportes/heineken", { method: "POST", headers, body: JSON.stringify({ routeIds: currentRows.map((row) => row.rotaId), dataReferencia: reportDate, filtros: { date, unitId, status, type, showFinished } }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Falha ao salvar."); setHistorical(payload); await loadHistory(); setMessage("Snapshot imutável salvo.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Falha ao salvar."); } finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/95 p-4"><div className="mx-auto max-w-7xl space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"><div><h2 className="text-base font-bold text-white">Reporte Heineken</h2><p className="text-[10px] text-slate-500">Área limpa e própria para compartilhamento; sem controles administrativos na captura.</p></div><button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></header>
    {!historical && <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs md:grid-cols-6"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded border border-slate-700 bg-slate-950 p-2 text-white" /><select value={unitId} onChange={(event) => setUnitId(event.target.value)} className="rounded border border-slate-700 bg-slate-950 p-2 text-white"><option value="">Todas unidades</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.nome}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border border-slate-700 bg-slate-950 p-2 text-white"><option value="">Todos status</option>{[...new Set(routes.map((route) => route.status_viagem || route.status))].map((item) => <option key={item}>{item}</option>)}</select><select value={type} onChange={(event) => setType(event.target.value)} className="rounded border border-slate-700 bg-slate-950 p-2 text-white"><option value="">Todos tipos</option>{[...new Set(routes.map((route) => route.tipo))].map((item) => <option key={item}>{item}</option>)}</select><label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 p-2 text-slate-300"><input type="checkbox" checked={showFinished} onChange={(event) => setShowFinished(event.target.checked)} />Mostrar finalizadas</label><button type="button" onClick={selectVisible} className="rounded bg-sky-600 p-2 font-bold text-white">Todas as rotas visíveis</button><div className="md:col-span-6 flex max-h-24 flex-wrap gap-1 overflow-y-auto">{filtered.map((route) => <label key={route.id} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-300"><input className="mr-1" type="checkbox" checked={selected.has(route.id)} onChange={(event) => setSelected((previous) => { const next = new Set(previous); event.target.checked ? next.add(route.id) : next.delete(route.id); return next; })} />DT {route.dt}</label>)}</div></div>}

    <div ref={reportRef} className="min-w-[960px] rounded-2xl border border-emerald-500/25 bg-[#07110d] p-7 text-white shadow-2xl"><div className="mb-6 flex items-end justify-between border-b border-emerald-500/25 pb-4"><div><div className="text-3xl font-black tracking-[0.18em] text-emerald-400">AMPLA</div><div className="text-xl font-bold">ACOMPANHAMENTO DE ROTAS</div></div><div className="text-right text-xs text-slate-300"><div>Unidade: <strong>{reportUnit}</strong></div><div>Data: <strong>{new Date(`${reportDate}T12:00:00`).toLocaleDateString("pt-BR")}</strong></div><div>Atualizado às: <strong>{new Date(reportTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong></div></div></div>
      <table className="w-full table-fixed text-left text-[11px]"><thead className="bg-emerald-950/80 text-emerald-200"><tr>{["DT", "VEÍCULO", "MOTORISTA", "TIPO", "DESTINO", "TOTAL", "ENTREGUES", "DEV", "RECUSAS", "PENDENTES", "PROGRESSO", "STATUS"].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{rows.map((row: any, index: number) => <tr key={row.rotaId || `${row.dt}-${index}`} className="border-b border-emerald-950/60"><td className="p-2 font-bold text-emerald-300">{row.dt}</td><td className="p-2">{row.veiculo}</td><td className="truncate p-2">{row.motorista}</td><td className="p-2">{row.tipo}</td><td className="truncate p-2">{row.destino}</td><td className="p-2">{row.total}</td><td className="p-2 text-emerald-300">{row.entregues}</td><td className="p-2 text-amber-300">{row.devolucoes}</td><td className="p-2">{row.recusadas}</td><td className="p-2">{row.pendentes}</td><td className="p-2 font-bold">{row.progresso ?? row.percentual}%</td><td className="p-2">{row.status}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-10 text-center text-slate-500">Nenhuma rota selecionada.</p>}<p className="mt-5 text-[9px] text-slate-500">Indicadores calculados somente a partir das atualizações operacionais manuais do AMPLA.</p></div>

    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4"><button type="button" onClick={generateImage} disabled={busy || !rows.length} className="flex items-center gap-2 rounded bg-sky-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"><Download className="h-4 w-4" />Gerar imagem</button><button type="button" onClick={generatePdf} disabled={busy || !rows.length} className="flex items-center gap-2 rounded bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"><FileDown className="h-4 w-4" />Gerar PDF</button>{!historical && <button type="button" onClick={save} disabled={busy || !rows.length} className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" />Salvar reporte</button>}{historical && <button type="button" onClick={() => setHistorical(null)} className="rounded border border-slate-700 px-4 py-2 text-xs text-slate-300">Voltar ao reporte atual</button>}{message && <span className="self-center text-xs text-slate-300">{message}</span>}</div>
    <details className="rounded-xl border border-slate-800 bg-slate-900 p-4"><summary className="cursor-pointer text-xs font-bold text-white"><History className="mr-1 inline h-4 w-4 text-purple-400" />Histórico de reportes ({history.length})</summary><div className="mt-3 grid gap-2 md:grid-cols-3">{history.map((snapshot) => <button key={snapshot.id} type="button" onClick={() => setHistorical(snapshot)} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-left text-xs text-slate-300"><strong className="block text-white">{new Date(snapshot.criadoEm).toLocaleString("pt-BR")}</strong>{snapshot.unidade} · {snapshot.rotasSnapshot.length} DT(s)</button>)}</div></details>
  </div></div>;
}
