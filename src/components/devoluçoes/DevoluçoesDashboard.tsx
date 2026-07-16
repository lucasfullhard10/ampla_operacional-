import React from "react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from "recharts";
import { TrendingDown, Percent, AlertCircle, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { DevolucaoRegistro } from "../../types";

interface DashboardProps {
  registros: DevolucaoRegistro[];
  unidades: any[];
}

export default function DevolucoesDashboard({ registros, unidades }: DashboardProps) {
  // Aggregate stats
  const totalCount = registros.length;
  const totalValue = registros.reduce((sum, r) => sum + (r.valorNF || 0), 0);
  const resolvedCount = registros.filter(r => r.status === "Resolvida").length;
  const pendingCount = registros.filter(r => r.status === "Pendente").length;
  const resolutionRate = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0;

  // Let's assume a standard monthly billing target or total invoices to calculate return rate (e.g., 1.2% mock or simulated limit of 1.5%)
  const simulatedTotalValue = totalValue * 65; // Simulated total sales
  const returnRate = simulatedTotalValue > 0 ? (totalValue / simulatedTotalValue) * 100 : 0;

  // Group by Unidade
  const unitStats = unidades.map(u => {
    const unitRecords = registros.filter(r => r.unidadeId === u.id);
    const count = unitRecords.length;
    const value = unitRecords.reduce((sum, r) => sum + (r.valorNF || 0), 0);
    return {
      name: u.nome || u.id,
      volume: count,
      valor: value
    };
  }).filter(item => item.volume > 0);

  // Group by Motivo (Reason)
  const reasonMap: Record<string, { count: number; value: number; desc: string }> = {};
  registros.forEach(r => {
    const code = r.motivoCodigo || "Outros";
    if (!reasonMap[code]) {
      reasonMap[code] = { count: 0, value: 0, desc: r.motivoDescricao || "Outros" };
    }
    reasonMap[code].count++;
    reasonMap[code].value += r.valorNF || 0;
  });

  const reasonStats = Object.entries(reasonMap).map(([code, item]) => ({
    name: `${code} - ${item.desc.substring(0, 15)}...`,
    code,
    volume: item.count,
    valor: item.value
  })).sort((a, b) => b.valor - a.valor);

  // Group by Date for trend (last 7 days of activity)
  const dateMap: Record<string, { date: string; volume: number; valor: number }> = {};
  // Pre-populate last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const formattedDate = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    dateMap[dateStr] = { date: formattedDate, volume: 0, valor: 0 };
  }

  registros.forEach(r => {
    const rDate = r.data;
    if (dateMap[rDate]) {
      dateMap[rDate].volume++;
      dateMap[rDate].valor += r.valorNF || 0;
    } else if (rDate) {
      // If outside last 7 days but valid, parse for date
      const d = new Date(rDate + "T12:00:00");
      if (!isNaN(d.getTime())) {
        const formattedDate = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        dateMap[rDate] = { date: formattedDate, volume: 1, valor: r.valorNF || 0 };
      }
    }
  });

  const trendStats = Object.values(dateMap).slice(-10);

  // Top Drivers with returns
  const driverMap: Record<string, { nome: string; count: number; value: number }> = {};
  registros.forEach(r => {
    const driver = r.motoristaNome || "Não Informado";
    if (!driverMap[driver]) {
      driverMap[driver] = { nome: driver, count: 0, value: 0 };
    }
    driverMap[driver].count++;
    driverMap[driver].value += r.valorNF || 0;
  });
  const topDrivers = Object.values(driverMap).sort((a, b) => b.value - a.value).slice(0, 5);

  // Top Customers with returns
  const customerMap: Record<string, { nome: string; count: number; value: number }> = {};
  registros.forEach(r => {
    const client = r.clienteNomeFantasia || r.clienteRazaoSocial || "Desconhecido";
    if (!customerMap[client]) {
      customerMap[client] = { nome: client, count: 0, value: 0 };
    }
    customerMap[client].count++;
    customerMap[client].value += r.valorNF || 0;
  });
  const topCustomers = Object.values(customerMap).sort((a, b) => b.value - a.value).slice(0, 5);

  // COLORS for charts
  const PIE_COLORS = ["#38bdf8", "#0284c7", "#0ea5e9", "#075985", "#0c4a6e", "#60a5fa", "#2563eb", "#1d4ed8"];

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Devoluções */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl translate-x-8 -translate-y-8 group-hover:bg-sky-500/10 transition-all duration-300"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider uppercase">Frequência Total</span>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100 tracking-tight">{totalCount}</span>
            <span className="text-xs text-slate-500">devoluções</span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs">
            <span className="text-sky-400 font-mono font-medium flex items-center">
              {pendingCount} Pendentes
            </span>
            <span className="text-slate-600 font-mono">|</span>
            <span className="text-emerald-400 font-mono font-medium">
              {resolvedCount} Resolvidas
            </span>
          </div>
        </div>

        {/* Valor Total Devoluções */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl translate-x-8 -translate-y-8 group-hover:bg-sky-500/10 transition-all duration-300"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider uppercase">Impacto Financeiro</span>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-slate-400">R$</span>
            <span className="text-3xl font-extrabold text-slate-100 tracking-tight">
              {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-mono">Média de R$ {totalCount > 0 ? (totalValue / totalCount).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "0"} por nota</span>
          </div>
        </div>

        {/* Taxa de Devolução */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl translate-x-8 -translate-y-8 group-hover:bg-sky-500/10 transition-all duration-300"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider uppercase">Índice Devolução</span>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-100 tracking-tight">
              {returnRate.toFixed(2)}%
            </span>
            <span className="text-xs text-slate-500">do faturamento</span>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs">
            {returnRate <= 1.5 ? (
              <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" /> Sob controle (Meta max 1.5%)
              </span>
            ) : (
              <span className="text-rose-400 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> Acima da meta (Limite 1.5%)
              </span>
            )}
          </div>
        </div>

        {/* Taxa de Resolução */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl translate-x-8 -translate-y-8 group-hover:bg-sky-500/10 transition-all duration-300"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider uppercase">Eficiência Resolução</span>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-100 tracking-tight">
              {resolutionRate.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">resolvidos</span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-mono">{resolvedCount} resolvidas de {totalCount} casos</span>
          </div>
        </div>
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Histórico Temporal */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 font-mono uppercase tracking-wider">Evolução Diária de Ocorrências (Últimos Dias)</h3>
          <div className="h-[280px]">
            {totalCount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendStats}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0b1329", borderColor: "#1e293b", borderRadius: "8px", color: "#f8fafc" }}
                    labelClassName="text-sky-400 font-semibold text-xs font-mono"
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="valor" name="Valor Retornado (R$)" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  <Line type="monotone" dataKey="volume" name="Qtd Ocorrências" stroke="#38bdf8" strokeWidth={1.5} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                Nenhum dado cadastrado para exibir evolução temporal.
              </div>
            )}
          </div>
        </div>

        {/* Divisão por Motivo */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 font-mono uppercase tracking-wider">Principais Motivos</h3>
          <div className="flex-1 min-h-[200px] flex items-center justify-center">
            {reasonStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="valor"
                    nameKey="code"
                  >
                    {reasonStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number) => `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    contentStyle={{ backgroundColor: "#0b1329", borderColor: "#1e293b", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-500 font-mono text-xs">Sem dados de motivos</span>
            )}
          </div>
          <div className="mt-2 space-y-1.5 max-h-[110px] overflow-y-auto scrollbar-thin">
            {reasonStats.slice(0, 4).map((entry, idx) => (
              <div key={entry.code} className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                  <span className="text-slate-300 truncate">{entry.code} - {entry.name.split("-")[1]?.replace("...", "") || "Outros"}</span>
                </div>
                <span className="text-slate-400 font-semibold text-[11px]">R$ {entry.valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visão de Filiais e Listas Críticas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retorno por Unidade */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 font-mono uppercase tracking-wider">Volume e Valor por Unidade</h3>
          <div className="h-[220px]">
            {unitStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" orientation="left" stroke="#38bdf8" fontSize={10} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#0b1329", borderColor: "#1e293b", borderRadius: "8px" }} />
                  <Bar yAxisId="left" dataKey="valor" name="Valor (R$)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="volume" name="Qtd Casos" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                Nenhum registro por filial encontrado.
              </div>
            )}
          </div>
        </div>

        {/* Top Motoristas / Clientes Críticos */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3.5 font-mono uppercase tracking-wider">Top Motoristas (Por Valor de Devolução)</h3>
          <div className="space-y-3">
            {topDrivers.length > 0 ? (
              topDrivers.map((item, idx) => (
                <div key={item.nome} className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60 hover:border-slate-800 transition-colors">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-5 h-5 flex items-center justify-center bg-slate-800 text-sky-400 font-mono font-bold text-xs rounded-full">{idx + 1}</span>
                    <span className="text-xs font-semibold text-slate-300 truncate">{item.nome}</span>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <div className="text-[11px] font-bold text-slate-200">R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-[9px] text-slate-500">{item.count} ocorrência{item.count > 1 ? "s" : ""}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500 font-mono text-xs">
                Nenhum motorista registrado.
              </div>
            )}
          </div>
        </div>

        {/* Top Clientes Críticos */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3.5 font-mono uppercase tracking-wider">Top Clientes Críticos</h3>
          <div className="space-y-3">
            {topCustomers.length > 0 ? (
              topCustomers.map((item, idx) => (
                <div key={item.nome} className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60 hover:border-slate-800 transition-colors">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-5 h-5 flex items-center justify-center bg-slate-800 text-rose-400 font-mono font-bold text-xs rounded-full">{idx + 1}</span>
                    <span className="text-xs font-semibold text-slate-300 truncate">{item.nome}</span>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <div className="text-[11px] font-bold text-slate-200">R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-[9px] text-slate-500">{item.count} caso{item.count > 1 ? "s" : ""}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500 font-mono text-xs">
                Nenhum cliente registrado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
