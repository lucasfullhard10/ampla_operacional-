import React from "react";
import { AlertTriangle, Trash2, RefreshCw, X } from "lucide-react";
import { DevolucaoRegistro } from "../../types";

interface DevolucoesDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  record: DevolucaoRegistro | null;
  isDeleting: boolean;
}

export default function DevolucoesDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  record,
  isDeleting
}: DevolucoesDeleteModalProps) {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono tracking-tight">
                Excluir Devolução
              </h3>
              <p className="text-[11px] text-slate-400">Confirmação de exclusão do registro.</p>
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

        {/* Body */}
        <div className="p-5 space-y-3 text-xs font-mono">
          <p className="text-slate-200 text-sm font-medium leading-relaxed">
            Tem certeza que deseja excluir esta devolução?
          </p>
          <p className="text-slate-400 text-xs">
            Esta ação não poderá ser desfeita.
          </p>

          <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg space-y-1.5 text-[11px] mt-2">
            <div className="flex justify-between items-center text-slate-400">
              <span>Nota Fiscal / Protocolo:</span>
              <span className="text-sky-400 font-bold">#{record.numeroNF || record.protocolo || record.id}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Cliente:</span>
              <span className="text-slate-200 font-semibold truncate max-w-[200px]">
                {record.clienteNome || record.clienteNomeFantasia || record.clienteCodigo || "Cliente"}
              </span>
            </div>
            {record.valorNF !== undefined && record.valorNF !== null && (
              <div className="flex justify-between items-center text-slate-400">
                <span>Valor NF:</span>
                <span className="text-emerald-400 font-bold">
                  R$ {Number(record.valorNF || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs font-mono transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs font-mono transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/50 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
