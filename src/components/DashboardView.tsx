import React, { useState, useEffect } from "react";
import { 
  TrendingUp, CheckCircle, Clock, RotateCcw, Truck, UserCheck, 
  MapPin, Calendar, Award, RefreshCcw, BatteryCharging, AlertTriangle,
  Layers, BarChart2, ShieldAlert, Zap, Landmark
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie
} from "recharts";
import { Unidade } from "../types";

interface DashboardProps {
  unidades: Unidade[];
  selectedUnit: string;
  setSelectedUnit: (id: string) => void;
  userEmail: string;
  userRole?: string;
  userUnidadeId?: string;
}

export default function DashboardView({ 
  unidades, 
  selectedUnit, 
  setSelectedUnit, 
  userEmail,
  userRole,
  userUnidadeId 
}: DashboardProps) {
  const [period, setPeriod] = useState<"Dia" | "Semana" | "Mês" | "Ano" | "Personalizado">("Semana");
  const [activeTab, setActiveTab] = useState<"desempenho" | "executivo">("desempenho");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Advanced sub-filter states
  const [selectedDate, setSelectedDate] = useState<string>("2026-06-12");
  const [startDate, setStartDate] = useState<string>("2026-06-08");
  const [endDate, setEndDate] = useState<string>("2026-06-14");
  const [selectedMonth, setSelectedMonth] = useState<string>("06");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [weekSelector, setWeekSelector] = useState<string>("w2"); // default to Semana 2 of June (08/06 to 14/06)
  
  // Save / Load filters state
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; period: any; selectedDate?: string; startDate?: string; endDate?: string; month?: string; year?: string }>>(() => {
    try {
      const saved = localStorage.getItem("dashboard_saved_filters_v2");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { name: "Fechamento Mensal (Junho)", period: "Mês", month: "06", year: "2026" },
      { name: "Semana de Campanha Ope", period: "Semana", startDate: "2026-06-08", endDate: "2026-06-14" },
      { name: "Últimos 30 Dias", period: "Personalizado", startDate: "2026-05-15", endDate: "2026-06-14" }
    ];
  });
  
  const [newFilterName, setNewFilterName] = useState("");
  const [showSaveBox, setShowSaveBox] = useState(false);
  const [compareMode, setCompareMode] = useState(true); // default to true to show elegant telemetry vs last period immediately!

  // Save state back to localStorage
  const saveFilterToStorage = (name: string) => {
    if (!name.trim()) return alert("Por favor digite um nome para o filtro.");
    const newFilterObj = {
      name,
      period,
      selectedDate,
      startDate,
      endDate,
      month: selectedMonth,
      year: selectedYear
    };
    const updated = [...savedFilters, newFilterObj];
    setSavedFilters(updated);
    localStorage.setItem("dashboard_saved_filters_v2", JSON.stringify(updated));
    setNewFilterName("");
    setShowSaveBox(false);
  };

  const deleteFilter = (index: number) => {
    const updated = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(updated);
    localStorage.setItem("dashboard_saved_filters_v2", JSON.stringify(updated));
  };

  const applySavedFilter = (f: any) => {
    setPeriod(f.period);
    if (f.selectedDate) setSelectedDate(f.selectedDate);
    if (f.startDate) setStartDate(f.startDate);
    if (f.endDate) setEndDate(f.endDate);
    if (f.month) setSelectedMonth(f.month);
    if (f.year) setSelectedYear(f.year);
    if (f.period === "Semana") {
      setWeekSelector("manual"); // prevent auto overwriting
    }
  };

  // Synchronize Semana preset automatically
  const selectWeekPreset = (weekCode: string, targetMonth: string, targetYear: string) => {
    if (weekCode === "manual") return;
    
    const yr = parseInt(targetYear, 10);
    let startD = "";
    let endD = "";
    
    if (weekCode === "w1") {
      startD = `${yr}-${targetMonth}-01`;
      endD = `${yr}-${targetMonth}-07`;
    } else if (weekCode === "w2") {
      startD = `${yr}-${targetMonth}-08`;
      endD = `${yr}-${targetMonth}-14`;
    } else if (weekCode === "w3") {
      startD = `${yr}-${targetMonth}-15`;
      endD = `${yr}-${targetMonth}-21`;
    } else if (weekCode === "w4") {
      startD = `${yr}-${targetMonth}-22`;
      endD = `${yr}-${targetMonth}-28`;
    } else if (weekCode === "w5") {
      startD = `${yr}-${targetMonth}-29`;
      const lastDay = new Date(yr, parseInt(targetMonth, 10), 0).getDate();
      endD = `${yr}-${targetMonth}-${String(lastDay).padStart(2, "0")}`;
    }
    
    setStartDate(startD);
    setEndDate(endD);
  };

  useEffect(() => {
    if (period === "Semana" && weekSelector !== "manual") {
      selectWeekPreset(weekSelector, selectedMonth, selectedYear);
    }
  }, [weekSelector, selectedMonth, selectedYear, period]);

  // Automatically enforce own unit isolation for non-master users and block "Todas" option
  useEffect(() => {
    if (userRole && userRole !== "admin_master" && userUnidadeId && selectedUnit !== userUnidadeId) {
      setSelectedUnit(userUnidadeId);
    }
  }, [userRole, userUnidadeId, selectedUnit, setSelectedUnit]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let query = `period=${period}&unitId=${selectedUnit}`;
      if (period === "Dia") {
        query += `&selectedDate=${selectedDate}`;
      } else if (period === "Semana") {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      } else if (period === "Mês") {
        query += `&month=${selectedMonth}&year=${selectedYear}`;
      } else if (period === "Ano") {
        query += `&year=${selectedYear}`;
      } else if (period === "Personalizado") {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(`/api/dashboard?${query}`, {
        headers: {
          "x-user-email": userEmail,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Erro ao carregar dados do dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period, selectedUnit, selectedDate, startDate, endDate, selectedMonth, selectedYear]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-white rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-mono text-sm">Carregando painel de indicadores...</p>
      </div>
    );
  }

  const { cards, ranking, dadosGraficoPeriodo, disponibilidadeKpis } = data;

  const renderComparisonBadge = (current: number, previous: number) => {
    if (!compareMode || !data || !data.previousCards) return null;
    try {
      const prev = previous ?? 0;
      const curr = current ?? 0;
      if (prev === 0 && curr === 0) return null;
      
      const diff = curr - prev;
      const isIncrease = diff > 0;
      const isZero = diff === 0;
      const pct = prev > 0 ? (diff / prev) * 100 : (curr > 0 ? 100 : 0);
      const pctStr = isZero ? "0%" : `${isIncrease ? "+" : ""}${pct.toFixed(1)}%`;
      
      return (
        <div className={`mt-1.5 text-[10px] font-mono flex items-center gap-1 font-bold w-fit rounded px-1.5 py-0.5 border ${
          isZero 
            ? "text-slate-400 bg-slate-800/10 border-slate-750/10" 
            : isIncrease 
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" 
              : "text-rose-400 bg-rose-500/10 border-rose-500/25"
        }`}>
          <span>{isZero ? "•" : isIncrease ? "▲" : "▼"}</span>
          <span>{pctStr} vs ant. ({prev})</span>
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  const hasNoData = !cards || (
    cards.entregasPrevistas === 0 &&
    cards.rotasFinalizadas === 0 &&
    cards.rotasEmAndamento === 0 &&
    cards.veiculosEmRota === 0 &&
    cards.veiculosDisponiveis === 0 &&
    cards.veiculosIndisponiveis === 0 &&
    cards.motoristasAtivos === 0
  );

  // Pie chart colors
  const COLORS = ["#0284c7", "#f43f5e", "#10b981"];
  const pieData = [
    { name: "Realizadas", value: cards.entregasRealizadas },
    { name: "Devoluções", value: cards.devolucoes },
    { name: "Pendentes", value: cards.entregasPendentes },
  ];

  const vehicleStatsData = [
    { name: "Em Rota", value: cards.veiculosEmRota, color: "#0284c7" },
    { name: "Disponíveis", value: cards.veiculosDisponiveis, color: "#10b981" },
    { name: "Indisponíveis (Bloqueados)", value: cards.veiculosIndisponiveis, color: "#f43f5e" },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Controls */}
      <h1 className="sr-only">Painel de Monitoramento</h1>
      <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              {activeTab === "desempenho" ? "Monitoramento Operacional" : "Dashboard Executivo Heineken SLA"}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {activeTab === "desempenho" 
                ? "Indicadores consolidados da operação logística de transportes de distribuição" 
                : "Visão estratégica de oferta de frota, ociosidade, aproveitamento e subutilização"}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Segmented Controller (Tab Switcher) */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab("desempenho")}
                className={`px-3 py-1.5 rounded transition ${
                  activeTab === "desempenho"
                    ? "bg-sky-500 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                📊 Desempenho Geral
              </button>
              <button
                onClick={() => setActiveTab("executivo")}
                className={`px-3 py-1.5 rounded transition ${
                  activeTab === "executivo"
                    ? "bg-sky-500 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                👑 Executivo (SLA)
              </button>
            </div>

            {/* Unit Filter */}
            <div className="flex items-center bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <MapPin className="w-4 h-4 text-sky-400 mr-2" />
              <select 
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                disabled={userRole !== "admin_master"}
                className={`bg-transparent text-sm text-white focus:outline-none font-sans ${userRole !== "admin_master" ? "opacity-75 cursor-not-allowed text-slate-300" : ""}`}
              >
                {userRole === "admin_master" ? (
                  <>
                    <option value="Todas" className="bg-slate-950">Todas as Unidades</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id} className="bg-slate-950">{u.nome}</option>
                    ))}
                  </>
                ) : (
                  unidades.filter((u: any) => u.id === userUnidadeId).map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-950">{u.nome}</option>
                  ))
                )}
              </select>
            </div>

            {/* Period Filter Buttons including Personalizado */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
              {(["Dia", "Semana", "Mês", "Ano", "Personalizado"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    period === p ? "bg-sky-500 text-white font-medium" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button 
              onClick={fetchDashboardData}
              className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Atualizar painel"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SUB FILTERS EXPANSION GRID */}
        {period === "Dia" && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 animate-fadeIn text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-450" />
              <span className="text-slate-300 font-medium font-mono">📅 Selecionar Data:</span>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Consulte qualquer dia do histórico de transportes</span>
          </div>
        )}

        {period === "Semana" && (
          <div className="flex flex-wrap items-center gap-4 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 animate-fadeIn text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-450" />
              <span className="text-slate-300 font-medium font-mono">Competência:</span>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              >
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-medium font-mono">Período Selecionado:</span>
              <select 
                value={weekSelector} 
                onChange={(e) => setWeekSelector(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs font-bold"
              >
                <option value="w1">Semana 1 (01 a 07)</option>
                <option value="w2">Semana 2 (08 a 14)</option>
                <option value="w3">Semana 3 (15 a 21)</option>
                <option value="w4">Semana 4 (22 a 28)</option>
                <option value="w5">Semana 5 (29 em diante)</option>
                <option value="manual">Intervalo Manual...</option>
              </select>
            </div>

            {weekSelector === "manual" && (
              <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                <span className="text-slate-400 font-mono">De:</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
                />
                <span className="text-slate-400 font-mono">Ate:</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
                />
              </div>
            )}
          </div>
        )}

        {period === "Mês" && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 animate-fadeIn text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-450" />
              <span className="text-slate-300 font-medium font-mono">📅 Selecionar Competência Mensal:</span>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              >
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          </div>
        )}

        {period === "Ano" && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 animate-fadeIn text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-450" />
              <span className="text-slate-300 font-medium font-mono">📅 Selecionar Exercício Anual:</span>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          </div>
        )}

        {period === "Personalizado" && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 animate-fadeIn text-xs">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-sky-450" />
              <span className="text-slate-300 font-medium font-mono">De:</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              />
              <span className="text-slate-300 font-medium font-mono">Até:</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono hidden md:inline">Visualize qualquer intervalo customizado de faturamento/operações</span>
          </div>
        )}

        {/* SAVED FILTERS & TELEMETRY TOGGLE BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-800/50 mt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold tracking-wider">💾 Filtros Gravados:</span>
            <div className="flex flex-wrap gap-1.5 items-center">
              {savedFilters.map((f, idx) => (
                <div key={idx} className="inline-flex items-center bg-slate-950/50 hover:bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-[11px] font-mono text-slate-300 transition gap-1.5">
                  <button type="button" onClick={() => applySavedFilter(f)} className="hover:text-white font-medium flex items-center gap-1">
                    🎯 {f.name}
                  </button>
                  <button type="button" onClick={() => deleteFilter(idx)} className="text-slate-500 hover:text-rose-400 font-sans font-bold leading-none scale-110 pl-0.5" title="Excluir filtro">
                    ×
                  </button>
                </div>
              ))}
              
              {!showSaveBox ? (
                <button 
                  onClick={() => setShowSaveBox(true)}
                  className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-md px-2.5 py-1 text-[11px] font-mono font-bold transition flex items-center gap-1"
                >
                  + Salvar Filtro Atual
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-md p-1">
                  <input 
                    type="text" 
                    placeholder="Nome do Filtro..."
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5 text-[11px] font-mono text-white focus:outline-none w-32"
                  />
                  <button 
                    onClick={() => saveFilterToStorage(newFilterName)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded px-2 py-0.5 text-[10px] font-bold"
                  >
                    Salvar
                  </button>
                  <button 
                    onClick={() => setShowSaveBox(false)}
                    className="text-slate-400 hover:text-white text-xs px-1"
                  >
                    Canc
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Compare metrics toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-mono text-slate-300 hover:text-white">
            <input 
              type="checkbox" 
              checked={compareMode}
              onChange={(e) => setCompareMode(e.target.checked)}
              className="rounded border-slate-800 text-sky-500 bg-slate-950 focus:ring-0 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              ⚖️ comparar com período anterior <span className="text-[10px] text-slate-500 font-normal">(telemetria de variação %)</span>
            </span>
          </label>
        </div>
      </div>

      {/* ANALYSED PERIOD BANNER */}
      {data?.rangeAnalyzed && (
        <div className="bg-slate-905 border border-slate-800/80 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="text-slate-400">PERÍODO ANALISADO:</span>
            <span className="text-white font-bold">{data.rangeAnalyzed.label}</span>
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:inline">Atualizado automaticamente em tempo de execução</span>
        </div>
      )}

      {hasNoData ? (
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 text-amber-500">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold font-mono text-amber-400 tracking-wider">
              NÃO HÁ INFORMAÇÕES PARA ESTA UNIDADE.
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Não foram encontrados lançamentos operacionais para esta filial no período selecionado.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: OPERACIONAL - DESEMPENHO DE ENTREGAS */}
          {activeTab === "desempenho" && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider">Entregas Previstas</span>
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-white tracking-tight">{cards.entregasPrevistas}</span>
                    <span className="block text-[10px] text-slate-500 mt-1">Carregado em DTs</span>
                    {renderComparisonBadge(cards.entregasPrevistas, data.previousCards?.entregasPrevistas)}
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider">Entregas Concluídas</span>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-white tracking-tight">{cards.entregasRealizadas}</span>
                    <span className="block text-[10px] text-emerald-500 mt-1">
                      {cards.entregasPrevistas > 0 ? `${Math.round((cards.entregasRealizadas / cards.entregasPrevistas) * 100)}% de eficácia` : "0% eficácia"}
                    </span>
                    {renderComparisonBadge(cards.entregasRealizadas, data.previousCards?.entregasRealizadas)}
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider">Entregas Pendentes</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-white tracking-tight">{cards.entregasPendentes}</span>
                    <span className="block text-[10px] text-slate-500 mt-1">Aguardando reporte</span>
                    {renderComparisonBadge(cards.entregasPendentes, data.previousCards?.entregasPendentes)}
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider">Devoluções / Recusas</span>
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-white tracking-tight">{cards.devolucoes}</span>
                    <span className="block text-[10px] text-rose-500 mt-1">
                      {cards.entregasPrevistas > 0 ? `${((cards.devolucoes / cards.entregasPrevistas) * 100).toFixed(1)}% rejeição` : "0% rejeição"}
                    </span>
                    {renderComparisonBadge(cards.devolucoes, data.previousCards?.devolucoes)}
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider">Rotas Ativas</span>
                    <Truck className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-white tracking-tight">{cards.rotasEmAndamento}</span>
                    <span className="block text-[10px] text-slate-500 mt-1">{cards.rotasFinalizadas} Concluídas</span>
                    {renderComparisonBadge(cards.rotasEmAndamento, data.previousCards?.rotasEmAndamento)}
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider">Motoristas Ativos</span>
                    <UserCheck className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-white tracking-tight">{cards.motoristasAtivos}</span>
                    <span className="block text-[10px] text-slate-500 mt-1">Liberados para carga</span>
                  </div>
                </div>
              </div>

              {/* MONITORAMENTO OPERACIONAL DE STATUS (DTs) */}
              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                      <span className="w-1.5 h-3.5 rounded bg-sky-500 inline-block"></span>
                      Módulo Vistoria & Monitoramento de DTs (Status Viagem)
                    </h3>
                    <p className="text-xs text-slate-400">Acompanhamento e controle das etapas operacionais de entregas em tempo real</p>
                  </div>
                  <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded font-bold uppercase w-fit">
                    Estado Operacional Geral
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-amber-500/20 transition">
                    <span className="text-slate-450 text-[10px] font-mono uppercase tracking-wider block">Ag. Carregamento</span>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xl font-bold text-white leading-none font-mono">
                        {cards.viagensAgCarregamento ?? 0}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse shrink-0"></span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-blue-500/20 transition">
                    <span className="text-slate-450 text-[10px] font-mono uppercase tracking-wider block font-bold text-sky-450">Em Carregamento</span>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xl font-bold text-white leading-none font-mono font-semibold">
                        {cards.viagensEmCarregamento ?? 0}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse shrink-0"></span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-purple-500/20 transition">
                    <span className="text-slate-450 text-[10px] font-mono uppercase tracking-wider block font-bold text-purple-400">Em Rota</span>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xl font-bold text-white leading-none font-mono font-semibold">
                        {cards.viagensEmRota ?? 0}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block animate-pulse shrink-0"></span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-orange-500/20 transition">
                    <span className="text-slate-450 text-[10px] font-mono uppercase tracking-wider block">Ag. Descarga</span>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xl font-bold text-white leading-none font-mono">
                        {cards.viagensAgDescarga ?? 0}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse shrink-0"></span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-emerald-500/20 transition">
                    <span className="text-slate-450 text-[10px] font-mono uppercase tracking-wider block font-bold text-emerald-450">Finalizadas</span>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xl font-bold text-white leading-none font-mono font-semibold">
                        {cards.viagensFinalizadas ?? 0}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-rose-500/20 transition">
                    <span className="text-slate-450 text-[10px] font-mono uppercase tracking-wider block">Canceladas</span>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xl font-bold text-white leading-none font-mono">
                        {cards.viagensCanceladas ?? 0}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0"></span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
                    <span className="text-slate-450 text-[10px] font-mono uppercase tracking-wider block">Veículo Quebrado</span>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xl font-bold text-white leading-none font-mono">
                        {cards.viagensVeiculoQuebrado ?? 0}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-slate-500 inline-block shrink-0"></span>
                    </div>
                  </div>
                </div>

                {/* VISUAL CHART FOR JOURNEYS DISTRIBUTION */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 pt-1">
                  <div className="lg:col-span-3 bg-slate-950 p-5 rounded-xl border border-slate-800">
                    <div className="mb-4 flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs font-semibold text-white tracking-tight uppercase font-mono">Gráfico Operacional: Status das Viagens</span>
                      <span className="text-[10px] text-slate-400 font-mono">Participação Operativa</span>
                    </div>

                    <div className="space-y-3">
                      {[
                        { name: "Aguardando Carregamento", value: cards.viagensAgCarregamento ?? 0, color: "#f59e0b" },
                        { name: "Em Carregamento", value: cards.viagensEmCarregamento ?? 0, color: "#3b82f6" },
                        { name: "Em Rota", value: cards.viagensEmRota ?? 0, color: "#a855f7" },
                        { name: "Aguardando Descarga", value: cards.viagensAgDescarga ?? 0, color: "#f97316" },
                        { name: "Finalizada", value: cards.viagensFinalizadas ?? 0, color: "#10b981" },
                        { name: "Cancelada", value: cards.viagensCanceladas ?? 0, color: "#ef4444" },
                        { name: "Veículo Quebrado", value: cards.viagensVeiculoQuebrado ?? 0, color: "#64748b" },
                      ].map((item, idx) => {
                        const totalJ = (cards.viagensAgCarregamento ?? 0) + (cards.viagensEmCarregamento ?? 0) + (cards.viagensEmRota ?? 0) + (cards.viagensAgDescarga ?? 0) + (cards.viagensFinalizadas ?? 0) + (cards.viagensCanceladas ?? 0) + (cards.viagensVeiculoQuebrado ?? 0);
                        const pctOfTotal = totalJ > 0 ? Math.round((item.value / totalJ) * 100) : 0;
                        return (
                          <div key={idx} className="space-y-1 text-xs">
                            <div className="flex justify-between items-center text-slate-300">
                              <span className="font-medium font-sans flex items-center gap-1.5 text-[11px]">
                                <span className="w-2 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                {item.name}
                              </span>
                              <span className="font-bold text-white font-mono text-[11px]">{item.value} ({pctOfTotal}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctOfTotal}%`, backgroundColor: item.color }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white tracking-tight uppercase font-mono block mb-2">Resumo de Expedições</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        Este gráfico de barras horizontais consolida dinamicamente o fluxo e distribuição operacional das entregas. As atualizações ocorrem em tempo real ao modificar o status de qualquer DT no painel de monitoramento.
                      </p>
                    </div>

                    <div className="border-t border-slate-800 pt-3.5 mt-4">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block">Total de DTs Ativas</span>
                      <span className="text-3xl font-extrabold text-white font-mono tracking-tight leading-none block mt-1">
                        {(cards.viagensAgCarregamento ?? 0) + (cards.viagensEmCarregamento ?? 0) + (cards.viagensEmRota ?? 0) + (cards.viagensAgDescarga ?? 0) + (cards.viagensFinalizadas ?? 0) + (cards.viagensCanceladas ?? 0) + (cards.viagensVeiculoQuebrado ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main interactive chart - deliveries vs devolucoes */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 lg:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">Evolução de Entregas</h3>
                      <p className="text-xs text-slate-400">Relação de entregas realizadas e devoluções notificadas</p>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2.5 py-1 rounded text-sky-400 font-mono">Histórico Semanal</span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGraficoPeriodo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", color: "#fff" }} 
                          itemStyle={{ fontSize: "12px" }}
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        <Bar dataKey="Entregas" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Entregas Realizadas" />
                        <Bar dataKey="Devolucoes" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Devoluções" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status distribution chart */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">Status de Entregas</h3>
                    <p className="text-xs text-slate-400">Percentual de finalização da carga</p>
                  </div>
                  
                  <div className="h-44 flex items-center justify-center my-2 relative">
                    {cards.entregasPrevistas > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData.filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieData.filter(d => d.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-slate-500 font-mono text-xs">Sem dados no período</div>
                    )}
                    
                    {/* Legend inside absolute */}
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-bold text-white">{cards.entregasRealizadas}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Concluídas</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-slate-800 pt-3 font-mono">
                    <div>
                      <span className="block text-sky-400 font-bold">{cards.entregasRealizadas}</span>
                      <span className="text-[10px] text-slate-500">Realizadas</span>
                    </div>
                    <div>
                      <span className="block text-rose-400 font-bold">{cards.devolucoes}</span>
                      <span className="text-[10px] text-slate-500">Devoluções</span>
                    </div>
                    <div>
                      <span className="block text-emerald-400 font-bold">{cards.entregasPendentes}</span>
                      <span className="text-[10px] text-slate-500">Pendentes</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Detail panels */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Driver Compliance */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-white tracking-tight">Conformidade dos Motoristas</h3>
                        <p className="text-xs text-slate-400">Verificação de requisitos obrigatórios</p>
                      </div>
                      <UserCheck className="w-4 h-4 text-sky-400" />
                    </div>

                    <div className="space-y-2.5 font-mono text-xs">
                      <div className="flex justify-between text-slate-300 border-b border-slate-800/40 pb-1.5 pt-1">
                        <span>Total:</span>
                        <span className="font-bold text-white">{cards.motoristasTotal ?? 0}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-450 inline-block"></span>
                          Liberados:
                        </span>
                        <span className="font-bold text-emerald-400">{cards.motoristasAtivos ?? 0}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-450 inline-block"></span>
                          Pendentes:
                        </span>
                        <span className="font-bold text-amber-500">{cards.motoristasPendentes ?? 0}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-450 inline-block"></span>
                          Bloqueados:
                        </span>
                        <span className="font-bold text-rose-500">{cards.motoristasBloqueados ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 p-3.5 bg-sky-950/40 rounded-lg border border-sky-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-sky-400" />
                      <div>
                        <span className="block text-[11px] text-slate-400 font-sans">Eficácia Geral</span>
                        <span className="text-[10px] text-slate-300 font-mono">Conformidade Ativa</span>
                      </div>
                    </div>
                    <span className="text-lg font-extrabold text-sky-400 font-mono">{cards.motoristasConformidade ?? 100}%</span>
                  </div>
                </div>

                {/* Fleet Durability */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">Status & Durabilidade Frota</h3>
                      <p className="text-xs text-slate-400">Totalizadores de veículos na filial</p>
                    </div>
                    <Truck className="w-4 h-4 text-slate-400" />
                  </div>
                  
                  <div className="space-y-3 font-mono text-xs mt-4">
                    {vehicleStatsData.map((stat, i) => {
                      const total = cards.veiculosEmRota + cards.veiculosDisponiveis + cards.veiculosIndisponiveis;
                      const percent = total > 0 ? Math.round((stat.value / total) * 100) : 0;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }}></span>
                              {stat.name}
                            </span>
                            <span className="font-bold text-white">{stat.value} ({percent}%)</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: stat.color }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="block text-[11px] text-slate-400 font-sans">Não Roteirizados</span>
                        <span className="text-xs text-slate-300 font-mono font-bold">Aguardando DT</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-amber-400 font-mono">{cards.veiculosNaoRoteirizados}</span>
                  </div>
                </div>

                {/* Leaderboard - Ranking de Motoristas */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 lg:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">Ranking de Produtividade dos Motoristas</h3>
                      <p className="text-xs text-slate-400">Top performance com base em entregas bem sucedidas</p>
                    </div>
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
                          <th className="py-2.5 px-3">Class.</th>
                          <th className="py-2.5 px-3">Nome do Profissional</th>
                          <th className="py-2.5 px-3 text-center">Rotas</th>
                          <th className="py-2.5 px-3 text-right">Qtd Entregue</th>
                          <th className="py-2.5 px-3 text-right">Recusas</th>
                          <th className="py-2.5 px-3 text-right">Eficácia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {ranking.length > 0 ? (
                          ranking.slice(0, 5).map((d: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition">
                              <td className="py-3 px-3 font-mono font-bold text-slate-300">
                                {idx === 0 ? "🏆" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`}
                              </td>
                              <td className="py-3 px-3 font-medium text-white">{d.nome}</td>
                              <td className="py-3 px-3 text-center font-mono text-slate-300">{d.rotas}</td>
                              <td className="py-3 px-3 text-right font-mono text-sky-400 font-bold">{d.entregasRealizadas}</td>
                              <td className="py-3 px-3 text-right font-mono text-rose-400">{d.devolucoes}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  d.produtividade >= 90 ? "bg-emerald-500/10 text-emerald-400" :
                                  d.produtividade >= 75 ? "bg-sky-500/10 text-sky-400" : "bg-amber-500/10 text-amber-400"
                                }`}>
                                  {d.produtividade}%
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-500 font-mono">
                              Nenhuma rota registrada no período para avaliar produtividade dos motoristas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: EXECUTIVO - DISPONIBILIDADE & APROVEITAMENTO OPERACIONAL (SLA HEINEKEN) */}
          {activeTab === "executivo" && (
            <div className="space-y-6">
              
              {/* 7 Requested Executive KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                
                {/* Card 1: Disponibilizados Hoje */}
                <div id="exec-disp-hoje" className="bg-slate-900 p-4 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Oferecidos Hoje</span>
                  <div>
                    <span className="text-2xl font-black text-sky-400 tracking-tight mt-1 mr-1">{disponibilidadeKpis?.disponibilizadosHoje ?? 0}</span>
                    <span className="text-[9px] text-slate-500 block font-mono mt-1">Frota declarada</span>
                  </div>
                </div>

                {/* Card 2: Roteirizados Hoje */}
                <div id="exec-rot-hoje" className="bg-slate-900 p-4 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Roteirizados Hoje</span>
                  <div>
                    <span className="text-2xl font-black text-emerald-450 tracking-tight mt-1 mr-1">{disponibilidadeKpis?.roteirizadosHoje ?? 0}</span>
                    <span className="text-[9px] text-slate-500 block font-mono mt-1">Carregados em DT</span>
                  </div>
                </div>

                {/* Card 3: Ociosos Hoje */}
                <div id="exec-ocioso-hoje" className="bg-slate-900 p-4 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Ociosos Hoje</span>
                  <div>
                    <span className="text-2xl font-black text-amber-500 tracking-tight mt-1 mr-1">{disponibilidadeKpis?.naoUtilizadosHoje ?? 0}</span>
                    <span className="text-[9px] text-slate-550 block font-mono mt-1">Subutilização</span>
                  </div>
                </div>

                {/* Card 4: Aproveitamento Hoje */}
                <div id="exec-rate-hoje" className="bg-slate-900 p-4 border border-slate-800 rounded-xl flex flex-col justify-between relative overflow-hidden">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Aproveit. Hoje</span>
                  <div>
                    <span className="text-2xl font-black text-white tracking-tight mt-1 mr-1">{disponibilidadeKpis?.aproveitamentoHoje ?? 0}%</span>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-sky-500 h-full" style={{ width: `${disponibilidadeKpis?.aproveitamentoHoje ?? 0}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Card 5: Disponibilizados no Mês */}
                <div id="exec-disp-mes" className="bg-slate-900 p-4 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Oferecidos no Mês</span>
                  <div>
                    <span className="text-2xl font-black text-sky-400 tracking-tight mt-1 mr-1">{disponibilidadeKpis?.disponibilizadosMes ?? 0}</span>
                    <span className="text-[9px] text-slate-500 block font-mono mt-1">Consolidado Junho</span>
                  </div>
                </div>

                {/* Card 6: Roteirizados no Mês */}
                <div id="exec-rot-mes" className="bg-slate-900 p-4 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Roteirizados Mês</span>
                  <div>
                    <span className="text-2xl font-black text-emerald-400 tracking-tight mt-1 mr-1">{disponibilidadeKpis?.roteirizadosMes ?? 0}</span>
                    <span className="text-[9px] text-slate-500 block font-mono mt-1">Utilizados em DT</span>
                  </div>
                </div>

                {/* Card 7: Aproveitamento Mensal */}
                <div id="exec-rate-mes" className="bg-slate-900 p-4 border border-slate-800 rounded-xl flex flex-col justify-between relative overflow-hidden">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Aproveit. Mensal</span>
                  <div>
                    <span className="text-2xl font-black text-white tracking-tight mt-1 mr-1">{disponibilidadeKpis?.aproveitamentoMes ?? 0}%</span>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-emerald-500 h-full" style={{ width: `${disponibilidadeKpis?.aproveitamentoMes ?? 0}%` }}></div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 6 Requested Charts in a gorgeous Dashboard grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Diagram 1: Aproveitamento Diário */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">1. Evolução do Aproveitamento Diário (%)</h3>
                    <span className="text-[9px] bg-sky-950 border border-sky-900 text-sky-450 px-2 py-0.5 rounded font-mono font-semibold">Tendência</span>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={disponibilidadeKpis?.aproveitamentoDiario} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                        <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: "#000", border: "1px solid #222", fontSize: "11px", color: "#fff" }} />
                        <Line type="monotone" dataKey="Aproveitamento %" stroke="#38bdf8" strokeWidth={3} dot={{ fill: "#38bdf8", r: 4 }} name="Aproveitamento %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Diagram 2: Aproveitamento Mensal */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">2. Evolução de Aproveitamento por Mês (%)</h3>
                    <span className="text-[9px] bg-emerald-950 border border-emerald-900 text-emerald-450 px-2 py-0.5 rounded font-mono font-semibold">Acumulado</span>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={disponibilidadeKpis?.aproveitamentoMensal} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                        <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: "#000", border: "1px solid #222", fontSize: "11px", color: "#fff" }} />
                        <Bar dataKey="Aproveitamento %" fill="#10b981" radius={[4, 4, 0, 0]} name="Aproveitamento %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Diagram 3: Aproveitamento Anual */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">3. Evolução de Aproveitamento por Ano (%)</h3>
                    <span className="text-[9px] bg-indigo-950 border border-indigo-900 text-indigo-450 px-2 py-0.5 rounded font-mono font-semibold">Anual</span>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={disponibilidadeKpis?.aproveitamentoAnual} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                        <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: "#000", border: "1px solid #222", fontSize: "11px", color: "#fff" }} />
                        <Bar dataKey="Aproveitamento %" fill="#6366f1" radius={[4, 4, 0, 0]} name="Aproveitamento %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Diagram 4: Oferta Real vs Alocada */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">4. Oferta Real vs Alocada (Roteirizados)</h3>
                    <span className="text-[9px] bg-slate-800 text-sky-400 px-2 py-0.5 rounded font-mono font-semibold">Volume Absoluto</span>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={disponibilidadeKpis?.aproveitamentoDiario} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                        <YAxis stroke="#475569" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: "#000", border: "1px solid #222", fontSize: "11px", color: "#fff" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="Disponibilizados" fill="#0284c7" name="Oferecidos/Disponibilizados" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="Roteirizados" fill="#10b981" name="Utilizados em DTs" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Diagram 5: Ociosidade Crítica */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">5. Ociosidade Crítica (Veículos Ociosos)</h3>
                    <span className="text-[9px] bg-amber-950 border border-amber-900 text-amber-500 px-2 py-0.5 rounded font-mono font-semibold">Subalocação</span>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={disponibilidadeKpis?.veiculosOciosos} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                        <YAxis stroke="#475569" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: "#000", border: "1px solid #222", fontSize: "11px", color: "#fff" }} />
                        <Bar dataKey="Ociosos" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Sobras Ociosas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Diagram 6: Eficiência por Filial */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">6. Aproveitamento por Filial (%)</h3>
                    <span className="text-[9px] bg-purple-950 border border-purple-900 text-purple-400 px-2 py-0.5 rounded font-mono font-semibold">Unidades</span>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={disponibilidadeKpis?.aproveitamentoUnidade} margin={{ left: 15, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis type="number" domain={[0, 100]} stroke="#475569" fontSize={10} />
                        <YAxis type="category" dataKey="name" stroke="#475569" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: "#000", border: "1px solid #222", fontSize: "11px", color: "#fff" }} />
                        <Bar dataKey="Aproveitamento %" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Aproveitamento %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* SEÇÃO CORPORATIVA: CONTROLE DE VALES & INCONFORMIDADES */}
              <div className="space-y-4 pt-6 border-t border-slate-800">
                <div className="text-left">
                  <h2 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-rose-505 rounded-full animate-pulse" />
                    📋 Controle de Vales, Faltas & Inconformidades Corporativas
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Sincronismo de quebras financeiras e multas de cargas registradas via encerramento no Sistema Ampla.
                  </p>
                </div>

                {/* Grid 1: Cinco Novos Cards de Vales e Fechamentos de DT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
                  {/* Card 1: DTs Fechadas */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">🔒 DTs Fechadas (Total)</span>
                      <strong className="text-2xl font-black text-sky-400 tracking-tight block mt-1 font-mono">
                        {data?.valesKpis?.totalDtsFechadas ?? 0}
                      </strong>
                    </div>
                    <p className="text-[9px] text-slate-500 block font-mono mt-2">Fechamentos registrados</p>
                  </div>

                  {/* Card 2: DTs Fechadas Sem Vale */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">🟢 Fechadas Sem Vale</span>
                      <strong className="text-2xl font-black text-emerald-400 tracking-tight block mt-1 font-mono">
                        {data?.valesKpis?.totalDtsFechadasSemVale ?? 0}
                      </strong>
                    </div>
                    <p className="text-[9px] text-slate-500 block font-mono mt-2">Encerramentos sem multas</p>
                  </div>

                  {/* Card 3: DTs Fechadas Com Vale */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">🔴 Fechadas Com Vale</span>
                      <strong className="text-2xl font-black text-rose-500 tracking-tight block mt-1 font-mono">
                        {data?.valesKpis?.totalDtsFechadasComVale ?? 0}
                      </strong>
                    </div>
                    <p className="text-[9px] text-slate-500 block font-mono mt-2">Carga com falta mercadoria</p>
                  </div>

                  {/* Card 4: DTs Com Devolução */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">🟡 Com Devolução</span>
                      <strong className="text-2xl font-black text-yellow-500 tracking-tight block mt-1 font-mono">
                        {data?.valesKpis?.totalDtsComDevolucao ?? 0}
                      </strong>
                    </div>
                    <p className="text-[9px] text-slate-500 block font-mono mt-2">Retornos/Recusas integradas</p>
                  </div>

                  {/* Card 5: Valor Total de Vales */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between col-span-1 sm:col-span-2 lg:col-span-1">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">💰 Valor Total de Vales</span>
                      <strong className="text-lg font-black text-rose-400 tracking-tight block mt-1.5 font-mono">
                        R$ {Number(data?.valesKpis?.totalValorVales || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <p className="text-[9px] text-slate-500 block font-mono mt-2">Total financeiro faturado</p>
                  </div>
                </div>

                {/* Grid 2: Evolução de Vales & Leaderboards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
                  
                  {/* Chart: Evolução Mensal */}
                  <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">📊 Evolução Mensal de Vales</h3>
                      <span className="text-[9px] bg-slate-850 text-sky-400 px-2 py-0.5 rounded font-mono font-semibold">Consolidado Financeiro</span>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.valesKpis?.evolucaoMensalVales || []} margin={{ left: -10, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                          <YAxis stroke="#475569" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: "#000", border: "1px solid #222", fontSize: "11px", color: "#fff" }} />
                          <Bar dataKey="valor" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Prejuízos (R$)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Leaderboards side by side */}
                  <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
                    
                    {/* Top 3 Motoristas */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-305 font-mono flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-rose-400" />
                        🚛 Motoristas com mais Vales
                      </h4>
                      {(!data?.valesKpis?.topMotoristasVales || data.valesKpis.topMotoristasVales.length === 0) ? (
                        <p className="text-[10px] text-slate-500 italic font-mono p-2 bg-slate-950/20 rounded">Sem registros no período.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {data.valesKpis.topMotoristasVales.slice(0, 3).map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850/60">
                              <span className="text-[10px] text-slate-300 font-semibold truncate max-w-[155px]" title={item.name}>{item.name}</span>
                              <span className="text-[10px] font-mono font-bold text-rose-400">R$ {item.valor.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Top 3 Unidades */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-305 font-mono flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        🏢 Unidades com mais Vales
                      </h4>
                      {(!data?.valesKpis?.topUnidadesVales || data.valesKpis.topUnidadesVales.length === 0) ? (
                        <p className="text-[10px] text-slate-500 italic font-mono p-2 bg-slate-950/20 rounded">Sem registros no período.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {data.valesKpis.topUnidadesVales.slice(0, 3).map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850/60">
                              <span className="text-[10px] text-slate-300 font-semibold truncate max-w-[155px]" title={item.name}>{item.name}</span>
                              <span className="text-[10px] font-mono font-bold text-yellow-500">R$ {item.valor.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
}
