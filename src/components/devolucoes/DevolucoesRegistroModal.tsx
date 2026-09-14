import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, FileText, Package, Save, Truck, User, X } from "lucide-react";
import type { DevolucaoMotivo, DevolucaoRegistro, Rota, ShipsDeliveryComplement } from "../../types";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: any) => Promise<void>;
  editRecord?: DevolucaoRegistro | null;
  motivos?: DevolucaoMotivo[];
  currentUser: any;
  [key: string]: unknown;
}
type RouteDetails = { route: Rota; complements: ShipsDeliveryComplement[]; vehicle?: { placa?: string; modelo?: string }; driver?: { nome?: string; matricula?: string } };

export default function DevolucoesRegistroModal({ isOpen, onClose, onSave, editRecord, motivos = [], currentUser }: ModalProps) {
  const [routes, setRoutes] = useState<Rota[]>([]);
  const [routeId, setRouteId] = useState("");
  const [details, setDetails] = useState<RouteDetails | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState("");
  const [resolved, setResolved] = useState(false);
  const [numeroNF, setNumeroNF] = useState("");
  const [valorNF, setValorNF] = useState("");
  const [motivoCodigo, setMotivoCodigo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const headers = useMemo(() => ({ "x-user-email": currentUser?.email || "" }), [currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/rotas", { headers }).then(async (response) => { if (response.ok) setRoutes(await response.json()); }).catch(() => setError("Não foi possível carregar as DTs."));
    setRouteId(editRecord?.rotaId || "");
    setDeliveryOrder(editRecord?.deliveryOrder || "");
    setResolved(editRecord?.resolvidoBoolean === true || editRecord?.resolvido === "SIM");
    setNumeroNF(editRecord?.numeroNF || "");
    setValorNF(editRecord?.valorNF !== undefined ? String(editRecord.valorNF) : "");
    setMotivoCodigo(editRecord?.motivoCodigo || motivos[0]?.codigo || "");
    setObservacao(editRecord?.observacao || "");
    setError("");
  }, [isOpen, editRecord, motivos, headers]);

  useEffect(() => {
    if (!isOpen || !routeId) { setDetails(null); return; }
    fetch(`/api/rotas/${encodeURIComponent(routeId)}/details`, { headers }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a DT.");
      setDetails(payload);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar a DT."));
  }, [isOpen, routeId, headers]);

  const selectedDelivery = details?.route.shipsEntregas?.find((item) => item.deliveryOrder === deliveryOrder);
  const complement = details?.complements.find((item) => item.deliveryOrder === deliveryOrder);
  const selectedRoute = details?.route || routes.find((route) => route.id === routeId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!routeId) return setError("Selecione a DT.");
    if (!deliveryOrder) return setError("Selecione um cliente da rota.");
    if (!motivoCodigo) return setError("Selecione o motivo.");
    if (!resolved && !numeroNF.trim()) return setError("A NF é obrigatória para devolução efetiva.");
    if (!resolved && Number(valorNF) <= 0) return setError("O valor da mercadoria é obrigatório para devolução efetiva.");
    setBusy(true); setError("");
    try {
      await onSave({
        id: editRecord?.id,
        rotaId: routeId,
        deliveryOrder,
        shipsDeliveryId: selectedDelivery?.id,
        resolvido: resolved,
        resolvidoBoolean: resolved,
        numeroNF: numeroNF.trim(),
        valorNF: Number(valorNF || 0),
        motivoCodigo,
        observacao: observacao.trim(),
        ultimaAtualizacao: new Date().toISOString(),
      });
      onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Erro ao salvar o registro."); }
    finally { setBusy(false); }
  };

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"><div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4"><div><h2 className="flex items-center gap-2 text-sm font-bold text-white"><FileText className="h-4 w-4 text-emerald-400" />{editRecord ? `Editar ${editRecord.protocolo}` : "Registrar ocorrência da DT"}</h2><p className="mt-1 text-[10px] text-slate-500">A DT é a fonte oficial de motorista, veículo, unidade e cliente.</p></div><button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button></header>
    <form onSubmit={submit} className="space-y-4 overflow-y-auto p-5 text-xs">
      {error && <div className="flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
      {!editRecord?.rotaId && editRecord && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">Registro histórico sem rotaId. Selecione a DT oficial para fortalecer o vínculo antes de salvar.</div>}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"><strong className="text-emerald-400">1. DT *</strong><select value={routeId} onChange={(event) => { setRouteId(event.target.value); setDeliveryOrder(""); }} disabled={Boolean(editRecord?.rotaId)} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white"><option value="">Pesquise/selecione a DT</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.dt} — {route.data} — {route.status_viagem || route.status}</option>)}</select>
        {selectedRoute && <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[[<Building2 className="h-3 w-3" />, "Unidade", selectedRoute.unidadeId], [<Truck className="h-3 w-3" />, "Veículo", details?.vehicle?.placa || selectedRoute.veiculoId], [<User className="h-3 w-3" />, "Motorista", details?.driver?.nome || selectedRoute.motoristaId], [<FileText className="h-3 w-3" />, "Tipo/data", `${selectedRoute.tipo} · ${selectedRoute.data}`]].map(([icon, label, value], index) => <div key={index} className="rounded border border-slate-800 bg-slate-900 p-2 text-[10px]"><span className="flex items-center gap-1 text-slate-500">{icon}{label}</span><strong className="text-slate-200">{value}</strong></div>)}</div>}
      </section>
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"><strong className="text-emerald-400">2. Cliente da rota *</strong><select value={deliveryOrder} onChange={(event) => setDeliveryOrder(event.target.value)} disabled={!details || Boolean(editRecord?.deliveryOrder)} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white"><option value="">Selecione somente entre os clientes da DT</option>{(details?.route.shipsEntregas || []).map((delivery) => <option key={delivery.deliveryOrder} value={delivery.deliveryOrder}>{delivery.customerId} — {delivery.customerName || delivery.deliveryOrder}</option>)}</select>
        {selectedDelivery && <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3"><strong className="text-sky-300"><Package className="mr-1 inline h-3.5 w-3.5" />{selectedDelivery.deliveryOrder} · {selectedDelivery.customerId} — {selectedDelivery.customerName || complement?.customerName}</strong><p className="mt-1 text-[10px] text-slate-400">{[complement?.addressLine1, complement?.addressLine2, complement?.addressCity, complement?.addressState].filter(Boolean).join(", ") || "Endereço não informado"}</p><p className="text-[10px] text-purple-300">Status Ships: {complement?.shipsStatus || "não importado"} (apenas informativo)</p></div>}
        {details && !details.route.shipsEntregas?.length && <p className="text-amber-300">A DT não possui clientes/Delivery Orders individualizados. Nenhum cliente aleatório será criado.</p>}
      </section>
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"><strong className="text-emerald-400">3. Foi resolvido durante a operação?</strong><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setResolved(true)} className={`rounded-lg border p-3 font-bold ${resolved ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" : "border-slate-700 text-slate-400"}`}><CheckCircle2 className="mr-1 inline h-4 w-4" />SIM</button><button type="button" onClick={() => setResolved(false)} className={`rounded-lg border p-3 font-bold ${!resolved ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-slate-700 text-slate-400"}`}>NÃO</button></div><p className={`rounded-lg p-2 text-[10px] ${resolved ? "bg-emerald-500/10 text-emerald-200" : "bg-amber-500/10 text-amber-200"}`}>{resolved ? "Será mantida como ocorrência resolvida e não entrará como devolução física no Fechamento." : "Esta ocorrência será considerada devolução efetiva da DT."}</p></section>
      <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-3"><label className="space-y-1 text-slate-400">Motivo *<select value={motivoCodigo} onChange={(event) => setMotivoCodigo(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white"><option value="">Selecione</option>{motivos.map((motivo) => <option key={motivo.id} value={motivo.codigo}>{motivo.codigo} — {motivo.descricao}</option>)}</select></label><label className="space-y-1 text-slate-400">NF {!resolved && "*"}<input value={numeroNF} onChange={(event) => setNumeroNF(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white" /></label><label className="space-y-1 text-slate-400">Valor {!resolved && "*"}<input type="number" min="0" step="0.01" value={valorNF} onChange={(event) => setValorNF(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white" /></label><label className="space-y-1 text-slate-400 md:col-span-3">Observação<textarea rows={3} value={observacao} onChange={(event) => setObservacao(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white" /></label></section>
      <footer className="flex justify-end gap-2 border-t border-slate-800 pt-4"><button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300">Cancelar</button><button type="submit" disabled={busy} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{busy ? "Salvando..." : "Salvar registro"}</button></footer>
    </form>
  </div></div>;
}
