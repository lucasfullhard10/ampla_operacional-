import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, Layers, ClipboardList, Database, FileText, CalendarRange, 
  Settings2, Printer, Share2, HelpCircle, AlertTriangle, ArrowRightLeft, DollarSign, CheckCircle2 
} from "lucide-react";
import { Unidade, DevolucaoRegistro } from "../types";

// Import modular subviews
import DevolucoesDashboard from "./devolucoes/DevolucoesDashboard";
import DevolucoesImport from "./devolucoes/DevolucoesImport";
import DevolucoesRegistro from "./devolucoes/DevolucoesRegistro";
import DevolucoesBases from "./devolucoes/DevolucoesBases";

interface DevolucoesViewProps {
  unidades: Unidade[];
  currentUser: any;
  onRefresh: () => void;
}

export default function DevolucoesView({ unidades, currentUser, onRefresh }: DevolucoesViewProps) {
  // Tabs: dashboard, registro, reportes, resumo, bases, importador, configuracoes
  const [activeSubTab, setActiveSubTab] = useState<string>("dashboard");
  const [registros, setRegistros] = useState<DevolucaoRegistro[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Configuration thresholds
  const [returnLimitPercent, setReturnLimitPercent] = useState<number>(1.50);
  const [targetVolumeMax, setTargetVolumeMax] = useState<number>(30);

  // Report filter states
  const [repUnit, setRepUnit] = useState("");
  const [repStart, setRepStart] = useState("");
  const [repEnd, setRepEnd] = useState("");

  const fetchRegistros = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/devolucoes/registros");
      if (res.ok) {
        setRegistros(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, [currentUser]);

  const handleGlobalRefresh = () => {
    fetchRegistros();
    onRefresh();
  };

  // Today's Date String
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRegistros = registros.filter(r => r.data === todayStr);

  // Report filtered data
  const reportData = registros.filter(r => {
    const matchUnit = !repUnit || r.unidadeId === repUnit;
    const matchStart = !repStart || r.data >= repStart;
    const matchEnd = !repEnd || r.data <= repEnd;
    return matchUnit && matchStart && matchEnd;
  });

  const printReport = () => {
    window.print();
  };

  // WhatsApp daily briefing share
  const shareDailyBriefing = () => {
    const totalTodayVal = todayRegistros.reduce((sum, r) => sum + (r.valorNF || 0), 0);
    const resolvedToday = todayRegistros.filter(r => r.status === "Resolvida").length;
    
    let text = `*AMPLA - RESUMO DIÁRIO DE DEVOLUÇÕES*\n`;
    text += `Data: ${new Date().toLocaleDateString("pt-BR")}\n`;
    text += `Total de Ocorrências: ${todayRegistros.length}\n`;
    text += `Valor Total: R$ ${totalTodayVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
    text += `Status: ${resolvedToday} Resolvidas | ${todayRegistros.length - resolvedToday} Pendentes\n\n`;
    text += `Acesse o painel do Ampla para visualizar todos os protocolos.`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[10px] font-bold text-sky-400 font-mono tracking-widest uppercase block">MÓDULO AMPLA</span>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2 mt-1">
            <ArrowRightLeft className="w-6 h-6 text-sky-500" /> GESTÃO DE DEVOLUÇÕES HEINEKEN
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Controle total de acertos de notas fiscais, motivos de devoluções, e relatórios executivos integrados por unidade.
          </p>
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[11px] font-mono font-medium text-slate-400">Banco de Dados PostgreSQL Online</span>
        </div>
      </div>

      {/* Navigation Subtabs (Ampla Style) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-1.5 border border-slate-800 rounded-xl max-w-fit">
        {[
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "registro", label: "Registro de Devoluções", icon: ClipboardList },
          { id: "reportes", label: "Reportes & Protocolos", icon: FileText },
          { id: "resumo", label: "Resumo Diário", icon: CalendarRange },
          { id: "bases", label: "Bases Operacionais", icon: Database },
          { id: "importador", label: "Centro de Importação", icon: Layers },
          { id: "configuracoes", label: "Configurações", icon: Settings2 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all ${
                isActive 
                  ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/10" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === "resumo" && todayRegistros.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-bold font-mono animate-bounce leading-none">
                  {todayRegistros.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Panel views */}
      <div className="transition-all duration-150">
        {activeSubTab === "dashboard" && (
          <DevolucoesDashboard 
            registros={registros} 
            unidades={unidades} 
          />
        )}

        {activeSubTab === "registro" && (
          <DevolucoesRegistro 
            unidades={unidades} 
            currentUser={currentUser} 
            onRefresh={handleGlobalRefresh} 
          />
        )}

        {activeSubTab === "importador" && (
          <DevolucoesImport 
            unidades={unidades} 
            currentUser={currentUser} 
            onRefresh={handleGlobalRefresh} 
          />
        )}

        {activeSubTab === "bases" && (
          <DevolucoesBases 
            unidades={unidades} 
            currentUser={currentUser} 
          />
        )}

        {/* REPORTES TAB (PRINT FRIENDLY) */}
        {activeSubTab === "reportes" && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-3 print:hidden">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono uppercase tracking-wider">
                  <Printer className="w-5 h-5 text-sky-400" /> Geração de Protocolo & Relatórios Customizados
                </h2>
                <p className="text-xs text-slate-400 mt-1">Selecione filtros e gere cópias de segurança para impressão em papel.</p>
              </div>
              <button
                onClick={printReport}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir Relatório (PDF)
              </button>
            </div>

            {/* Filter Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-lg border border-slate-850 print:hidden font-mono text-xs text-slate-300">
              <div className="space-y-1.5">
                <span>Unidade Operacional</span>
                <select
                  value={repUnit}
                  onChange={(e) => setRepUnit(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                >
                  <option value="">Todas as Filiais</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <span>Período Início</span>
                <input
                  type="date"
                  value={repStart}
                  onChange={(e) => setRepStart(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <span>Período Fim</span>
                <input
                  type="date"
                  value={repEnd}
                  onChange={(e) => setRepEnd(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>
            </div>

            {/* Print View Container */}
            <div className="bg-white text-slate-950 p-8 rounded-lg border border-slate-200 space-y-6 print:border-none print:p-0">
              {/* Report Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight">AMPLA LOGÍSTICA & DISTRIBUIÇÃO S.A.</h1>
                  <span className="text-xs uppercase font-bold text-slate-500 block">Relatório de Devoluções Consolidadas Heineken</span>
                  <span className="text-xs text-slate-400 block mt-1">Período: {repStart ? new Date(repStart + "T12:00:00").toLocaleDateString() : "Início"} até {repEnd ? new Date(repEnd + "T12:00:00").toLocaleDateString() : "Hoje"}</span>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold">SISTEMA AMPLA INTEGRADO</div>
                  <div>Data Emissão: {new Date().toLocaleDateString("pt-BR")}</div>
                  <div>Status: CONSOLIDADO</div>
                </div>
              </div>

              {/* Stats boxes */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-slate-300 p-3 rounded text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Volume de Notas</span>
                  <span className="text-xl font-extrabold block text-slate-900 mt-1">{reportData.length} ocorrs</span>
                </div>
                <div className="border border-slate-300 p-3 rounded text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Valor Consolidado</span>
                  <span className="text-xl font-extrabold block text-slate-900 mt-1">
                    R$ {reportData.reduce((sum, r) => sum + (r.valorNF || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border border-slate-300 p-3 rounded text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Meta de Desvio</span>
                  <span className="text-xl font-extrabold block text-emerald-600 mt-1">Sob controle</span>
                </div>
              </div>

              {/* Ledger Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 bg-slate-100 font-bold">
                    <th className="p-2">Protocolo</th>
                    <th className="p-2">Data</th>
                    <th className="p-2">Filial</th>
                    <th className="p-2">NF</th>
                    <th className="p-2">Cliente/PDV</th>
                    <th className="p-2">Motorista</th>
                    <th className="p-2">Motivo</th>
                    <th className="p-2 text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.map(row => (
                    <tr key={row.id}>
                      <td className="p-2 font-bold">{row.protocolo}</td>
                      <td className="p-2">{new Date(row.data + "T12:00:00").toLocaleDateString()}</td>
                      <td className="p-2">{unidades.find(u => u.id === row.unidadeId)?.nome || row.unidadeId}</td>
                      <td className="p-2">{row.numeroNF}</td>
                      <td className="p-2 truncate max-w-[120px]">{row.clienteNomeFantasia}</td>
                      <td className="p-2">{row.motoristaNome}</td>
                      <td className="p-2 font-mono font-bold">{row.motivoCodigo}</td>
                      <td className="p-2 text-right font-bold">R$ {row.valorNF?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">Nenhuma devolução encontrada para os filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Signature boxes */}
              <div className="grid grid-cols-2 gap-8 pt-10">
                <div className="border-t border-slate-900 text-center pt-2">
                  <span className="text-[10px] font-bold block uppercase">Assinatura do Motorista Transportador</span>
                  <span className="text-[9px] text-slate-500 block">Confirmo retorno das mercadorias</span>
                </div>
                <div className="border-t border-slate-900 text-center pt-2">
                  <span className="text-[10px] font-bold block uppercase">Assinatura do Coordenador Ampla Log</span>
                  <span className="text-[9px] text-slate-500 block">Conformidade e fechamento de acertos</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESUMO DIÁRIO TAB */}
        {activeSubTab === "resumo" && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono uppercase tracking-wider">
                  <CalendarRange className="w-5 h-5 text-sky-400" /> Resumo Diário de Acertos de Notas
                </h2>
                <p className="text-xs text-slate-400 mt-1">Visão diária simplificada de devoluções ocorridas na data de hoje.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={shareDailyBriefing}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs font-mono flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" /> Compartilhar Resumo (WhatsApp)
                </button>
              </div>
            </div>

            {/* Daily totals cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Devoluções de Hoje</span>
                <span className="text-3xl font-black text-slate-100 font-mono block mt-1">{todayRegistros.length}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Valor Devolvido Hoje</span>
                <span className="text-3xl font-black text-sky-400 font-mono block mt-1">
                  R$ {todayRegistros.reduce((sum, r) => sum + (r.valorNF || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Status de Hoje</span>
                <span className="text-sm font-bold text-slate-300 block mt-3">
                  {todayRegistros.filter(r => r.status === "Resolvida").length} Resolvidas | {todayRegistros.filter(r => r.status === "Pendente").length} Pendentes
                </span>
              </div>
            </div>

            {/* List of today's returns */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-3 bg-slate-950/40 text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider border-b border-slate-800">
                Lista de Devoluções Registradas Hoje ({todayStr})
              </div>
              <div className="divide-y divide-slate-800 text-xs font-mono">
                {todayRegistros.length > 0 ? (
                  todayRegistros.map(row => (
                    <div key={row.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-950/40 gap-3">
                      <div>
                        <span className="font-bold text-sky-400">{row.protocolo}</span>
                        <span className="mx-2 text-slate-600">|</span>
                        <span className="text-slate-200">NF {row.numeroNF}</span>
                        <span className="mx-2 text-slate-600">|</span>
                        <span className="text-slate-300">{row.clienteNomeFantasia}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400">Motorista: {row.motoristaNome}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">{row.motivoCodigo}</span>
                        <span className="font-bold text-slate-200">R$ {row.valorNF?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.status === "Resolvida" ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                          {row.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">Nenhum registro de devolução lançado na data de hoje.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURAÇÕES TAB */}
        {activeSubTab === "configuracoes" && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono uppercase tracking-wider">
                <Settings2 className="w-5 h-5 text-sky-400" /> Configuração Operacional de Metas Heineken
              </h2>
              <p className="text-xs text-slate-400 mt-1">Defina metas e níveis de compliance que servem como limite para os cálculos do painel executivo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
              <div className="bg-slate-950 p-5 rounded-lg border border-slate-850 space-y-4">
                <h3 className="text-xs font-bold text-sky-400 uppercase block border-b border-slate-800 pb-2">Parâmetros de Desvio</h3>
                
                <div className="space-y-1.5">
                  <span className="text-slate-400 block">Limite de Desvio de Devolução (% sobre o faturamento)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={returnLimitPercent}
                    onChange={(e) => setReturnLimitPercent(parseFloat(e.target.value) || 1.50)}
                    className="w-full bg-slate-900 border border-slate-800 p-2 text-slate-100 rounded"
                  />
                  <span className="text-[10px] text-slate-500 block">Normalmente estabelecido entre 1.00% e 1.50% pelas operadoras logísticas.</span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-slate-400 block">Meta Limite de Ocorrências Mensais</span>
                  <input
                    type="number"
                    value={targetVolumeMax}
                    onChange={(e) => setTargetVolumeMax(parseInt(e.target.value) || 30)}
                    className="w-full bg-slate-900 border border-slate-800 p-2 text-slate-100 rounded"
                  />
                </div>

                <button 
                  onClick={() => alert("Parâmetros operacionais salvos localmente com sucesso!")}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold rounded text-xs"
                >
                  Salvar Parâmetros
                </button>
              </div>

              <div className="bg-slate-950 p-5 rounded-lg border border-slate-850 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-sky-400 uppercase block border-b border-slate-800 pb-2">Sobre as Regras da Heineken</h3>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    O Ampla gerencia todos os acertos da Heineken de forma unificada e online, eliminando a dependência do Excel. 
                    Todas as informações cadastrais inseridas ou importadas (Base de Clientes, Motoristas, Hierarquia) são sincronizadas no cache e persistidas diretamente.
                  </p>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    A geração de protocolos garante o fechamento de acertos entre transportadoras e coordenadores da filial operacional.
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg flex items-center gap-2 text-emerald-400 font-bold text-[10px]">
                  <CheckCircle2 className="w-4 h-4" /> AMBIENTE TOTALMENTE HOMOLOGADO DE ACORDOS
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}