import React, { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, X } from "lucide-react";
import type { Rota, ShipsComplementPreview } from "../types";
import { parseShipsCsv, type CsvRow } from "../../shared/shipsComplement";

type Props = {
  route: Rota;
  userEmail?: string;
  onClose: () => void;
  onImported: () => void;
};

export default function ShipsComplementImportModal({ route, userEmail = "", onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [preview, setPreview] = useState<ShipsComplementPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const headers = { "Content-Type": "application/json", "x-user-email": userEmail };

  const selectFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("O CSV excede o limite de 8 MB.");
      const parsedRows = parseShipsCsv(await file.text());
      if (!parsedRows.length) throw new Error("O arquivo não possui cabeçalho e registros válidos.");
      setFileName(file.name);
      setRows(parsedRows);
      const response = await fetch(`/api/rotas/${encodeURIComponent(route.id)}/ships-complement/preview`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fileName: file.name, rows: parsedRows }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível analisar o CSV.");
      setPreview(payload);
    } catch (caught) {
      setRows([]);
      setError(caught instanceof Error ? caught.message : "Falha ao analisar o CSV.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!preview || !rows.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/rotas/${encodeURIComponent(route.id)}/ships-complement/import`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fileName, rows }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível importar os dados.");
      onImported();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao importar o CSV.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/90 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4">
          <div>
            <h3 className="text-sm font-bold text-white">Importar dados complementares Ships</h3>
            <p className="mt-1 text-[10px] font-mono text-slate-500">DT {route.dt} · o progresso operacional não será alterado</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white" aria-label="Fechar"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-4 p-5">
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="flex w-full flex-col items-center rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-6 text-slate-200 disabled:opacity-50">
            {busy && !preview ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-emerald-400" /> : <FileSpreadsheet className="mb-2 h-6 w-6 text-emerald-400" />}
            <span className="text-xs font-semibold">{fileName || "Selecionar CSV do Ships"}</span>
          </button>
          {error && <div className="flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[["Registros", preview.records], ["Correspondências", preview.matched], ["Não encontrados", preview.ignored], ["Já existentes", preview.existing], ["Novos dados", preview.newData]].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="block text-[9px] uppercase text-slate-500">{label}</span><strong className="text-lg text-white">{value}</strong></div>
                ))}
              </div>
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-[11px] text-sky-200">Nenhuma informação operacional da rota será alterada.</div>
              {preview.unknownReferences.length > 0 && (
                <details className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-200">
                  <summary className="cursor-pointer font-semibold">{preview.unknownReferences.length} referência(s) não pertencem à DT</summary>
                  <div className="mt-2 flex max-h-24 flex-wrap gap-1 overflow-auto">{preview.unknownReferences.map((reference) => <span key={reference} className="rounded bg-slate-950 px-2 py-1 font-mono">{reference}</span>)}</div>
                </details>
              )}
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-800 bg-slate-950 p-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300">Cancelar</button>
          <button type="button" onClick={confirm} disabled={!preview || preview.matched === 0 || busy} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Confirmar importação</button>
        </footer>
      </div>
    </div>
  );
}
