import React from "react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { 
  TrendingDown, DollarSign, FileText, Clock, CheckCircle2, 
  AlertTriangle, XCircle, Building2, User, Users, HelpCircle 
} from "lucide-react";
import { DevolucaoRegistro } from "../../types";

interface DashboardProps {
  registros: DevolucaoRegistro[];
  unidades: any[];
}

export default function DevolucoesDashboard({ registros, unidades }: DashboardProps) {
  // 1. STATS CALCULATION
  const totalCount = registros.length;
  const totalValue = registros.reduce((sum, r) => sum + (Number(r.valorNF) || 0), 0);
  const totalNFs = new Set(registros.map(r => r.numeroNF).filter(Boolean)).size || totalCount;

  // Status breakdown
  const resolvedCount = registros.filter(r => r.status === "Resolvida").length;
  const pendingCount = registros.filter(r => 
    r.status === "Pendente" || r.status === "Aguardando Tratativa"
  ).length;
  const inProgressCount = registros.filter(r => 
    ["Em Análise", "Em Atendimento", "Aguardando Comercial"].includes(r.status)
  ).length;
  const canceledCount = registros.filter(r => r.status === "Cancelada").length;

  // 2. CHART DATA CALCULATIONS
  
  // A. Chart por Mês (Evolution by month)
  const monthMap: Record<string, { monthKey: string; monthName: string; count: number; value: number }> = {};
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const mName = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).toUpperCase();
    monthMap[mKey] = { monthKey: mKey, monthName: mName, count: 0, value: 0 };
  }

  registros.forEach(r => {
    const dateStr = r.dataOcorrido || r.data;
    if (dateStr && dateStr.length >= 7) {
      const mKey = dateStr.substring(0, 7);
      if (!monthMap[mKey]) {
        const parts = mKey.split("-");
        const monthIndex = parseInt(parts[1], 10) - 1;
        const yearShort = parts[0]?.substring(2);
        const dateObj = new Date(parseInt(parts[0], 10), monthIndex, 1);
        const mName = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase() + "/" + yearShort
          : mKey;
        monthMap[mKey] = { monthKey: mKey, monthName: mName, count: 0, value: 0 };
      }
      monthMap[mKey].count += 1;
      monthMap[mKey].value += Number(r.valorNF) || 0;
    }
  });

  const monthChartData = Object.values(monthMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  // B. Chart por Motivo
  const reasonMap: Record<string, { code: string; desc: string; count: number; value: number }> = {};
  registros.forEach(r => {
    const code = r.motivoCodigo || "Outros";
    const desc = r.motivoDescricao || "Motivo Não Informado";
    if (!reasonMap[code]) {
      reasonMap[code] = { code, desc, count: 0, value: 0 };
    }
    reasonMap[code].count += 1;
    reasonMap[code].value += Number(r.valorNF) || 0;
  });

  const reasonChartData = Object.values(reasonMap)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map(item => ({
      name: `${item.code} - ${item.desc.length > 18 ? item.desc.substring(0, 18) + "..." : item.desc}`,
      code: item.code,
      desc: item.desc,
      count: item.count,
      value: item.value
    }));

  // C. Chart por Filial
  const filialMap: Record<string, { filial: string; count: number; value: number }> = {};
  registros.forEach(r => {
    const fId = r.filial || r.unidadeId || "Goiânia";
    const uObj = unidades.find(u => u.id === fId);
    const fName = uObj?.nome || uObj?.cidade || fId;
    if (!filialMap[fName]) {
      filialMap[fName] = { filial: fName, count: 0, value: 0 };
    }
    filialMap[fName].count += 1;
    filialMap[fName].value += Number(r.valorNF) || 0;
  });

  const filialChartData = Object.values(filialMap).sort((a, b) => b.value - a.value);

  // D. Chart Top Clientes
  const clientMap: Record<string, { client: string; count: number; value: number }> = {};
  registros.forEach(r => {
    const cName = r.clienteNomeFantasia || r.clienteRazaoSocial || r.clienteNome || r.clienteCodigo || "Cliente Desconhecido";
    if (!clientMap[cName]) {
      clientMap[cName] = { client: cName, count: 0, value: 0 };
    }
    clientMap[cName].count += 1;
    clientMap[cName].value += Number(r.valorNF) || 0;
  });

  const topClientesData = Object.values(clientMap)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(item => ({
      name: item.client.length > 20 ? item.client.substring(0, 20) + "..." : item.client,
      count: item.count,
      value: item.value
    }));

  // E. Chart Top Motoristas
  const driverMap: Record<string, { driver: string; count: number; value: number }> = {};
  registros.forEach(r => {
    const dName = r.motoristaNome || r.motoristaMatricula || "Motorista Não Informado";
    if (!driverMap[dName]) {
      driverMap[dName] = { driver: dName, count: 0, value: 0 };
    }
    driverMap[dName].count += 1;
    driverMap[dName].value += Number(r.valorNF) || 0;
  });

  const topMotoristasData = Object.values(driverMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(item => ({
      name: item.driver.length > 20 ? item.driver.substring(0, 20) + "..." : item.driver,
      count: item.count,
      value: item.value
    }));

  const PIE_COLORS = ["#38bdf8", "#0284c7", "#0ea5e9", "#075985", "#38bdf8", "#60a5fa"];

  return (
    <div className="space-y-6">
      {/* 1. SEÇÃO DE CARDS KPIS (7 CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Card 1: Total Devoluções */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider">Total Dev.</span>
            <div className="p-1.5 bg-sky-500/10 rounded-md text-sky-400">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-100 font-mono tracking-tight block">
              {totalCount}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Registros</span>
          </div>
        </div>

        {/* Card 2: Valor Total */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider">Valor Total</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-emerald-400 font-mono tracking-tight block truncate">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Valor Acumulado</span>
          </div>
        </div>

        {/* Card 3: Qtd NFs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider">Qtd. NFs</span>
            <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-100 font-mono tracking-tight block">
              {totalNFs}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Notas Afetadas</span>
          </div>
        </div>

        {/* Card 4: Pendentes */}
        <div className="bg-slate-900/80 border border-rose-900/40 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-rose-400">Pendentes</span>
            <div className="p-1.5 bg-rose-500/10 rounded-md text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-400 font-mono tracking-tight block">
              {pendingCount}
            </span>
            <span className="text-[10px] text-rose-300/70 font-mono">Sem Tratativa</span>
          </div>
        </div>

        {/* Card 5: Em Andamento */}
        <div className="bg-slate-900/80 border border-amber-900/40 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-amber-400">Em Andamento</span>
            <div className="p-1.5 bg-amber-500/10 rounded-md text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-400 font-mono tracking-tight block">
              {inProgressCount}
            </span>
            <span className="text-[10px] text-amber-300/70 font-mono">Em Tratativa</span>
          </div>
        </div>

        {/* Card 6: Resolvidas */}
        <div className="bg-slate-900/80 border border-emerald-900/40 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-emerald-400">Resolvidas</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight block">
              {resolvedCount}
            </span>
            <span className="text-[10px] text-emerald-300/70 font-mono">Finalizadas</span>
          </div>
        </div>

        {/* Card 7: Canceladas */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Canceladas</span>
            <div className="p-1.5 bg-slate-800 rounded-md text-slate-400">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-400 font-mono tracking-tight block">
              {canceledCount}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Anuladas</span>
          </div>
        </div>
      </div>

      {/* 2. GRÁFICOS (5 GRÁFICOS ORGANIZADOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Evolução Mensal (BarChart / AreaChart) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-sky-400" /> Gráfico Por Mês (Evolução em R$)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Valores acumulados de devolução nos últimos meses.</p>
            </div>
          </div>
          <div className="h-[240px]">
            {monthChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthChartData}>
                  <defs>
                    <linearGradient id="colorMonthVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="monthName" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `R$${v >= 1000 ? (v/1000).toFixed(0) + "k" : v}`} />
                  <Tooltip 
                    formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Valor Devolvido"]}
                    contentStyle={{ backgroundColor: "#0b1329", borderColor: "#1e293b", borderRadius: "8px", color: "#f8fafc" }}
                  />
                  <Area type="monotone" dataKey="value" name="Valor (R$)" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorMonthVal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                Sem histórico de datas suficiente.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Gráfico por Motivo */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2 mb-1">
              <HelpCircle className="w-4 h-4 text-sky-400" /> Gráfico Por Motivo
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">Principais motivos Y-Codes registrados.</p>
          </div>
          <div className="h-[180px] flex items-center justify-center">
            {reasonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="code"
                  >
                    {reasonChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Valor"]}
                    contentStyle={{ backgroundColor: "#0b1329", borderColor: "#1e293b", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-500 font-mono text-xs">Sem dados de motivos</span>
            )}
          </div>
          <div className="space-y-1.5 max-h-[80px] overflow-y-auto scrollbar-thin mt-2">
            {reasonChartData.slice(0, 3).map((r, idx) => (
              <div key={r.code} className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 truncate text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                  {r.code} - {r.desc}
                </span>
                <span className="text-sky-400 font-bold text-[11px]">R$ {r.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Terceira Linha de Gráficos: Filial, Top Clientes e Top Motoristas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gráfico 3: Gráfico por Filial */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-emerald-400" /> Gráfico Por Filial
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">Devoluções acumuladas por unidade.</p>
          <div className="h-[180px]">
            {filialChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filialChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `R$${v >= 1000 ? (v/1000).toFixed(0) + "k" : v}`} />
                  <YAxis type="category" dataKey="filial" stroke="#94a3b8" fontSize={10} width={80} />
                  <Tooltip formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Valor"]} contentStyle={{ backgroundColor: "#0b1329", borderColor: "#1e293b", borderRadius: "8px" }} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">Sem dados de filial.</div>
            )}
          </div>
        </div>

        {/* Gráfico 4: Top Clientes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-amber-400" /> Top Clientes (Valor)
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">Maiores clientes em valor devolvido.</p>
          <div className="h-[180px]">
            {topClientesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClientesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `R$${v >= 1000 ? (v/1000).toFixed(0) + "k" : v}`} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={90} />
                  <Tooltip formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Valor"]} contentStyle={{ backgroundColor: "#0b1329", borderColor: "#1e293b", borderRadius: "8px" }} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">Sem dados de clientes.</div>
            )}
          </div>
        </div>

        {/* Gráfico 5: Top Motoristas */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-indigo-400" /> Top Motoristas (Volume)
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">Motoristas com maior nº de devoluções.</p>
          <div className="h-[180px]">
            {topMotoristasData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMotoristasData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} precision={0} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={90} />
                  <Tooltip formatter={(v: any) => [`${v} devoluções`, "Qtd"]} contentStyle={{ backgroundColor: "#0b1329", borderColor: "#1e293b", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">Sem dados de motoristas.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
