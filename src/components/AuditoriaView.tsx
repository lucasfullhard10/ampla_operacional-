import React, { useState } from "react";
import { Search, Shield, Clock, FileText } from "lucide-react";
import { Auditoria } from "../types";

interface AuditoriaProps {
  logs: Auditoria[];
}

export default function AuditoriaView({ logs }: AuditoriaProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = logs.filter(
    (x) =>
      x.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      x.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      x.detalhes.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => b.id.localeCompare(a.id));

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquise logs por usuário, ação auditada ou palavras-chave das transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
          />
        </div>
        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
          {filtered.length} logs registrados
        </span>
      </div>

      {/* Logs output console */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-sky-400" />
            Logs de Auditoria de Transações Logísticas (SOX-Compliance)
          </span>
          <span className="text-[9px] bg-slate-950 text-slate-500 font-mono px-2 py-0.5 rounded border border-slate-800">
            Histórico Inviolável
          </span>
        </div>

        {/* Console entries */}
        <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
          {filtered.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-850/20 transition flex flex-col md:flex-row gap-4 font-mono text-[11px]">
              {/* Date / Time */}
              <div className="md:w-36 flex items-center gap-1.5 text-slate-400 shrink-0">
                <Clock className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                <span>{log.data} • {log.hora}</span>
              </div>

              {/* Action badge */}
              <div className="md:w-44 shrink-0">
                <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-400/10 block text-center truncate">
                  {log.acao}
                </span>
              </div>

              {/* Descriptions & Operator */}
              <div className="flex-1 space-y-1">
                <p className="text-slate-200 mt-0.5 font-sans leading-relaxed text-xs">
                  {log.detalhes}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-sans">
                  <span>Operador:</span>
                  <strong className="text-slate-400 font-medium">{log.usuario}</strong>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-500 italic text-xs">
              Nenhum log correspondente aos critérios de filtragem de auditoria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
