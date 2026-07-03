import React from "react";
import { AlertCircle, Calendar, ShieldAlert, Sparkles, Check, CheckCircle } from "lucide-react";
import { Alerta } from "../types";

interface AlertasProps {
  alertas: Alerta[];
  onRefresh: () => void;
}

export default function AlertasView({ alertas, onRefresh }: AlertasProps) {
  const criticalCount = alertas.filter((a) => a.severidade === "Crítica").length;
  const warningCount = alertas.filter((a) => a.severidade === "Atenção").length;

  return (
    <div className="space-y-6">
      {/* Cards block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-rose-900/40 font-mono text-xs flex justify-between items-center">
          <div>
            <span className="text-slate-400 block uppercase">Alertas Críticos (Ações Obrigatórias)</span>
            <span className="text-3xl font-bold text-rose-400 tracking-tight block mt-1">{criticalCount}</span>
            <span className="text-[10px] text-rose-500 mt-1 block">Condutores/veículos impedidos de carregar</span>
          </div>
          <ShieldAlert className="w-8 h-8 text-rose-400 opacity-60" />
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-amber-900/40 font-mono text-xs flex justify-between items-center">
          <div>
            <span className="text-slate-400 block uppercase">Atenções Logísticas (Proativos)</span>
            <span className="text-3xl font-bold text-amber-500 tracking-tight block mt-1">{warningCount}</span>
            <span className="text-[10px] text-amber-500 mt-1 block">Vencimentos nos próximos 30 dias</span>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-400 opacity-60" />
        </div>
      </div>

      {/* Alertas Index */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 font-mono">
          <h3 className="text-xs font-bold text-white uppercase">Central de Conformidade & Riscos Ativos</h3>
          <span className="text-[10px] text-slate-400">{alertas.length} avisos disparados</span>
        </div>

        <div className="divide-y divide-slate-800">
          {alertas.map((a) => (
            <div 
              key={a.id} 
              className={`p-4 flex items-start gap-3.5 transition-all ${
                a.severidade === "Crítica" ? "hover:bg-rose-950/5" : "hover:bg-slate-850"
              }`}
            >
              {/* Severity icon */}
              <div className="shrink-0 mt-0.5">
                {a.severidade === "Crítica" ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
              </div>

              {/* Message */}
              <div className="flex-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold leading-none ${
                    a.severidade === "Crítica" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {a.severidade.toUpperCase()}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono leading-none bg-slate-950 text-slate-400">
                    MÓDULO {a.tipo}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 ml-auto">
                    <Calendar className="w-3.5 h-3.5" /> {a.dataCriacao}
                  </span>
                </div>

                <p className="text-slate-200 mt-2 font-medium font-sans block first-letter:uppercase">{a.mensagem}</p>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">Referência objeto ID: {a.refId}</span>
              </div>
            </div>
          ))}

          {alertas.length === 0 && (
            <div className="py-16 text-center text-slate-500 font-mono text-xs space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-bold text-slate-300">Nenhum Alerta Operacional Relevante!</p>
              <p className="text-[10px] text-slate-500 max-w-sm mx-auto">Tudo em dia! Toda a documentação e manutenções sob custódia e dentro da validade.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
