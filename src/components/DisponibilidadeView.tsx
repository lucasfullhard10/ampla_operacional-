import React, { useState, useEffect } from "react";
import { 
  Calendar, Save, FileSpreadsheet, RefreshCcw, Search, UserCheck, 
  AlertCircle, Check, MapPin, Truck, ChevronRight, BarChart2, FileText, 
  TrendingUp, Activity, HelpCircle, Lock, Edit3
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  LineChart, Line, AreaChart, Area
} from "recharts";
import { Veiculo, Motorista, Disponibilidade, Unidade } from "../types";
import { NotificationModal, NotificationType } from "./NotificationModal";
import SafeResponsiveContainer from "./SafeResponsiveContainer";

interface DisponibilidadeProps {
  veiculos: Veiculo[];
  motoristas: Motorista[];
  userEmail: string;
}

export default function DisponibilidadeView({ veiculos, motoristas, userEmail }: DisponibilidadeProps) {
  // Notification Modal State
  const [notification, setNotification] = useState<NotificationType | null>(null);

  // Query Filters State
  const [selectedDate, setSelectedDate] = useState("2026-06-12");
  const [periodFilter, setPeriodFilter] = useState<"Dia" | "Semana" | "Mês" | "Ano" | "Customizada">("Dia");
  const [startDate, setStartDate] = useState("2026-06-08");
  const [endDate, setEndDate] = useState("2026-06-14");
  const [selectedUnit, setSelectedUnit] = useState("Todas");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");

  // DB Availability declarations for current selected parameters
  const [rawDisps, setRawDisps] = useState<any[]>([]);
  const [units, setUnits] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"cadastro" | "registros" | "ociosidade" | "relatorios" | "graficos" | "historico">("cadastro");
  const [savingMotId, setSavingMotId] = useState<string | null>(null);

  // Local state for registering availability (Form Checked States for a selected date)
  // plate/veiculoId -> { isAvailable: boolean, priority: "Alta" | "Média" | "Baixa", driverId: string }
  const [formState, setFormState] = useState<Record<string, { isAvailable: boolean; priority: "Alta" | "Média" | "Baixa"; driverId: string }>>({});
  
  // Local state for optional reasons in the ociosidade list
  const [motiveInputs, setMotiveInputs] = useState<Record<string, string>>({});

  // Local states for custom operational flows
  const [editingDriverRows, setEditingDriverRows] = useState<Record<string, boolean>>({});
  const [selectedHistVehicle, setSelectedHistVehicle] = useState("");
  const [registrySearchText, setRegistrySearchText] = useState("");

  // PDF Preview window/print trigger state
  const [pdfPrintData, setPdfPrintData] = useState<any | null>(null);

  useEffect(() => {
    // Fetch units to check admin_master privilege & unit options
    const fetchUnitsAndConfig = async () => {
      try {
        const res = await fetch("/api/unidades", {
          headers: { "x-user-email": userEmail }
        });
        if (res.ok) {
          const data = await res.json() as Unidade[];
          setUnits(data);
          if (data.length === 1) {
            setSelectedUnit(data[0].id);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar unidades", e);
      }
    };
    fetchUnitsAndConfig();
  }, [userEmail]);

  // Fetch registered availabilities matching active filter boundaries
  const fetchAvailabilities = async () => {
    const isRegistersOrOtherTabs = activeTab !== "cadastro";
    setLoading(true);
    try {
      let queryUrl = `/api/disponibilidade?unidadeId=${selectedUnit}&veiculoId=${selectedVehicle}&motoristaId=${selectedDriver}`;
      
      if (isRegistersOrOtherTabs) {
        // Load the full year range dynamically so search queries by day, month, year work seamlessly
        queryUrl += `&periodo=Ano&date=${selectedDate}`;
      } else {
        if (periodFilter === "Dia") {
          queryUrl += `&date=${selectedDate}`;
        } else if (periodFilter === "Semana") {
          queryUrl += `&periodo=Semana&date=${selectedDate}`;
        } else if (periodFilter === "Mês") {
          queryUrl += `&periodo=Mês&date=${selectedDate}`;
        } else if (periodFilter === "Ano") {
          queryUrl += `&periodo=Ano&date=${selectedDate}`;
        } else if (periodFilter === "Customizada") {
          queryUrl += `&startDate=${startDate}&endDate=${endDate}`;
        }
      }

      const res = await fetch(queryUrl, {
        headers: { "x-user-email": userEmail }
      });
      if (res.ok) {
        const data = await res.json() as Disponibilidade[];
        setRawDisps(data);

        // Prepopulate mapping reasons for ociosidade list
        const motives: Record<string, string> = {};
        data.forEach(d => {
          if (d.motivoOciosidade) {
            motives[d.id] = d.motivoOciosidade;
          }
        });
        setMotiveInputs(motives);

        // For the single selected date registering form, we map form state based on the selectedDate fetch
        if (isRegistersOrOtherTabs || periodFilter === "Dia") {
          const newState: Record<string, { isAvailable: boolean; priority: "Alta" | "Média" | "Baixa"; driverId: string }> = {};
          
          // Only show vehicles that belong to the active filtered unit
          const targetVehicles = selectedUnit === "Todas" ? veiculos : veiculos.filter(v => v.unidadeId === selectedUnit);
          
          targetVehicles.forEach((v) => {
            const match = data.find((d) => d.veiculoId === v.id && d.data === selectedDate);
            newState[v.id] = {
              isAvailable: !!match,
              priority: match ? match.prioridade : "Média",
              driverId: match ? match.motoristaId : (v.motoristaId || ""),
            };
          });
          setFormState(newState);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar disponibilidade:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailabilities();
  }, [selectedDate, periodFilter, startDate, endDate, selectedUnit, selectedVehicle, selectedDriver, veiculos, activeTab]);

  // Form event handlers
  const handleToggleAvailable = (vId: string) => {
    setFormState((prev) => ({
      ...prev,
      [vId]: {
        ...prev[vId],
        isAvailable: !prev[vId]?.isAvailable,
      },
    }));
  };

  const handlePriorityChange = (vId: string, prio: "Alta" | "Média" | "Baixa") => {
    setFormState((prev) => ({
      ...prev,
      [vId]: {
        ...prev[vId],
        priority: prio,
      },
    }));
  };

  const handleDriverChange = (vId: string, dId: string) => {
    setFormState((prev) => ({
      ...prev,
      [vId]: {
        ...prev[vId],
        driverId: dId,
      },
    }));
  };

  // Save the checked vehicles as the Day's Operational Oferta
  const handleSave = async () => {
    if (!selectedDate) {
      setNotification({
        type: "error",
        message: "ATENÇÃO: É obrigatório selecionar a DATA DA DISPONIBILIDADE * no topo antes de salvar."
      });
      return;
    }

    setSaving(true);
    const payloadList: Array<Partial<Disponibilidade>> = [];

    // Filter vehicle lists belonging to the target saving unit
    const targetUnit = selectedUnit === "Todas" ? (units[0]?.id || "un-go") : selectedUnit;

    Object.entries(formState).forEach(([veiculoId, val]) => {
      const v = val as any;
      if (v.isAvailable) {
        const vObj = veiculos.find(v => v.id === veiculoId);
        payloadList.push({
          data: selectedDate,
          veiculoId,
          unidadeId: vObj ? vObj.unidadeId : targetUnit,
          prioridade: v.priority || "Média",
          motoristaId: v.driverId,
          roteirizado: false, // will cross-reference on fetch
          motivoOciosidade: motiveInputs[`disp-${veiculoId}`] || ""
        });
      }
    });

    try {
      const res = await fetch("/api/disponibilidade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify(payloadList),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: "✅ Registro salvo com sucesso."
        });
        fetchAvailabilities();
        setActiveTab("registros");
      } else {
        const err = await res.json();
        setNotification({
          type: "error",
          message: `Erro ao tentar salvar: ${err.error || "Erro desconhecido"}`
        });
      }
    } catch (e) {
      console.error(e);
      setNotification({
        type: "error",
        message: "Houve uma falha inesperada de comunicação com o servidor."
      });
    } finally {
      setSaving(false);
    }
  };

  // Update specific motivo in the ociosidade reasons list
  const handleSaveMotive = async (dispId: string, text: string) => {
    setSavingMotId(dispId);
    try {
      const res = await fetch(`/api/disponibilidade/${dispId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({ motivoOciosidade: text })
      });
      if (res.ok) {
        // Update local list state
        setRawDisps(prev => prev.map(d => d.id === dispId ? { ...d, motivoOciosidade: text } : d));
        // Simple success notification
        setNotification({
          type: "success",
          message: "Motivo da ociosidade da frota registrado com sucesso."
        });
      } else {
        setNotification({
          type: "error",
          message: "Falha ao registrar motivo. Tente novamente."
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingMotId(null);
    }
  };

  // Calculations for Indicators
  const countDisponibilizados = rawDisps.length;
  const countRoteirizados = rawDisps.filter(d => d.roteirizado).length;
  const countNaoRoteirizados = Math.max(0, countDisponibilizados - countRoteirizados);
  const taxaAproveitamento = countDisponibilizados > 0 
    ? Math.round((countRoteirizados / countDisponibilizados) * 100) 
    : 0;

  // Monthly Report consolidator (Groups by YYYY-MM)
  const getMonthlyReport = () => {
    const groups: Record<string, { disp: number; rot: number; idle: number }> = {};
    rawDisps.forEach((d) => {
      const monthKey = d.data.slice(0, 7); // "2026-06"
      if (!groups[monthKey]) {
        groups[monthKey] = { disp: 0, rot: 0, idle: 0 };
      }
      groups[monthKey].disp++;
      if (d.roteirizado) {
        groups[monthKey].rot++;
      } else {
        groups[monthKey].idle++;
      }
    });

    return Object.entries(groups).map(([monthKey, val]) => {
      const parts = monthKey.split("-");
      const names = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const monthName = parts.length === 2 ? `${names[parseInt(parts[1], 10) - 1]} ${parts[0]}` : monthKey;
      const rate = val.disp > 0 ? Math.round((val.rot / val.disp) * 100) : 0;
      return { key: monthKey, name: monthName, ...val, aproveitamento: rate };
    }).sort((a, b) => b.key.localeCompare(a.key));
  };

  // Annual Report consolidator (Groups by YYYY)
  const getAnnualReport = () => {
    const groups: Record<string, { disp: number; rot: number; idle: number }> = {};
    rawDisps.forEach((d) => {
      const yearKey = d.data.slice(0, 4); // "2026"
      if (!groups[yearKey]) {
        groups[yearKey] = { disp: 0, rot: 0, idle: 0 };
      }
      groups[yearKey].disp++;
      if (d.roteirizado) {
        groups[yearKey].rot++;
      } else {
        groups[yearKey].idle++;
      }
    });

    return Object.entries(groups).map(([yearKey, val]) => {
      const rate = val.disp > 0 ? Math.round((val.rot / val.disp) * 100) : 0;
      return { name: yearKey, ...val, aproveitamento: rate };
    }).sort((a, b) => b.name.localeCompare(a.name));
  };

  // Export spreadsheet format (CSV)
  const handleExportSpreadsheet = (format: "csv" | "excel") => {
    const headers = [
      "ID Disponibilidade", 
      "Data", 
      "Unidade Filial", 
      "Placa Veiculo", 
      "ID Motorista", 
      "Motorista Escalado", 
      "Prioridade Escala", 
      "Status Cruzamento DT", 
      "Motivo de Ociosidade"
    ];

    const rows = rawDisps.map(d => {
      const v = veiculos.find(x => x.id === d.veiculoId);
      const mot = motoristas.find(x => x.id === d.motoristaId);
      const u = units.find(x => x.id === d.unidadeId);
      return [
        d.id,
        d.data,
        u ? u.nome : d.unidadeId,
        v ? v.placa : d.veiculoId,
        d.motoristaId,
        mot ? mot.nome : "Sem motorista",
        d.prioridade,
        d.roteirizado ? "ROTEIRIZADO" : "NÃO ROTEIRIZADO",
        d.motivoOciosidade || ""
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Heineken_Auditoria_Oferta_Frota_${selectedDate}.${format === "excel" ? "xlsx" : "csv"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Preview Builder Modal
  const triggerPdfGeneration = () => {
    const docData = {
      title: "RELATÓRIO OPERACIONAL DE DISPONIBILIDADE E APROVEITAMENTO DE FROTA",
      sub: "Documento de Auditoria Operacional - Distribuição Heineken",
      periodoText: periodFilter === "Dia" ? `Data Base: ${formatDatePt(selectedDate)}` : `Período: ${periodFilter} (${formatDatePt(startDate)} - ${formatDatePt(endDate)})`,
      unidadeText: selectedUnit === "Todas" ? "Todas as filiais operacionais" : (units.find(u => u.id === selectedUnit)?.nome || selectedUnit),
      timestamp: new Date().toLocaleString("pt-BR"),
      metrics: {
        total: countDisponibilizados,
        roteirizados: countRoteirizados,
        naoRoteirizados: countNaoRoteirizados,
        taxa: taxaAproveitamento
      },
      records: rawDisps.map(d => {
        const v = veiculos.find(x => x.id === d.veiculoId);
        const mot = motoristas.find(x => x.id === d.motoristaId);
        const u = units.find(x => x.id === d.unidadeId);
        return {
          data: formatDatePt(d.data),
          unidade: u ? u.nome : d.unidadeId,
          veiculo: `${v?.placa || d.veiculoId} (${v?.modelo || ""})`,
          motorista: mot ? mot.nome : "Não escalado",
          prioridade: d.prioridade,
          status: d.roteirizado ? "ROTEIRIZADO" : "NÃO UTILIZADO (OCIOSO)",
          motivo: d.motivoOciosidade || "-"
        };
      })
    };
    setPdfPrintData(docData);
  };

  // Helper date formatting
  const formatDatePt = (dtStr: string) => {
    if (!dtStr) return "-";
    const pts = dtStr.split("-");
    if (pts.length !== 3) return dtStr;
    return `${pts[2]}/${pts[1]}/${pts[0]}`;
  };

  const getWeekRange = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const day = d.getDay(); // 0 is Sunday, 1 is Monday ...
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = (n: number) => String(n).padStart(2, "0");
    const mondayStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    const sundayStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
    return { start: mondayStr, end: sundayStr };
  };

  const isSpecificDateQuery = (text: string) => {
    const clean = text.trim();
    if (!clean || clean.length !== 10) return false;
    const pts = clean.split("/");
    return pts.length === 3 && /^\d+$/.test(pts[0]) && /^\d+$/.test(pts[1]) && /^\d+$/.test(pts[2]);
  };
  
  const isSpecificMonthQuery = (text: string) => {
    const clean = text.trim();
    if (!clean || clean.length !== 7) return false;
    const pts = clean.split("/");
    return pts.length === 2 && /^\d+$/.test(pts[0]) && /^\d+$/.test(pts[1]);
  };

  const isSpecificVehicleQuery = (text: string) => {
    const clean = text.trim().toUpperCase();
    if (!clean) return false;
    return veiculos.some(v => v.placa.toUpperCase() === clean || v.id.toUpperCase() === clean);
  };

  const isSpecificYearQuery = (text: string) => {
    const clean = text.trim();
    return clean.length === 4 && /^\d+$/.test(clean);
  };

  const filterByActivePeriod = (list: any[]) => {
    let filtered = list;
    if (selectedUnit && selectedUnit !== "Todas") {
      filtered = filtered.filter(x => x.unidadeId === selectedUnit || x.unidade === selectedUnit);
    }
    
    if (periodFilter === "Dia") {
      filtered = filtered.filter(x => x.data === selectedDate);
    } else if (periodFilter === "Semana") {
      const range = getWeekRange(selectedDate);
      filtered = filtered.filter(x => x.data >= range.start && x.data <= range.end);
    } else if (periodFilter === "Mês") {
      const prefix = selectedDate.slice(0, 7);
      filtered = filtered.filter(x => x.data.startsWith(prefix));
    } else if (periodFilter === "Ano") {
      const prefix = selectedDate.slice(0, 4);
      filtered = filtered.filter(x => x.data.startsWith(prefix));
    } else if (periodFilter === "Customizada") {
      filtered = filtered.filter(x => x.data >= startDate && x.data <= endDate);
    }
    
    if (selectedVehicle) {
      filtered = filtered.filter(x => x.veiculoId === selectedVehicle);
    }
    if (selectedDriver) {
      filtered = filtered.filter(x => x.motoristaId === selectedDriver);
    }
    
    return filtered;
  };

  // Interactive Graph calculations:
  // 1. Aproveitamento Diário mapping
  const dailyDates = Array.from(new Set(rawDisps.map(d => d.data))).sort() as string[];
  const graphAproveitamentoDiario = dailyDates.map(date => {
    const dayItems = rawDisps.filter(d => d.data === date);
    const disp = dayItems.length;
    const rot = dayItems.filter(d => d.roteirizado).length;
    return {
      name: formatDatePt(date).slice(0, 5),
      "Roteirização %": disp > 0 ? Math.round((rot / disp) * 100) : 0,
    };
  });

  // 2. Aproveitamento Mensal mapping
  const graphAproveitamentoMensal = getMonthlyReport().map(m => ({
    name: m.name.split(" ")[0],
    "Roteirização %": m.aproveitamento
  })).reverse();

  // 3. Aproveitamento Anual mapping
  const graphAproveitamentoAnual = getAnnualReport().map(y => ({
    name: y.name,
    "Aproveitamento %": y.aproveitamento
  }));

  // 4. Volume Disponibilizados x Roteirizados per Day
  const graphDispVsRot = dailyDates.map(date => {
    const dayItems = rawDisps.filter(d => d.data === date);
    return {
      name: formatDatePt(date).slice(0, 5),
      Disponibilizados: dayItems.length,
      Roteirizados: dayItems.filter(d => d.roteirizado).length,
    };
  });

  // 5. Veículos Ociosos count per Day
  const graphOciosos = dailyDates.map(date => {
    const dayItems = rawDisps.filter(d => d.data === date);
    return {
      name: formatDatePt(date).slice(0, 5),
      Ociosos: Math.max(0, dayItems.length - dayItems.filter(d => d.roteirizado).length)
    };
  });

  // 6. aproveitamento por Unidade
  const graphAproveitamentoUnidade = Array.from(new Set(rawDisps.map(d => d.unidadeId))).map(uId => {
    const uItems = rawDisps.filter(d => d.unidadeId === uId);
    const disp = uItems.length;
    const rot = uItems.filter(d => d.roteirizado).length;
    const uObj = units.find(u => u.id === uId);
    return {
      name: uObj ? uObj.nome : uId,
      "Aproveitamento %": disp > 0 ? Math.round((rot / disp) * 100) : 0
    };
  }).sort((a, b) => b["Aproveitamento %"] - a["Aproveitamento %"]);

  return (
    <div className="space-y-6">
      
      {/* SEÇÃO 1: PAINEL DE CONSULTAS E FILTROS */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-400" />
              Auditoria de Oferta & Código de Disponibilidade
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Controle de frotas oferecidas, auditadas e integradas com monitoramento (Heineken SLA)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={triggerPdfGeneration}
              className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800 text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileText className="w-4 h-4" />
              Relatório PDF
            </button>
            <button
              onClick={() => handleExportSpreadsheet("excel")}
              className="px-3.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel / CSV
            </button>
            <button
              onClick={fetchAvailabilities}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
              title="Recarregar dados"
            >
              <RefreshCcw className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Grade de seleções de filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 font-mono text-xs text-slate-350">
          
          {/* Unidade */}
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex flex-col justify-center">
            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-sky-400" /> Filial / Unidade
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="bg-transparent text-white focus:outline-none w-full cursor-pointer font-sans"
            >
              <option value="Todas" className="bg-slate-950">Todas as Unidades</option>
              {units.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-950">{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Periodicidade */}
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex flex-col justify-center">
            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Período de Análise</label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="bg-transparent text-white focus:outline-none w-full cursor-pointer font-sans font-medium"
            >
              <option value="Dia" className="bg-slate-950">Apenas por Dia</option>
              <option value="Semana" className="bg-slate-950">Semana (12 Jun)</option>
              <option value="Mês" className="bg-slate-950">Mês Atual (Junho)</option>
              <option value="Ano" className="bg-slate-950">Ano Base (2026)</option>
              <option value="Customizada" className="bg-slate-950">Período Personalizado</option>
            </select>
          </div>

          {/* Dinâmico conforme periodicidade */}
          {periodFilter === "Dia" ? (
            <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex flex-col justify-center">
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Selecione o Dia</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none font-mono"
              />
            </div>
          ) : periodFilter === "Customizada" ? (
            <div className="bg-slate-950/80 p-2 rounded border border-slate-800 col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 uppercase font-bold mb-1 block">Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-white focus:outline-none font-mono w-full"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase font-bold mb-1 block">Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-white focus:outline-none font-mono w-full"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex flex-col justify-center text-slate-500 italic text-[11px]">
              Filtro ativo por {periodFilter === "Semana" ? "Semanal (8-14 Jun 2026)" : periodFilter === "Mês" ? "Mensal (Junho 2026)" : "Anual (Ano 2026)"}
            </div>
          )}

          {/* Filtro específico Veículo */}
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex flex-col justify-center">
            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Buscar por Veículo</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="bg-transparent text-white focus:outline-none w-full cursor-pointer font-sans"
            >
              <option value="" className="bg-slate-950">Todos os veículos</option>
              {veiculos.map(v => (
                <option key={v.id} value={v.id} className="bg-slate-950">{v.placa} - {v.modelo}</option>
              ))}
            </select>
          </div>

          {/* Filtro específico Motorista */}
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex flex-col justify-center">
            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Buscar por Motorista</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="bg-transparent text-white focus:outline-none w-full cursor-pointer font-sans"
            >
              <option value="" className="bg-slate-950">Todos motoristas</option>
              {motoristas.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-950">{m.nome}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* SEÇÃO 2: PAINEL DE INDICADORES AUTOMÁTICOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Veículos Disponibilizados */}
        <div id="metric-disponibilizados" className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="block text-slate-400 text-[10px] uppercase font-mono tracking-wider font-bold">Indicador de Oferta</span>
            <span className="text-3xl font-extrabold text-sky-400 tracking-tight block mt-1.5">{countDisponibilizados}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-3 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-sky-500" />
            Veículos Disponibilizados
          </div>
        </div>

        {/* Veículos Roteirizados */}
        <div id="metric-roteirizados" className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="block text-slate-400 text-[10px] uppercase font-mono tracking-wider font-bold">Veículos Roteirizados</span>
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight block mt-1.5">{countRoteirizados}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-3 flex items-center gap-1">
            <Check className="w-4 h-4 text-emerald-500" />
            Efetivamente em DTs
          </div>
        </div>

        {/* Frotas Ociosas */}
        <div id="metric-ociosos" className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="block text-slate-400 text-[10px] uppercase font-mono tracking-wider font-bold">Frotas Ociosas / Sobras</span>
            <span className="text-3xl font-extrabold text-amber-500 tracking-tight block mt-1.5">{countNaoRoteirizados}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-3 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            Disponíveis e Não Utilizadas
          </div>
        </div>

        {/* Taxa de Aproveitamento */}
        <div id="metric-aproveitamento" className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div>
            <span className="block text-slate-400 text-[10px] uppercase font-mono tracking-wider font-bold">Taxa de Aproveitamento</span>
            <span className="text-3xl font-extrabold text-white tracking-tight block mt-1.5">{taxaAproveitamento}%</span>
          </div>
          {/* Progress bar overlay representation */}
          <div className="mt-3.5 space-y-1">
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="bg-sky-500 h-full transition-all duration-500" 
                style={{ width: `${taxaAproveitamento}%` }}
              ></div>
            </div>
            <span className="text-[9px] text-slate-500 block font-mono">Fórmula: Roteirizados ÷ Disponibilizados × 100</span>
          </div>
        </div>

      </div>

      {/* SEÇÃO 3: ABAS DE NAVEGAÇÃO INTERNA MÓDULO */}
      <div className="border-b border-slate-800 flex flex-wrap gap-2 pt-2">
        <button
          onClick={() => setActiveTab("cadastro")}
          className={`py-2 px-4 text-xs font-semibold rounded-t-lg transition font-mono ${
            activeTab === "cadastro"
              ? "bg-slate-900 border-t-2 border-sky-500 text-sky-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          📝 Declarar Disponibilidade
        </button>
        <button
          onClick={() => setActiveTab("registros")}
          className={`py-2 px-4 text-xs font-semibold rounded-t-lg transition font-mono ${
            activeTab === "registros"
              ? "bg-slate-900 border-t-2 border-sky-500 text-sky-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          🔍 Agenda & Auditoria ({countDisponibilizados})
        </button>
        <button
          onClick={() => setActiveTab("historico")}
          className={`py-2 px-4 text-xs font-semibold rounded-t-lg transition font-mono ${
            activeTab === "historico"
              ? "bg-slate-900 border-t-2 border-sky-500 text-sky-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          🚗 Histórico por Veículo
        </button>
        <button
          onClick={() => setActiveTab("ociosidade")}
          className={`py-2 px-4 text-xs font-semibold rounded-t-lg transition font-mono ${
            activeTab === "ociosidade"
              ? "bg-slate-900 border-t-2 border-sky-500 text-sky-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          ⚠️ Lista de Ociosidade ({countNaoRoteirizados})
        </button>
        <button
          onClick={() => setActiveTab("relatorios")}
          className={`py-2 px-4 text-xs font-semibold rounded-t-lg transition font-mono ${
            activeTab === "relatorios"
              ? "bg-slate-900 border-t-2 border-sky-500 text-sky-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          📊 Relatórios Consolidados
        </button>
        <button
          onClick={() => setActiveTab("graficos")}
          className={`py-2 px-4 text-xs font-semibold rounded-t-lg transition font-mono ${
            activeTab === "graficos"
              ? "bg-slate-900 border-t-2 border-sky-500 text-sky-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          📈 Gráficos Heineken SLA
        </button>
      </div>
      
      {activeTab === "cadastro" && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden space-y-4 p-4">
          
          {/* Prominent mandatory Date select at the top of the registration panel */}
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 space-y-2">
            <label className="block text-slate-300 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              DATA DA DISPONIBILIDADE <span className="text-red-500 font-black text-sm">*</span>
            </label>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (!e.target.value) {
                    setNotification({
                      type: "error",
                      message: "Atenção: A data é obrigatória para registrar a disponibilidade diária."
                    });
                  }
                }}
                className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 w-full md:max-w-xs"
                required
              />
              <span className="text-slate-450 text-[11px] font-mono">
                * Campo obrigatório. Os veículos selecionados abaixo serão vinculados a esta data para auditoria de SLA da Heineken.
              </span>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Declarar Disponibilidade da Frota</h3>
                <p className="text-[10px] text-slate-450">
                  Marque apenas os veículos disponíveis operacionais para a data base {formatDatePt(selectedDate)}
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-xs bg-slate-950/40 px-3 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400 font-mono text-[10px]">Filial ativa:</span>
                <span className="text-sky-400 font-bold font-sans">
                  {selectedUnit === "Todas" ? "Goiânia (Padrão)" : (units.find(u => u.id === selectedUnit)?.nome || selectedUnit)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px] bg-slate-950/40">
                    <th className="py-3 px-4">Disponível? (Marcar)</th>
                    <th className="py-3 px-4">Placa</th>
                    <th className="py-3 px-4">Modelo e Configuração</th>
                    <th className="py-3 px-4">Filial Origem</th>
                    <th className="py-3 px-4">Prioridade de Alocação</th>
                    <th className="py-3 px-4">Motorista Escalado / Vinculado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {(selectedUnit === "Todas" ? veiculos : veiculos.filter(v => v.unidadeId === selectedUnit)).map((v) => {
                    const sVal = formState[v.id] || { isAvailable: false, priority: "Média", driverId: "" };
                    const libDrivers = motoristas.filter(m => m.statusFinal === "LIBERADO" && m.unidadeId === v.unidadeId);
                    const motObj = motoristas.find(m => m.id === sVal.driverId);
                    const uName = units.find(u => u.id === v.unidadeId)?.nome || v.unidadeId;

                    return (
                      <tr 
                        key={v.id} 
                        className={`hover:bg-slate-800/10 transition ${
                          sVal.isAvailable ? "bg-sky-950/10 hover:bg-sky-950/15" : ""
                        }`}
                      >
                        {/* Checkbox toggler */}
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sVal.isAvailable}
                              onChange={() => handleToggleAvailable(v.id)}
                              className="w-4.5 h-4.5 rounded border-slate-800 text-sky-500 accent-sky-500 cursor-pointer"
                            />
                            <span className={sVal.isAvailable ? "text-sky-400 font-bold" : "text-slate-500 font-normal"}>
                              {sVal.isAvailable ? "☑ Sim" : "☐ Não"}
                            </span>
                          </label>
                        </td>

                        {/* Plate */}
                        <td className="py-3.5 px-4">
                          <span className="bg-white text-slate-950 px-2 py-0.5 rounded border border-slate-350 font-bold font-mono text-xs">
                            {v.placa}
                          </span>
                        </td>

                        {/* Model & Config */}
                        <td className="py-3.5 px-4 text-slate-200">
                          <div className="font-medium">{v.modelo}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{v.perfil} • {v.tipo}</div>
                        </td>

                        {/* Unit name */}
                        <td className="py-3.5 px-4 font-sans text-slate-300 font-medium">{uName}</td>

                        {/* Priority change */}
                        <td className="py-3.5 px-4">
                          {sVal.isAvailable ? (
                            <div className="flex gap-1">
                              {(["Alta", "Média", "Baixa"] as const).map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => handlePriorityChange(v.id, p)}
                                  className={`px-2 py-0.5 text-[9px] rounded font-mono transition ${
                                    sVal.priority === p
                                      ? p === "Alta" ? "bg-red-500 text-white" : p === "Média" ? "bg-sky-500 text-white" : "bg-slate-600 text-white"
                                      : "bg-slate-850 hover:bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-550 italic">Não disponível</span>
                          )}
                        </td>

                        {/* Client scaling: Motorista: Renato [ALTERAR MOTORISTA] */}
                        <td className="py-3.5 px-4">
                          {sVal.isAvailable ? (
                            <div className="flex flex-col gap-1.5 max-w-[240px]">
                              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                <span className="font-mono text-slate-450 select-none">Motorista:</span>
                                <span className="font-bold text-slate-100">{motObj ? motObj.nome : "Renato"}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingDriverRows(prev => ({ ...prev, [v.id]: !prev[v.id] }))}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-400 font-bold font-mono rounded transition border border-slate-700 w-max inline-flex items-center gap-1"
                              >
                                {editingDriverRows[v.id] ? "✓ CONCLUIR" : "ALTERAR MOTORISTA"}
                              </button>
                              
                              {editingDriverRows[v.id] && (
                                <select
                                  value={sVal.driverId}
                                  onChange={(e) => handleDriverChange(v.id, e.target.value)}
                                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none w-full mt-1 font-sans"
                                >
                                  <option value="">Nenhum Escalado (Ocioso)</option>
                                  {libDrivers.map(m => (
                                    <option key={m.id} value={m.id}>{m.nome}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-550 italic">Desabilitado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex justify-between items-center gap-4 flex-wrap">
            <span className="text-[11px] text-slate-400 font-mono">
              * Apenas veículos com CNH, Licenciamento e Seguro em conformidade na filial selecionada estão listados.
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-550 disabled:bg-slate-850 disabled:text-slate-500 text-white font-bold text-xs rounded transition flex items-center gap-1.5"
            >
              <Save className="w-4.5 h-4.5" />
              {saving ? "Salvando Oferta..." : "SALVAR DISPONIBILIDADE"}
            </button>
          </div>
        </div>
      )}

      {/* ABA 2: CONSULTA AGENDA & REGISTROS */}
      {activeTab === "registros" && (() => {
        const term = registrySearchText.trim().toLowerCase();
        
        const isDate = isSpecificDateQuery(registrySearchText);
        const isMonth = isSpecificMonthQuery(registrySearchText);
        const isVehicle = isSpecificVehicleQuery(registrySearchText);
        const isYear = isSpecificYearQuery(registrySearchText);
        
        const getSearchedRegistros = () => {
          if (!term) {
            return filterByActivePeriod(rawDisps);
          }
          
          if (isVehicle) {
            return rawDisps.filter(d => {
              const vObj = veiculos.find(x => x.id === d.veiculoId);
              return vObj?.placa.toLowerCase() === term || d.veiculoId.toLowerCase() === term;
            });
          }
          
          if (isDate) {
            const parts = term.split("/");
            const formattedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            return rawDisps.filter(d => d.data === formattedDate || d.data_disponibilidade === formattedDate);
          }
          
          if (isMonth) {
            const parts = term.split("/");
            const formattedMonth = `${parts[1]}-${parts[0].padStart(2, "0")}`; // YYYY-MM
            return rawDisps.filter(d => d.data.startsWith(formattedMonth) || (d.data_disponibilidade && d.data_disponibilidade.startsWith(formattedMonth)));
          }
          
          if (isYear) {
            return rawDisps.filter(d => d.data.startsWith(term) || (d.data_disponibilidade && d.data_disponibilidade.startsWith(term)));
          }
          
          return rawDisps.filter(d => {
            const vObj = veiculos.find(x => x.id === d.veiculoId);
            const mObj = motoristas.find(x => x.id === d.motoristaId);
            const uObj = units.find(x => x.id === d.unidadeId);
            
            const plate = vObj?.placa.toLowerCase() || "";
            const model = vObj?.modelo.toLowerCase() || "";
            const driver = mObj?.nome.toLowerCase() || "";
            const unit = uObj?.nome.toLowerCase() || "";
            const datePt = formatDatePt(d.data);
            
            return plate.includes(term) || model.includes(term) || driver.includes(term) || unit.includes(term) || datePt.includes(term);
          });
        };
        
        const filteredList = getSearchedRegistros();
        
        return (
          <div className="space-y-4">
            
            {/* SEARCH CONTROLLER BOARD */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Histórico de Disponibilizações Base</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Mecanismo integrado de busca para auditoria Heinz & Heineken</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">Total Frotas: {filteredList.length}</span>
              </div>
              
              <div className="p-4 bg-slate-950/20 border-b border-slate-800 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={registrySearchText}
                      onChange={(e) => setRegistrySearchText(e.target.value)}
                      placeholder="Pesquise por Dia (Ex: 15/06/2026), Veículo (Ex: HGJ8B08), Mês (Ex: 06/2026) ou Ano (Ex: 2026)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-sky-500 focus:outline-none font-mono"
                    />
                    {registrySearchText && (
                      <button
                        onClick={() => setRegistrySearchText("")}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs font-bold font-mono"
                      >
                        LIMPAR
                      </button>
                    )}
                  </div>
                </div>
                
                {/* SUGGESTIONS FOR DEMO TESTING */}
                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] text-slate-400">
                  <span className="text-slate-550">Sintaxe de Pesquisa:</span>
                  <button onClick={() => setRegistrySearchText("15/06/2026")} className="bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-sky-400 px-2 py-0.5 rounded transition border border-slate-800/80">📅 15/06/2026 (Dia)</button>
                  <button onClick={() => setRegistrySearchText("HGJ8B08")} className="bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-sky-400 px-2 py-0.5 rounded transition font-bold border border-slate-800/80">🚗 HGJ8B08 (Veículo)</button>
                  <button onClick={() => setRegistrySearchText("06/2026")} className="bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-sky-400 px-2 py-0.5 rounded transition border border-slate-800/80">📅 06/2026 (Mês)</button>
                  <button onClick={() => setRegistrySearchText("2026")} className="bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-sky-400 px-2 py-0.5 rounded transition font-bold border border-slate-800/80">📅 2026 (Ano)</button>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                
                {/* 1. CONSULTA POR DATA */}
                {isDate && (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Relatório de Disponibilidade por Dia</p>
                      <h4 className="text-sm font-bold text-white">Disponibilidade do dia {term}</h4>
                      <div className="pt-2 space-y-1.5 text-xs">
                        <p className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">Veículos Disponibilizados:</p>
                        {filteredList.map(d => {
                          const v = veiculos.find(x => x.id === d.veiculoId);
                          return (
                            <div key={d.id} className="flex items-center gap-2 text-sky-400 font-mono font-bold">
                              <span className="text-emerald-500 text-sm font-bold">✓</span>
                              <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-[10px] tracking-wider rounded font-mono">{v ? v.placa : d.veiculoId}</span>
                              <span className="text-slate-400 font-normal text-[11px]">({v ? v.modelo : "Modelo?"})</span>
                            </div>
                          );
                        })}
                        {filteredList.length === 0 && (
                          <p className="text-slate-500 italic">Nenhum veículo disponível registrado para esta data.</p>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg text-center min-w-[150px]">
                      <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">Total Disponíveis</span>
                      <span className="text-3xl font-black text-sky-400 font-mono">{filteredList.length}</span>
                    </div>
                  </div>
                )}
                
                {/* 2. CONSULTA POR VEÍCULO */}
                {isVehicle && (() => {
                  const cleanPlate = term.toUpperCase();
                  const vObj = veiculos.find(v => v.placa.toUpperCase() === cleanPlate || v.id.toUpperCase() === cleanPlate);
                  if (!vObj) return null;
                  
                  const specifiedDates = ["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18"];
                  
                  rawDisps.filter(d => d.veiculoId === vObj.id).forEach(d => {
                    if (!specifiedDates.includes(d.data)) {
                      specifiedDates.push(d.data);
                    }
                  });
                  specifiedDates.sort();

                  return (
                    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Linha de Tempo e Auditoria por Veículo</p>
                        <h4 className="text-xs font-bold text-white mt-1 flex items-center gap-2">
                          <span>🚗</span> Histórico Operacional de: <span className="bg-white text-slate-950 px-2 py-0.5 rounded font-black font-mono text-xs">{vObj.placa}</span> ({vObj.modelo})
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                        {specifiedDates.map(dateStr => {
                          const isAvailable = rawDisps.some(d => d.veiculoId === vObj.id && d.data === dateStr);
                          return (
                            <div key={dateStr} className="bg-slate-900/80 border border-slate-800 p-3 rounded flex items-center justify-between">
                              <div>
                                <span className="block text-xs font-bold text-white font-mono">{formatDatePt(dateStr)}</span>
                                <span className={`text-[10px] uppercase font-mono mt-0.5 block font-bold ${isAvailable ? "text-emerald-400" : "text-red-450"}`}>
                                  {isAvailable ? "→ Disponível" : "→ Sem Oferta"}
                                </span>
                              </div>
                              <div className={`w-2.5 h-2.5 rounded-full ${isAvailable ? "bg-emerald-500 shadow-emerald-500/20" : "bg-red-500 shadow-red-500/20"}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                
                {/* 3. CONSULTA POR MÊS */}
                {isMonth && (() => {
                  const parts = term.split("/");
                  const formattedMonth = `${parts[1]}-${parts[0].padStart(2, "0")}`; // e.g. "2026-06"
                  
                  const monthDisps = rawDisps.filter(d => d.data.startsWith(formattedMonth));
                  const totalDisponibilizacoes = monthDisps.length;
                  const diasTrabalhados = Array.from(new Set(monthDisps.map(d => d.data))).length;
                  const veiculosDisponibilizados = Array.from(new Set(monthDisps.map(d => d.veiculoId))).length;
                  
                  const vehicleCounts: Record<string, number> = {};
                  monthDisps.forEach(d => {
                    vehicleCounts[d.veiculoId] = (vehicleCounts[d.veiculoId] || 0) + 1;
                  });
                  
                  const sortedVehicles = Object.entries(vehicleCounts).map(([vId, count]) => {
                    const v = veiculos.find(x => x.id === vId);
                    return { id: vId, placa: v ? v.placa : vId, modelo: v ? v.modelo : "Outro", count };
                  }).sort((a, b) => b.count - a.count);

                  return (
                    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-5 space-y-4">
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Consolidado e Auditorias Heineken do Mês</p>
                        <h4 className="text-sm font-bold text-white">Resultados de: {term}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-center font-mono">
                          <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Total de Disponibilizações</span>
                          <span className="text-2xl font-black text-sky-400 mt-1 block">{totalDisponibilizacoes}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-center font-mono">
                          <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Dias Trabalhados</span>
                          <span className="text-2xl font-black text-emerald-400 mt-1 block">{diasTrabalhados}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-center font-mono">
                          <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Veículos Disponibilizados</span>
                          <span className="text-2xl font-black text-purple-400 mt-1 block">{veiculosDisponibilizados}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <p className="text-xs font-bold text-white uppercase font-mono tracking-wider mb-2">Quantidade de vezes que cada veículo foi disponibilizado:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {sortedVehicles.map((item) => (
                            <div key={item.id} className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg flex items-center justify-between">
                              <div>
                                <span className="bg-white text-slate-950 px-1.5 py-0.5 rounded font-black font-mono text-[10px]">
                                  {item.placa}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-2 truncate max-w-[120px] inline-block align-middle">{item.modelo}</span>
                              </div>
                              <span className="text-xs font-bold text-slate-100 bg-slate-800 px-2.5 py-1 rounded-full font-mono">
                                {item.count} {item.count === 1 ? "vez" : "vezes"}
                              </span>
                            </div>
                          ))}
                          {sortedVehicles.length === 0 && (
                            <p className="text-xs text-slate-500 italic">Nenhum registro encontrado para este mês.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* 4. CONSULTA POR ANO */}
                {isYear && (() => {
                  const yearDisps = rawDisps.filter(d => d.data.startsWith(term));
                  const totalDisps = yearDisps.length;
                  const uniqueDays = Array.from(new Set(yearDisps.map(d => d.data))).length;
                  const uniqueVehs = Array.from(new Set(yearDisps.map(d => d.veiculoId))).length;
                  
                  return (
                    <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-5 space-y-3">
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Consolidação Anual de Frotas</p>
                        <h4 className="text-sm font-bold text-white">Todas as disponibilidades registradas no ano {term}</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-center font-mono">
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Total de Disponibilizações</span>
                          <span className="text-xl font-bold text-sky-400 mt-1 block">{totalDisps} frotas</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-center font-mono">
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Dias Operados (Declarados)</span>
                          <span className="text-xl font-bold text-emerald-400 mt-1 block">{uniqueDays} dias</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-center font-mono">
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Veículos Únicos</span>
                          <span className="text-xl font-bold text-purple-400 mt-1 block">{uniqueVehs} unidades</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
              
              {/* PRIMARY TABLE LIST RESULTS */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px] bg-slate-950/40">
                      <th className="py-3 px-4">Data Base</th>
                      <th className="py-3 px-4">Unidade Filial</th>
                      <th className="py-3 px-4">Identificação Veículo</th>
                      <th className="py-3 px-4">Modelo</th>
                      <th className="py-3 px-4">Motorista Escalado</th>
                      <th className="py-3 px-4 text-center">Prioridade</th>
                      <th className="py-3 px-4 text-center">Cruzamento DT</th>
                      <th className="py-3 px-4">Auditado Em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {filteredList.length > 0 ? (
                      filteredList.map((d) => {
                        const v = veiculos.find(x => x.id === d.veiculoId);
                        const mot = motoristas.find(x => x.id === d.motoristaId);
                        const u = units.find(x => x.id === d.unidadeId);
                        return (
                          <tr key={d.id} className="hover:bg-slate-800/10">
                            <td className="py-3 px-4 font-mono font-bold text-white">{formatDatePt(d.data)}</td>
                            <td className="py-3 px-4 font-medium text-slate-300">{u ? u.nome : d.unidadeId}</td>
                            <td className="py-3 px-4 font-mono font-bold text-sky-400">{v ? v.placa : d.veiculoId}</td>
                            <td className="py-3 px-4 text-slate-400">{v ? v.modelo : "Desconhecido"}</td>
                            <td className="py-3 px-4 text-slate-300 font-medium">{mot ? mot.nome : "Sem Motorista"}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                d.prioridade === "Alta" ? "bg-red-500/10 text-red-400 border border-red-500/15" :
                                d.prioridade === "Média" ? "bg-sky-500/10 text-sky-400 border border-sky-500/15" :
                                "bg-slate-500/10 text-slate-400 border border-slate-700"
                              }`}>
                                {d.prioridade}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                d.roteirizado 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/10"
                              }`}>
                                {d.roteirizado ? "ROTEIRIZADO" : "NÃO ROTEIRIZADO"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[10px]">
                              {d.created_at ? d.created_at.replace("T", " ").slice(0, 16) : "-"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                          Não foram declarados veículos em disponibilidade correspondentes a este filtro / busca.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        );
      })()}

      {/* ABA 3: LISTA DE OCIOSIDADE (VEÍCULOS DISPONIBILIZADOS E NÃO UTILIZADOS) */}
      {activeTab === "ociosidade" && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">VEÍCULOS DISPONIBILIZADOS E NÃO UTILIZADOS</h3>
              <p className="text-[11px] text-slate-400">
                Auditoria de frotas oferecidas à Heineken que permaneceram ociosas sem vinculação de DT (Sobra de Grade)
              </p>
            </div>
            <span className="text-xs bg-amber-950/30 border border-amber-800 text-amber-500 px-3 py-1 font-mono rounded font-bold">
              Total Frotas Ociosas para Análise: {countNaoRoteirizados}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px] bg-slate-950/40">
                  <th className="py-3 px-4">Data Ocorrência</th>
                  <th className="py-3 px-4">Veículo (Placa)</th>
                  <th className="py-3 px-4">Ficha Motorista</th>
                  <th className="py-3 px-4">Filial / Unidade</th>
                  <th className="py-3 px-4">Nível Prioridade</th>
                  <th className="py-3 px-4">Justificativa / Motivo Customizado da Ociosidade</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {rawDisps.filter(x => !x.roteirizado).length > 0 ? (
                  rawDisps.filter(x => !x.roteirizado).map((d) => {
                    const v = veiculos.find(x => x.id === d.veiculoId);
                    const mot = motoristas.find(x => x.id === d.motoristaId);
                    const u = units.find(x => x.id === d.unidadeId);
                    
                    return (
                      <tr key={d.id} className="hover:bg-slate-800/10">
                        {/* Data */}
                        <td className="py-3 px-4 font-mono font-bold text-white">{formatDatePt(d.data)}</td>
                        
                        {/* Veiculo */}
                        <td className="py-3 px-4">
                          <div className="bg-slate-950 px-2.5 py-1 rounded inline-block font-mono font-bold text-white border border-slate-800">
                            {v ? v.placa : d.veiculoId}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{v ? v.modelo : "Modelo?"}</div>
                        </td>

                        {/* Motorista */}
                        <td className="py-3 px-4 text-slate-300">
                          <div className="font-semibold">{mot ? mot.nome : "Sem Motorista Escalado"}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">CPF: {mot ? mot.cpf : "-"}</div>
                        </td>

                        {/* Unidade */}
                        <td className="py-3 px-4 font-sans text-slate-350">{u ? u.nome : d.unidadeId}</td>

                        {/* Prioridade */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            d.prioridade === "Alta" ? "bg-red-500/10 text-red-500" :
                            d.prioridade === "Média" ? "bg-sky-500/10 text-sky-400" :
                            "bg-slate-800 text-slate-400"
                          }`}>
                            {d.prioridade}
                          </span>
                        </td>

                        {/* Motivo Ociosidade (Opcional) */}
                        <td className="py-3 px-4 max-w-[320px]">
                          <div className="flex items-center bg-slate-950 px-2 py-1 rounded border border-slate-850 gap-2">
                            <Edit3 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <input
                              type="text"
                              value={motiveInputs[d.id] || ""}
                              onChange={(e) => setMotiveInputs(prev => ({ ...prev, [d.id]: e.target.value }))}
                              placeholder="Falta de demanda, quebra, cubagem..."
                              className="bg-transparent text-white focus:outline-none w-full text-[11px]"
                            />
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleSaveMotive(d.id, motiveInputs[d.id] || "")}
                            disabled={savingMotId === d.id}
                            className="px-2.5 py-1 bg-sky-900/30 hover:bg-sky-700/40 text-sky-350 hover:text-white rounded border border-sky-800/40 transition font-sans font-bold text-[10px]"
                          >
                            {savingMotId === d.id ? "Gravando..." : "Salvar"}
                          </button>
                        </td>

                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                      🎉 Incrível! Zero veículos ociosos no período filtrado. Todas as frotas disponibilizadas foram utilizadas!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA CUSTOMIZADA: HISTÓRICO POR VEÍCULO */}
      {activeTab === "historico" && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden p-5 space-y-4">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <span>🚗</span> Rastreabilidade & Histórico de Disponibilidade da Frota
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Consulte a frequência, datas declaradas e cruzamento do índice de utilização de cada veículo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Secção de Busca e Seleção de Veículo */}
            <div className="space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Selecione o Veículo para Auditoria:
              </label>
              <select
                value={selectedHistVehicle}
                onChange={(e) => setSelectedHistVehicle(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none w-full"
              >
                <option value="">-- Escolha um Veículo da Frota --</option>
                {veiculos.map(v => (
                  <option key={v.id} value={v.id}>{v.placa} - {v.modelo} ({(v as any).fabricante || "Frota Ativa"})</option>
                ))}
              </select>
            </div>

            {/* Filtro de Datas ou Pesquisa por Texto Livre */}
            <div className="space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Filtrar Histórico por Período / Texto (Ex: 15/06/2026, 06/2026, 2026):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={registrySearchText}
                  onChange={(e) => setRegistrySearchText(e.target.value)}
                  placeholder="Pesquise por data (DD/MM/AAAA ou MM/AAAA)..."
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none w-full pr-8 font-mono"
                />
                {registrySearchText && (
                  <button
                    onClick={() => setRegistrySearchText("")}
                    className="absolute right-2 top-2.5 text-slate-500 hover:text-white font-bold text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {selectedHistVehicle ? (() => {
            const vehicleObj = veiculos.find(v => v.id === selectedHistVehicle);
            if (!vehicleObj) return null;

            // Gather all historic records for this vehicle in rawDisps
            let vehicleHistory = rawDisps.filter(d => d.veiculoId === selectedHistVehicle);

            // Filter historical records based on registrySearchText if specified
            if (registrySearchText.trim()) {
              const term = registrySearchText.trim().toLowerCase();
              vehicleHistory = vehicleHistory.filter(d => {
                const dayStr = formatDatePt(d.data); // e.g. "15/06/2026"
                return dayStr.includes(term) || d.data.includes(term);
              });
            }

            // Sorted by date descending
            vehicleHistory.sort((a, b) => b.data.localeCompare(a.data));

            return (
              <div className="space-y-4 pt-2">
                {/* Vehicle Mini Card */}
                <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-850 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-white text-slate-950 px-2.5 py-0.5 rounded font-black font-mono text-sm border border-slate-400">
                        {vehicleObj.placa}
                      </span>
                      <span className="text-white font-bold text-sm font-sans">{vehicleObj.modelo}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      Tipo: <span className="text-slate-200">{vehicleObj.tipo}</span> | Perfil: <span className="text-slate-200">{vehicleObj.perfil}</span> | Filial: <span className="text-sky-400">{units.find(u => u.id === vehicleObj.unidadeId)?.nome || vehicleObj.unidadeId}</span>
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <div className="text-center bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">Dias Disponível</div>
                      <div className="text-sm font-bold text-sky-400 font-mono">{vehicleHistory.length}</div>
                    </div>
                    <div className="text-center bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">Roteirizados</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        {vehicleHistory.filter(h => h.roteirizado).length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline / Table History list */}
                <div className="overflow-hidden rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px] bg-slate-950/40">
                        <th className="py-2.5 px-4 font-mono">Data Base</th>
                        <th className="py-2.5 px-4 font-mono">Status da Oferta</th>
                        <th className="py-2.5 px-4">Motorista Designado</th>
                        <th className="py-2.5 px-4 text-center">Prioridade</th>
                        <th className="py-2.5 px-4 font-mono">Controle de Conformidade</th>
                        <th className="py-2.5 px-4">Data Registro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 font-mono text-xs">
                      {vehicleHistory.length > 0 ? (
                        vehicleHistory.map((h) => {
                          const mot = motoristas.find(m => m.id === h.motoristaId);
                          return (
                            <tr key={h.id} className="hover:bg-slate-800/10">
                              <td className="py-3 px-4 font-bold text-white text-xs">
                                {formatDatePt(h.data)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/15 text-sky-400 font-bold">
                                    DISPONÍVEL
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    h.roteirizado 
                                      ? "bg-emerald-500/15 text-emerald-400" 
                                      : "bg-amber-500/15 text-amber-400"
                                  }`}>
                                    {h.status_disponibilidade || (h.roteirizado ? "ROTEIRIZADO" : "NÃO ROTEIRIZADO")}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-200">
                                {mot ? mot.nome : "Motorista Padrão"}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  h.prioridade === "Alta" ? "bg-red-500/10 text-red-500" :
                                  h.prioridade === "Média" ? "bg-sky-500/10 text-sky-400" :
                                  "bg-slate-800 text-slate-400"
                                }`}>
                                  {h.prioridade || "Média"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-400 italic max-w-[200px] truncate">
                                {h.motivoOciosidade ? `Ocioso: ${h.motivoOciosidade}` : "Em conformidade"}
                              </td>
                              <td className="py-3 px-4 text-[10px] text-slate-500">
                                {h.created_at ? new Date(h.created_at).toLocaleString("pt-BR") : "-"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                            Nenhum registro de disponibilidade ativa para as buscas filtradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })() : (
            <div className="py-16 text-center text-slate-500 font-sans text-xs bg-slate-950/20 rounded-lg border border-dashed border-slate-800">
              <span className="text-xl block mb-2">🔍</span> Selecione um veículo acima para inspecionar toda a sua jornada de alocações e conformidades diárias da Heineken.
            </div>
          )}
        </div>
      )}

      {/* ABA 4: RELATÓRIOS CONSOLIDADOS (MENSAL E ANUAL) */}
      {activeTab === "relatorios" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Relatório Mensal */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Relatório Consolidado Mensal</h3>
              <p className="text-xs text-slate-400 mt-1">Série operacional agrupada por mês fiscal de distribuição</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px] bg-slate-950/30">
                    <th className="py-2.5 px-3">Mês Analisado</th>
                    <th className="py-2.5 px-3 text-center">Disponibilizados</th>
                    <th className="py-2.5 px-3 text-center">Utilizados</th>
                    <th className="py-2.5 px-3 text-center">Sobras (Ociosas)</th>
                    <th className="py-2.5 px-3 text-right">Aproveitamento %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {getMonthlyReport().map((m) => (
                    <tr key={m.key} className="hover:bg-slate-800/20 font-mono text-slate-300">
                      <td className="py-3 px-3 font-sans font-semibold text-white">{m.name}</td>
                      <td className="py-3 px-3 text-center">{m.disp}</td>
                      <td className="py-3 px-3 text-center text-emerald-450">{m.rot}</td>
                      <td className="py-3 px-3 text-center text-amber-500">{m.idle}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        <span className={`px-2 py-0.5 rounded ${
                          m.aproveitamento >= 80 ? "bg-emerald-500/10 text-emerald-450" : "bg-sky-500/10 text-sky-400"
                        }`}>
                          {m.aproveitamento}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Relatório Anual */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Relatório Consolidado Anual</h3>
              <p className="text-xs text-slate-400 mt-1">Relatórios de acompanhamento por ano fiscal</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px] bg-slate-950/30">
                    <th className="py-2.5 px-3">Ano Calendário</th>
                    <th className="py-2.5 px-3 text-center">Disponibilizados</th>
                    <th className="py-2.5 px-3 text-center">Utilizados</th>
                    <th className="py-2.5 px-3 text-center">Não Roteirizados</th>
                    <th className="py-2.5 px-3 text-right">Aproveitamento %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                  {getAnnualReport().map((y) => (
                    <tr key={y.name} className="hover:bg-slate-800/20">
                      <td className="py-3 px-3 font-sans font-bold text-white">{y.name}</td>
                      <td className="py-3 px-3 text-center">{y.disp}</td>
                      <td className="py-3 px-3 text-center text-emerald-400">{y.rot}</td>
                      <td className="py-3 px-3 text-center text-amber-500">{y.idle}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        <span className="bg-sky-500/10 text-sky-450 px-2 py-0.5 rounded border border-sky-500/10">
                          {y.aproveitamento}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ABA 5: GRÁFICOS DE APROVEITAMENTO E DISPONIBILIDADE */}
      {activeTab === "graficos" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Aproveitamento Diário */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase font-mono mb-3 text-slate-300">1. Aproveitamento Diário (%)</h4>
              <div className="h-[300px] min-h-[300px]">
                <SafeResponsiveContainer minHeight={300}>
                  <LineChart data={graphAproveitamentoDiario} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis domain={[0, 100]} stroke="#64748b" />
                    <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#000", border: "1px solid #333", fontSize: "11px" }} />
                    <Line type="monotone" dataKey="Roteirização %" stroke="#06b6d4" strokeWidth={3} />
                  </LineChart>
                </SafeResponsiveContainer>
              </div>
            </div>

            {/* 2. Aproveitamento Mensal */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase font-mono mb-3 text-slate-300">2. Aproveitamento Mensal (%)</h4>
              <div className="h-[300px] min-h-[300px]">
                <SafeResponsiveContainer minHeight={300}>
                  <BarChart data={graphAproveitamentoMensal} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis domain={[0, 100]} stroke="#64748b" />
                    <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#000", border: "1px solid #333", fontSize: "11px" }} />
                    <Bar dataKey="Roteirização %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </SafeResponsiveContainer>
              </div>
            </div>

            {/* 3. Aproveitamento Anual */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase font-mono mb-3 text-slate-300">3. Aproveitamento Anual (%)</h4>
              <div className="h-[300px] min-h-[300px]">
                <SafeResponsiveContainer minHeight={300}>
                  <BarChart data={graphAproveitamentoAnual} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis domain={[0, 100]} stroke="#64748b" />
                    <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#000", border: "1px solid #333", fontSize: "11px" }} />
                    <Bar dataKey="Aproveitamento %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </SafeResponsiveContainer>
              </div>
            </div>

            {/* 4. Disponibilizados x Roteirizados */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase font-mono mb-3 text-slate-300">4. Disponibilizados x Roteirizados</h4>
              <div className="h-[300px] min-h-[300px]">
                <SafeResponsiveContainer minHeight={300}>
                  <BarChart data={graphDispVsRot} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#000", border: "1px solid #333", fontSize: "11px" }} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar dataKey="Disponibilizados" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Roteirizados" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </SafeResponsiveContainer>
              </div>
            </div>

            {/* 5. Veículos Ociosos */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase font-mono mb-3 text-slate-300">5. Quantitativo de Veículos Ociosos</h4>
              <div className="h-[300px] min-h-[300px]">
                <SafeResponsiveContainer minHeight={300}>
                  <BarChart data={graphOciosos} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#000", border: "1px solid #333", fontSize: "11px" }} />
                    <Bar dataKey="Ociosos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </SafeResponsiveContainer>
              </div>
            </div>

            {/* 6. Aproveitamento por Unidade */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase font-mono mb-3 text-slate-300">6. Aproveitamento por Filial (%)</h4>
              <div className="h-[300px] min-h-[300px]">
                <SafeResponsiveContainer minHeight={300}>
                  <BarChart layout="vertical" data={graphAproveitamentoUnidade} margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" />
                    <YAxis type="category" dataKey="name" stroke="#64748b" />
                    <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#000", border: "1px solid #333", fontSize: "11px" }} />
                    <Bar dataKey="Aproveitamento %" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </SafeResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL / OVERLAY: SIMULAÇÃO PREVIEW DE IMPRESSÃO EM PDF */}
      {pdfPrintData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-start p-4 md:p-10 font-sans">
          <div className="bg-white text-slate-900 max-w-4xl w-full rounded-xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col my-auto">
            
            {/* Header com os controles */}
            <div className="bg-slate-100 p-4 border-b border-slate-300 flex justify-between items-center no-print">
              <span className="text-xs font-mono text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4.5 h-4.5 text-sky-600" />
                Visualização do Relatório Heineken SLA
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded transition flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" /> Imprimir / Salvar PDF
                </button>
                <button
                  onClick={() => setPdfPrintData(null)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded transition"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>

            {/* Documento Conteúdo (Foco Visual de Impressão) */}
            <div className="p-8 space-y-6 printable-document bg-white">
              
              {/* Header Relatório */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                <div className="space-y-1">
                  <h1 className="text-xl font-black text-slate-900 font-mono italic tracking-tight uppercase flex items-center gap-2">
                    <span className="bg-slate-950 text-white px-2 py-0.5 rounded font-black">HNK</span>
                    AMPLALOG OPERAÇÃO LOGÍSTICA
                  </h1>
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Módulo Estratégico de Auditoria • Heineken SLA</p>
                  <p className="text-[10px] text-slate-500 font-mono">Gerado em {pdfPrintData.timestamp}</p>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-xs font-mono font-bold bg-slate-900 text-white px-3 py-1 rounded">
                    SLA AUDIT REPORT
                  </span>
                  <div className="text-[10px] text-slate-550 pt-1 font-mono">ID: {Math.floor(Math.random() * 900000 + 100000)}</div>
                </div>
              </div>

              {/* Informações de Filtros */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 font-bold font-mono text-[9px] uppercase block">Filial Selecionada</span>
                  <p className="font-bold text-slate-900 uppercase pt-0.5">{pdfPrintData.unidadeText}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-bold font-mono text-[9px] uppercase block">Período Selecionado</span>
                  <p className="font-bold text-slate-900 pt-0.5">{pdfPrintData.periodoText}</p>
                </div>
              </div>

              {/* Resumo de Indicadores */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="border border-slate-250 p-3 rounded-lg">
                  <span className="text-slate-500 font-mono text-[9px] uppercase block">Disponibilizados</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{pdfPrintData.metrics.total}</p>
                </div>
                <div className="border border-slate-250 p-3 rounded-lg bg-emerald-50/20">
                  <span className="text-emerald-600 font-mono text-[9px] uppercase block">Utilizados (Roteirizados)</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{pdfPrintData.metrics.roteirizados}</p>
                </div>
                <div className="border border-slate-250 p-3 rounded-lg bg-amber-50/20">
                  <span className="text-amber-600 font-mono text-[9px] uppercase block">Sobra Ociosa</span>
                  <p className="text-2xl font-black text-amber-700 mt-1">{pdfPrintData.metrics.naoRoteirizados}</p>
                </div>
                <div className="border border-slate-250 p-3 rounded-lg bg-slate-100 font-bold">
                  <span className="text-slate-600 font-mono text-[9px] uppercase block">Aproveitamento</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{pdfPrintData.metrics.taxa}%</p>
                </div>
              </div>

              {/* Tabela de Registros */}
              <div className="space-y-2 pt-2">
                <h3 className="text-[11px] font-black text-slate-900 uppercase font-mono tracking-wider border-b border-slate-300 pb-1">
                  Grade Detalhada de Veículos Disponibilizados
                </h3>
                <table className="w-full text-left text-[10px] border-collapse font-sans">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-600 font-bold uppercase text-[9px] bg-slate-50">
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Unidade</th>
                      <th className="py-2 px-3">Veículo</th>
                      <th className="py-2 px-3">Motorista</th>
                      <th className="py-2.5 px-2 text-center">Prioridade</th>
                      <th className="py-2.5 px-2">Status Cruzamento</th>
                      <th className="py-2 px-3">Justificativa Ociosidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pdfPrintData.records.length > 0 ? (
                      pdfPrintData.records.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold">{r.data}</td>
                          <td className="py-2 px-3 uppercase">{r.unidade}</td>
                          <td className="py-2 px-3 font-mono">{r.veiculo}</td>
                          <td className="py-2 px-3">{r.motorista}</td>
                          <td className="py-2.5 px-2 text-center font-bold">{r.prioridade}</td>
                          <td className="py-2.5 px-2 font-mono font-bold">
                            <span className={r.status.includes("ROTEIRIZADO") ? "text-emerald-700" : "text-amber-700 font-extrabold"}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 italic text-slate-550 max-w-[200px] truncate">{r.motivo}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 font-mono">
                          Nenhum registro encontrado para inclusão na auditoria de impressão.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Termos de Assinatura e Responsabilidade */}
              <div className="grid grid-cols-2 gap-8 pt-12 text-slate-550 font-mono text-[9px] no-print-layout">
                <div className="border-t border-slate-400 text-center pt-2">
                  <p className="font-bold text-slate-800">AMPLALOG COORDENAÇÃO DE FROTA</p>
                  <p>Declarante Responsável</p>
                </div>
                <div className="border-t border-slate-400 text-center pt-2">
                  <p className="font-bold text-slate-800">AUDITORIA DISTRIBUIÇÃO HEINEKEN</p>
                  <p>Aprovação de SLA e Recebimento</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
    </div>
  );
}
