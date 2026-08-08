import React from "react";
import { X, FileText, Calendar, DollarSign, User, Building2, MapPin, Phone, AlertCircle, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import { DevolucaoRegistro } from "../../types";

interface DetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DevolucaoRegistro | null;
}

export default function DevolucoesDetalhesModal({ isOpen, onClose, record }: DetalhesModalProps) {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-tight">
                Detalhes da Devolução #{record.protocolo || record.id || record.numeroNF}
              </h2>
              <p className="text-xs text-slate-400">Ficha técnica completa da ocorrência de devolução.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono text-slate-200">
          {/* Status & Resolvido Banner */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Status Atual</span>
              <span className={`text-sm font-black uppercase ${
                record.status === "Resolvida" ? "text-emerald-400" :
                record.status === "Cancelada" ? "text-slate-400" : "text-amber-400"
              }`}>
                {record.status}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Campo Resolvido</span>
              <span className={`px-3 py-1 rounded text-xs font-bold ${
                record.resolvido === "SIM" 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}>
                {record.resolvido || (record.status === "Resolvida" ? "SIM" : "NÃO")}
              </span>
            </div>
          </div>

          {/* Dados Financeiros e NF */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Número da NF</span>
              <span className="text-sm font-bold text-sky-400">{record.numeroNF}</span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Valor NF</span>
              <span className="text-sm font-bold text-emerald-400">
                R$ {Number(record.valorNF || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Data Ocorrência</span>
              <span className="text-xs font-bold text-slate-200">{record.dataOcorrido || record.data}</span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Filial / Unidade</span>
              <span className="text-xs font-bold text-slate-200">{record.filial || record.unidadeId || "Goiânia"}</span>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-sky-400 font-bold uppercase tracking-wider text-[11px] block">
              Informações do Cliente
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 text-[10px] block font-bold">Código</span>
                <span className="text-slate-200 font-bold">{record.clienteCodigo}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 text-[10px] block font-bold">Razão Social / Nome Fantasia</span>
                <span className="text-slate-100 font-bold">{record.clienteNomeFantasia || record.clienteRazaoSocial || record.clienteNome}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Vendedor</span>
                <span className="text-slate-300 font-medium">{record.vendedor || "Não informado"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Supervisor</span>
                <span className="text-slate-300 font-medium">{record.supervisor || "Não informado"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Gerente</span>
                <span className="text-slate-300 font-medium">{record.gerente || "Não informado"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Canal / Área</span>
                <span className="text-slate-300 font-medium">{record.canal || record.area || "Rotas"}</span>
              </div>
            </div>
          </div>

          {/* Dados do Motorista e Motivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-sky-400 font-bold uppercase tracking-wider text-[11px] block">
                Motorista da Operação
              </span>
              <div>
                <span className="text-slate-100 font-bold block text-sm">{record.motoristaNome}</span>
                <span className="text-slate-400 text-[11px]">Matrícula: {record.motoristaMatricula || "N/A"} | Tel: {record.motoristaTelefone || "N/A"}</span>
              </div>
            </div>

            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-sky-400 font-bold uppercase tracking-wider text-[11px] block">
                Motivo Registrado
              </span>
              <div>
                <span className="text-sky-400 font-bold text-sm block">{record.motivoCodigo}</span>
                <span className="text-slate-200 text-xs block">{record.motivoDescricao}</span>
              </div>
            </div>
          </div>

          {/* Observações e Histórico */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-sky-400 font-bold uppercase tracking-wider text-[11px] block">
              Observações e Histórico Operacional
            </span>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-xs">
              {record.observacao || "Nenhuma observação registrada."}
            </p>
          </div>

          {/* Auditoria do Registro */}
          <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800 flex justify-between items-center">
            <span>Cadastrado por: <strong className="text-slate-300">{record.usuarioCadastro || record.criadoPor || "Sistema"}</strong> em {record.dataCadastro || record.criadoEm}</span>
            {record.ultimaAtualizacao && <span>Última atualização: {record.ultimaAtualizacao}</span>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-slate-800 bg-slate-950/50">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs font-mono">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
