import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, ExternalLink, FileText, History, MapPin, RefreshCw, ShieldCheck } from "lucide-react";
import type { Rota, ShipsCsvImportHistory, ShipsDeliveryComplement } from "../types";
import { getOperationalRouteTotals } from "../../shared/shipsComplement";
import { openDocumentOrNotify } from "../lib/documents";
import ShipsComplementImportModal from "./ShipsComplementImportModal";

type Props = { route: Rota; vehicleLabel?: string; driverLabel?: string; userEmail?: string; onRefresh?: () => void };
type DetailsPayload = {
  route: Rota;
  complements: ShipsDeliveryComplement[];
  importHistory: ShipsCsvImportHistory[];
  returns: { efetivas: any[]; resolvidas: any[]; quantidade: number; valorTotal: number };
  vehicle?: { placa?: string; modelo?: string; perfil?: string };
  driver?: { nome?: string };
};
const tabs = ["RESUMO", "ENTREGAS", "DADOS SHIPS", "COMPROVANTES", "OCORRÊNCIAS", "HISTÓRICO"] as const;
type Tab = typeof tabs[number];
const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString("pt-BR") : "Nunca";
const formatMoney = (value?: number) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ShipsRouteDeliveries({ route, vehicleLabel, driverLabel, userEmail = "", onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("RESUMO");
  const [details, setDetails] = useState<DetailsPayload | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rotas/${encodeURIComponent(route.id)}/details`, { headers: { "x-user-email": userEmail } });
      if (response.ok) setDetails(await response.json());
    } finally { setLoading(false); }
  }, [route.id, userEmail]);
  useEffect(() => { void loadDetails(); }, [loadDetails]);
  if (route.origemRegistro !== "SHIPS_PDF" && !route.shipsEntregas?.length) return null;

  const displayRoute = details?.route || route;
  const totals = getOperationalRouteTotals(displayRoute);
  const complementMap = useMemo(() => new Map((details?.complements || []).map((item) => [item.deliveryOrder, item])), [details]);

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400"><FileText className="h-4 w-4" /> Central operacional da DT</h4><p className="mt-1 text-[10px] text-slate-500">Última atualização operacional: {formatDateTime(displayRoute.ultimaAtualizacaoOperacional)}</p><p className="text-[10px] text-slate-500">Última importação de dados complementares Ships: {formatDateTime(displayRoute.ultimaImportacaoShipsComplementar)}</p></div>
      <button type="button" onClick={() => setImportOpen(true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold uppercase text-white hover:bg-emerald-500">Importar CSV Ships</button>
    </div>
    <div className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-2">{tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded px-2.5 py-1.5 text-[9px] font-bold ${activeTab === tab ? "bg-emerald-500/15 text-emerald-300" : "text-slate-500 hover:text-slate-300"}`}>{tab}</button>)}{loading && <RefreshCw className="ml-auto h-3.5 w-3.5 animate-spin text-slate-500" />}</div>

    {activeTab === "RESUMO" && <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-[10px] md:grid-cols-4">{[["DT", displayRoute.dt], ["Tipo", displayRoute.tipo], ["Data", displayRoute.data], ["Veículo", details?.vehicle?.placa || vehicleLabel || "N/D"], ["Perfil veículo", details?.vehicle?.perfil || details?.vehicle?.modelo || "N/D"], ["Motorista", details?.driver?.nome || driverLabel || "N/D"], ["Destino", displayRoute.cidadeDestino || displayRoute.clienteCidade || "N/D"], ["Status da rota", displayRoute.status_viagem || displayRoute.status]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5"><span className="block uppercase text-slate-500">{label}</span><strong className="text-slate-200">{value}</strong></div>)}</div>
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] md:grid-cols-6">{[["Total", totals.total], ["Entregues", totals.entregues], ["Devoluções", totals.devolucoes], ["Recusadas", totals.recusadas], ["Pendentes", totals.pendentes], ["Realizado", `${totals.percentual}%`]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-950 p-2"><span className="block text-slate-500">{label}</span><strong className="text-white">{value}</strong></div>)}</div>
      <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-[10px] text-sky-200"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Indicadores exclusivamente manuais do AMPLA. O status bruto do CSV não altera a rota.</div>
    </div>}

    {activeTab === "ENTREGAS" && <div className="space-y-2">{(displayRoute.shipsEntregas || []).map((delivery) => <div key={delivery.deliveryOrder} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="block text-xs text-sky-300">{delivery.deliveryOrder}</strong><span className="text-[10px] text-slate-400">Código: {delivery.customerId}</span><p className="text-[11px] text-slate-200">{delivery.customerName || complementMap.get(delivery.deliveryOrder)?.customerName || "Cliente não informado"}</p><span className="text-[9px] font-bold text-amber-300">STATUS AMPLA: CONTROLADO MANUALMENTE</span></div><button type="button" onClick={() => setSelectedOrder(selectedOrder === delivery.deliveryOrder ? null : delivery.deliveryOrder)} className="rounded border border-slate-700 px-2 py-1 text-[9px] text-slate-300">Ver detalhes</button></div>{selectedOrder === delivery.deliveryOrder && <DeliveryDetails delivery={delivery} complement={complementMap.get(delivery.deliveryOrder)} />}</div>)}</div>}

    {activeTab === "DADOS SHIPS" && <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full min-w-[650px] text-left text-[10px]"><thead className="bg-slate-950 text-slate-500"><tr><th className="p-2">Delivery Order</th><th className="p-2">Cliente</th><th className="p-2">STATUS SHIPS</th><th className="p-2">Conclusão</th><th className="p-2">Tentativas</th><th className="p-2">Sincronizado</th></tr></thead><tbody className="divide-y divide-slate-800">{(details?.complements || []).map((item) => <tr key={item.id}><td className="p-2 text-sky-300">{item.deliveryOrder}</td><td className="p-2">{item.customerName || item.customerCode || "—"}</td><td className="p-2 text-purple-300">{item.shipsStatus || item.currentConsignmentStatus || "—"}</td><td className="p-2">{formatDateTime(item.completionTime)}</td><td className="p-2">{item.attemptCount ?? "—"}</td><td className="p-2">{formatDateTime(item.syncedAt)}</td></tr>)}</tbody></table>{!details?.complements.length && <p className="p-5 text-center text-xs text-slate-500">Nenhum dado complementar importado.</p>}</div>}

    {activeTab === "COMPROVANTES" && <div className="grid gap-2 sm:grid-cols-2">{(details?.complements || []).filter((item) => item.pocImage || item.signatureImage).map((item) => <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><strong className="text-xs text-white">Delivery Order {item.deliveryOrder}</strong><div className="mt-2 flex gap-2">{item.pocImage && <button type="button" onClick={() => openDocumentOrNotify(item.pocImage)} className="rounded bg-sky-600 px-2 py-1 text-[10px] text-white"><Camera className="mr-1 inline h-3 w-3" />Ver foto</button>}{item.signatureImage && <button type="button" onClick={() => openDocumentOrNotify(item.signatureImage)} className="rounded bg-purple-600 px-2 py-1 text-[10px] text-white">Ver assinatura</button>}</div></div>)}{!details?.complements.some((item) => item.pocImage || item.signatureImage) && <p className="text-xs text-slate-500">Documento não disponível. Nenhum documento foi anexado a este registro.</p>}</div>}
    {activeTab === "OCORRÊNCIAS" && <div className="space-y-2 text-xs">{details?.returns.efetivas.map((item) => <div key={item.devolucaoId} className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-amber-100">DEV · {item.clienteCodigo} — {item.clienteNome} · NF {item.numeroNF} · {formatMoney(item.valorNF)}</div>)}{details?.returns.resolvidas.map((item) => <div key={item.devolucaoId} className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-emerald-100">RESOLVIDA · {item.clienteCodigo} — {item.clienteNome} · não gerou devolução</div>)}{!details?.returns.efetivas.length && !details?.returns.resolvidas.length && <p className="text-slate-500">Nenhuma ocorrência vinculada à DT.</p>}</div>}
    {activeTab === "HISTÓRICO" && <div className="space-y-2">{(details?.importHistory || []).map((item) => <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-[10px] text-slate-300"><History className="mr-1 inline h-3.5 w-3.5 text-purple-400" />{formatDateTime(item.importedAt)} · {item.fileName} · {item.matched} correspondências · {item.ignored} ignorados · por {item.importedBy}</div>)}{!details?.importHistory.length && <p className="text-xs text-slate-500">Nenhuma importação complementar registrada.</p>}</div>}
    {importOpen && <ShipsComplementImportModal route={displayRoute} userEmail={userEmail} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); void loadDetails(); onRefresh?.(); }} />}
  </section>;
}

function DeliveryDetails({ delivery, complement }: { delivery: NonNullable<Rota["shipsEntregas"]>[number]; complement?: ShipsDeliveryComplement }) {
  return <div className="mt-3 grid gap-2 border-t border-slate-800 pt-3 text-[10px] md:grid-cols-2">
    <Info title="Identificação" values={[delivery.deliveryOrder, `Código ${delivery.customerId}`, delivery.customerName || complement?.customerName, [complement?.addressLine1, complement?.addressLine2, complement?.addressCity, complement?.addressState, complement?.postalCode].filter(Boolean).join(", "), complement?.phone]} />
    <Info title="Dados complementares Ships" values={[`Status Ships: ${complement?.shipsStatus || complement?.currentConsignmentStatus || "—"}`, `Conclusão: ${formatDateTime(complement?.completionTime)}`, `Tentativas: ${complement?.attemptCount ?? "—"}`, `Entrega parcial: ${complement?.isPartialDelivery === undefined ? "—" : complement.isPartialDelivery ? "Sim" : "Não"}`, `Serviço: ${complement?.taskType || "—"}`]} />
    <Info title="Recebimento" values={[complement?.receiverName, complement?.receiverRelation, complement?.receiverPhone]} />
    <Info title="Cobrança · dados informados pelo Ships" values={[`Cobrança na entrega: ${complement?.isCod ? complement.codCollectionMode || "Sim" : "Não informada"}`, `Valor: ${formatMoney(complement?.codAmount)}`]} />
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><strong className="text-emerald-400">Localização</strong><p className="mt-1 text-slate-300">{complement?.completionLat ?? "—"}, {complement?.completionLng ?? "—"}</p>{complement?.completionLat !== undefined && complement?.completionLng !== undefined && <button type="button" onClick={() => window.open(`https://www.google.com/maps?q=${encodeURIComponent(`${complement.completionLat},${complement.completionLng}`)}`, "_blank", "noopener,noreferrer")} className="mt-2 text-sky-300"><MapPin className="mr-1 inline h-3 w-3" />Abrir local <ExternalLink className="inline h-3 w-3" /></button>}</div>
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><strong className="text-emerald-400">Comprovantes</strong><div className="mt-2 flex gap-2">{complement?.pocImage ? <button type="button" onClick={() => openDocumentOrNotify(complement.pocImage)} className="text-sky-300">Ver foto</button> : <span className="text-slate-500">Foto indisponível</span>}{complement?.signatureImage ? <button type="button" onClick={() => openDocumentOrNotify(complement.signatureImage)} className="text-purple-300">Ver assinatura</button> : <span className="text-slate-500">Assinatura indisponível</span>}</div></div>
  </div>;
}
function Info({ title, values }: { title: string; values: Array<unknown> }) { return <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><strong className="text-emerald-400">{title}</strong>{values.filter(Boolean).map((value, index) => <p key={index} className="mt-1 text-slate-300">{String(value)}</p>)}</div>; }
