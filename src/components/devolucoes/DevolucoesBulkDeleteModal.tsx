import React, { useState, useMemo, useEffect } from "react";
import { AlertTriangle, Trash2, RefreshCw, X, Calendar, Building2, FileSpreadsheet, Layers, ShieldAlert, Check } from "lucide-react";
import { Unidade, DevolucaoRegistro } from "../../types";

interface DevolucoesBulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: { modo: string; dataInicio?: string; dataFim?: string; unidade?: string }) => Promise<void>;
  unidades: Unidade[];
  allRecords: DevolucaoRegistro[];
  isDeleting: boolean;
}

export default function DevolucoesBulkDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  unidades,
  allRecords,
  isDeleting
}: DevolucoesBulkDeleteModalProps) {
  const [modo, setModo] = useState<"todos" | "importados" | "periodo" | "unidade">("importados");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [unidadeSelected, setUnidadeSelected] = useState("");
  const [confirmInput, setConfirmInput] = useState("");

  // Initialize selected unit if available
  useEffect(() => {
    if (unidades && unidades.length > 0 && !unidadeSelected) {
      setUnidadeSelected(unidades[0].id || unidades[0].nome || "");
    }
  }, [unidades, unidadeSelected]);

  // Reset states when opening
  useEffect(() => {
    if (isOpen) {
      setConfirmInput("");
    }
  }, [isOpen]);

  // Helper for date normalization
  const parseDateVal = (dStr: any): number | null => {
    if (!dStr) return null;
    const s = String(dStr).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return new Date(s.substring(0, 10)).getTime();
    }
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
      const parts = s.split("/");
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    }
    const parsed = Date.parse(s);
    return isNaN(parsed) ? null : parsed;
  };

  const normalizeStr = (s: string) => 
    String(s || "").toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  // Dynamic preview count calculation
  const previewCount = useMemo(() => {
    if (!allRecords || allRecords.length === 0) return 0;

    if (modo === "todos") {
      return allRecords.length;
    }

    if (modo === "importados") {
      return allRecords.filter((r) => r.origem === "importacao" || (!r.origem || r.origem !== "manual")).length;
    }

    if (modo === "periodo") {
      const startTs = dataInicio ? parseDateVal(dataInicio) : null;
      const endTs = dataFim ? parseDateVal(dataFim) : null;
      if (!startTs && !endTs) return 0;

      return allRecords.filter((r) => {
        const recDateStr = r.dataOcorrido || r.data || r.dataLancamento || r.dataNF || r.criadoEm;
        const recTs = parseDateVal(recDateStr);
        if (recTs === null) return false;
        let okStart = true;
        let okEnd = true;
        if (startTs !== null) okStart = recTs >= startTs;
        if (endTs !== null) okEnd = recTs <= (endTs + 86399999);
        return okStart && okEnd;
      }).length;
    }

    if (modo === "unidade") {
      if (!unidadeSelected) return 0;
      const targetNorm = normalizeStr(unidadeSelected);
      return allRecords.filter((r) => {
        const rUnidadeId = normalizeStr(r.unidadeId);
        const rUnidadeNome = normalizeStr(r.unidadeNome || r.unidade || r.filial);
        return rUnidadeId === targetNorm || rUnidadeNome === targetNorm || rUnidadeId.includes(targetNorm) || rUnidadeNome.includes(targetNorm);
      }).length;
    }

    return 0;
  }, [allRecords, modo, dataInicio, dataFim, unidadeSelected]);

  if (!isOpen) return null;

  const isTextConfirmed = confirmInput.trim() === "EXCLUIR";
  const canSubmit = isTextConfirmed && previewCount > 0 && !isDeleting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onConfirm({
      modo,
      dataInicio,
      dataFim,
      unidade: unidadeSelected
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                Limpeza Geral de Histórico
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                  ADM
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Ferramenta administrativa para exclusão em massa de registros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Main Warning Box */}
          <div className="p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-1.5 text-rose-200 text-[11px]">
            <p className="font-bold flex items-center gap-2 text-rose-400 uppercase tracking-wider text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" /> ATENÇÃO
            </p>
            <p className="leading-relaxed">
              Esta ação irá apagar permanentemente registros do histórico operacional.
              Cadastros base (clientes, motoristas, motivos, permissões) serão preservados.
            </p>
          </div>

          {/* Mode Selection Grid */}
          <div className="space-y-2">
            <label className="text-slate-300 font-bold text-xs uppercase tracking-wider block">
              Escolha uma opção de exclusão:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option: Importados */}
              <button
                type="button"
                onClick={() => setModo("importados")}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  modo === "importados"
                    ? "bg-rose-500/10 border-rose-500/50 text-slate-100 shadow-lg shadow-rose-950/30"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <FileSpreadsheet className={`w-4 h-4 mt-0.5 shrink-0 ${modo === "importados" ? "text-rose-400" : "text-slate-500"}`} />
                <div>
                  <div className="font-bold text-xs">Registros Importados</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Apagar lançamentos oriundos de planilhas</div>
                </div>
              </button>

              {/* Option: Periodo */}
              <button
                type="button"
                onClick={() => setModo("periodo")}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  modo === "periodo"
                    ? "bg-rose-500/10 border-rose-500/50 text-slate-100 shadow-lg shadow-rose-950/30"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <Calendar className={`w-4 h-4 mt-0.5 shrink-0 ${modo === "periodo" ? "text-rose-400" : "text-slate-500"}`} />
                <div>
                  <div className="font-bold text-xs">Excluir por Período</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Apagar intervalo de datas específico</div>
                </div>
              </button>

              {/* Option: Unidade */}
              <button
                type="button"
                onClick={() => setModo("unidade")}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  modo === "unidade"
                    ? "bg-rose-500/10 border-rose-500/50 text-slate-100 shadow-lg shadow-rose-950/30"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <Building2 className={`w-4 h-4 mt-0.5 shrink-0 ${modo === "unidade" ? "text-rose-400" : "text-slate-500"}`} />
                <div>
                  <div className="font-bold text-xs">Excluir por Unidade</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Apagar registros de uma filial</div>
                </div>
              </button>

              {/* Option: Todos */}
              <button
                type="button"
                onClick={() => setModo("todos")}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  modo === "todos"
                    ? "bg-rose-500/15 border-rose-500/60 text-slate-100 shadow-lg shadow-rose-950/40"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <Layers className={`w-4 h-4 mt-0.5 shrink-0 ${modo === "todos" ? "text-rose-400" : "text-slate-500"}`} />
                <div>
                  <div className="font-bold text-xs text-rose-300">Excluir TODOS</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Limpar todo o histórico operacional</div>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Inputs based on selected mode */}
          {modo === "periodo" && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fade-in">
              <label className="text-slate-300 font-bold text-xs block">Selecione o Intervalo de Datas:</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Data Final</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {modo === "unidade" && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 animate-fade-in">
              <label className="text-slate-300 font-bold text-xs block">Selecione a Unidade / Filial:</label>
              <select
                value={unidadeSelected}
                onChange={(e) => setUnidadeSelected(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-rose-500 focus:outline-none font-bold"
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome || u.cidade || u.id} ({u.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preview Record Count Box */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
              Serão apagados:
            </span>
            <span className={`text-base font-black px-3 py-1 rounded-lg border font-mono ${
              previewCount > 0 
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                : "bg-slate-900 text-slate-500 border-slate-800"
            }`}>
              {previewCount.toLocaleString("pt-BR")} registro(s)
            </span>
          </div>

          {/* Double Confirmation Text Input */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-slate-300 font-bold text-xs">
                Confirmação de Segurança:
              </label>
              <span className="text-[10px] text-slate-400">
                Digite exatamente <strong className="text-rose-400">EXCLUIR</strong>
              </span>
            </div>
            <input
              type="text"
              placeholder="Digite EXCLUIR para confirmar"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-bold focus:border-rose-500 focus:outline-none placeholder:text-slate-600 tracking-wider"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs font-mono transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs font-mono transition-all flex items-center gap-2 shadow-lg shadow-rose-950/60 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processando Limpeza...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Executar Limpeza ({previewCount})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
