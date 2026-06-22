import React, { useState } from "react";
import { 
  Plus, Search, Hammer, CheckSquare, FileText, Camera, ShieldAlert, 
  FileSpreadsheet, Printer, DollarSign, PenTool, Edit, Trash, Calendar, AlertTriangle 
} from "lucide-react";
import { Manutencao, Veiculo, Usuario } from "../types";
import { NotificationModal, NotificationType } from "./NotificationModal";

interface ManutencaoProps {
  manutencoes: Manutencao[];
  veiculos: Veiculo[];
  onRefresh: () => void;
  currentUser: Usuario;
}

export default function ManutencaoView({ manutencoes, veiculos, onRefresh, currentUser }: ManutencaoProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Manutencao | null>(null);

  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  // Custom delete state
  const [deletingItem, setDeletingItem] = useState<Manutencao | null>(null);

  // Form states
  const [veiculoId, setVeiculoId] = useState("");
  const [placa, setPlaca] = useState("");
  const [tipo, setTipo] = useState<"Preventiva" | "Corretiva">("Preventiva");
  const [categoria, setCategoria] = useState("Mecânica");
  const [data, setData] = useState("2026-06-12");
  const [proximaManutencao, setProximaManutencao] = useState("2026-09-12");
  const [quilometragemAtual, setQuilometragemAtual] = useState<number>(0);
  const [proximaQuilometragem, setProximaQuilometragem] = useState<number>(0);
  const [valorManutencao, setValorManutencao] = useState<number>(0);
  const [oficina, setOficina] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");

  // 11 checklist states
  const [oleo, setOleo] = useState(false);
  const [filtro, setFiltro] = useState(false);
  const [freios, setFreios] = useState(false);
  const [pneus, setPneus] = useState(false);
  const [rodas, setRodas] = useState(false);
  const [suspensao, setSuspensao] = useState(false);
  const [amortecedores, setAmortecedores] = useState(false);
  const [etiquetas, setEtiquetas] = useState(false);
  const [eletrica, setEletrica] = useState(false);
  const [motor, setMotor] = useState(false);
  const [lanternas, setLanternas] = useState(false);

  // Permission Verification
  const isAuthorized = currentUser?.perfil === "admin_master" || currentUser?.perfil === "admin_unidade";

  const handleSelectVehicle = (val: string) => {
    setVeiculoId(val);
    const foundVehicle = veiculos.find(v => v.placa === val || v.id === val);
    if (foundVehicle) {
      setPlaca(foundVehicle.placa);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingItem(null);
    setVeiculoId("");
    setPlaca("");
    setTipo("Preventiva");
    setCategoria("Mecânica");
    setData("2026-06-12");
    setProximaManutencao("2026-09-12");
    setQuilometragemAtual(0);
    setProximaQuilometragem(0);
    setValorManutencao(0);
    setOficina("");
    setFornecedor("");
    setResponsavel("");
    setObservacao("");
    setFotoUrl("");
    
    setOleo(false);
    setFiltro(false);
    setFreios(false);
    setPneus(false);
    setRodas(false);
    setSuspensao(false);
    setAmortecedores(false);
    setEtiquetas(false);
    setEletrica(false);
    setMotor(false);
    setLanternas(false);
  };

  const handleStartEdit = (item: Manutencao) => {
    if (!isAuthorized) {
      setNotification({
        type: "error",
        message: "Acesso Negado: Apenas supervisores e administradores master possuem privilégios para editar manutenções."
      });
      return;
    }
    setEditingItem(item);
    setIsAdding(true);
    setVeiculoId(item.veiculoId);
    setPlaca(item.placa || item.veiculoId);
    setTipo(item.tipo);
    setCategoria(item.categoria || "Mecânica");
    setData(item.data);
    setProximaManutencao(item.proximaManutencao);
    setQuilometragemAtual(item.quilometragemAtual || 0);
    setProximaQuilometragem(item.proximaQuilometragem || 0);
    setValorManutencao(item.valorManutencao || 0);
    setOficina(item.oficina || "");
    setFornecedor(item.fornecedor || "");
    setResponsavel(item.responsavel || "");
    setObservacao(item.observacao || "");
    setFotoUrl(item.fotoUrl || "");

    // Checkboxes
    setOleo(item.checklist?.oleo || false);
    setFiltro(item.checklist?.filtro || false);
    setFreios(item.checklist?.freios || false);
    setPneus(item.checklist?.pneus || false);
    setRodas(item.checklist?.rodas || false);
    setSuspensao(item.checklist?.suspensao || false);
    setAmortecedores(item.checklist?.amortecedores || false);
    setEtiquetas(item.checklist?.etiquetas || false);
    setEletrica(item.checklist?.eletrica || false);
    setMotor(item.checklist?.motor || false);
    setLanternas(item.checklist?.lanternas || false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    try {
      const res = await fetch(`/api/manutencao/${deletingItem.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email
        }
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: "✅ Manutenção excluída com sucesso. A ação foi registrada permanentemente no log de auditoria."
        });
        setDeletingItem(null);
        onRefresh();
      } else {
        const error = await res.json();
        setNotification({
          type: "error",
          message: `❌ Falha ao excluir registro: ${error.error || "Operação rejeitada."}`
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "❌ Erro operacional de conexão ao excluir manutenção."
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!veiculoId || !observacao.trim()) {
      setNotification({
        type: "error",
        message: "Não foi possível gravar o checklist. Motivo: Selecione um veículo e descreva as observações da manutenção."
      });
      return;
    }

    const payload = {
      veiculoId,
      placa: placa || veiculoId,
      tipo,
      categoria,
      data,
      proximaManutencao,
      quilometragemAtual: Number(quilometragemAtual || 0),
      proximaQuilometragem: Number(proximaQuilometragem || 0),
      valorManutencao: Number(valorManutencao || 0),
      oficina,
      fornecedor,
      responsavel,
      observacao: observacao.trim(),
      fotoUrl: fotoUrl || "https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=1500&auto=format&fit=crop", // Stock photo
      checklist: {
        oleo,
        filtro,
        freios,
        pneus,
        rodas,
        suspensao,
        amortecedores,
        etiquetas,
        eletrica,
        motor,
        lanternas,
      },
    };

    try {
      const url = editingItem ? `/api/manutencao/${editingItem.id}` : "/api/manutencao";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: editingItem 
            ? "✅ Manutenção atualizada com sucesso." 
            : "✅ Registro de manutenção e checklist eixos salvo com sucesso."
        });
        resetForm();
        onRefresh();
      } else {
        const error = await res.json();
        setNotification({
          type: "error",
          message: `❌ Não foi possível gravar. Motivo: ${error.error || "Operação recusada."}`
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "❌ Erro ao enviar os dados de manutenção. Tente novamente."
      });
    }
  };

  const handleExportExcel = () => {
    const headers = [
      "ID", 
      "Veículo", 
      "Placa", 
      "Tipo", 
      "Categoria", 
      "Data Realização", 
      "Próxima Revisão", 
      "Valor (R$)", 
      "Oficina", 
      "Responsável", 
      "Observações"
    ];
    const rows = filtered.map((m) => [
      m.id, 
      m.veiculoId, 
      m.placa || m.veiculoId, 
      m.tipo, 
      m.categoria || "N/A", 
      m.data, 
      m.proximaManutencao, 
      m.valorManutencao || 0, 
      m.oficina || "N/A", 
      m.responsavel || "N/A", 
      m.observacao
    ]);
    const csvContent = [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Relatorio_Manutencoes_Frotas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const filtered = manutencoes.filter(
    (m) =>
      m.veiculoId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.placa && m.placa.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.categoria && m.categoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.oficina && m.oficina.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.observacao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Upper title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
            <Hammer className="w-5 h-5 text-sky-400" />
            Manutenção Corretiva & Preventiva de Frotas
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Assine os checklists de revisão, controle inspeções e agende retornos de veículos cadastrados na frota.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isAdding && (
            <button
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Lançar Checklist Manutenção
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="p-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
            title="Exportar para Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>

          <button
            onClick={handlePrintPDF}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
            title="Preparar Impressão"
          >
            <Printer className="w-4 h-4" />
            Gerar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Dynamic add / edit form */}
        {isAdding && (
          <div className="bg-slate-900 p-5 rounded-xl border border-sky-950/70 lg:col-span-1 h-fit space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-sky-400 animate-pulse" />
                {editingItem ? "✏️ Editar Ficha Manutenção" : "Inspeção Checklist 11 Pontos"}
              </h3>
              <button 
                onClick={() => resetForm()} 
                className="text-xs text-slate-400 hover:text-white font-mono bg-slate-950 border border-slate-850 px-2.5 py-0.5 rounded"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 font-sans">
              
              {/* Vehicle select */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Veículo Sob Inspeção <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={veiculoId}
                  onChange={(e) => handleSelectVehicle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none text-xs"
                >
                  <option value="">Selecione...</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.placa}>
                      {v.placa} ({v.modelo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Placa & Categoria */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Placa do Veículo (Editável)</label>
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                    placeholder="Ex: ABC-1234"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white uppercase font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                  >
                    <option value="Mecânica">Mecânica</option>
                    <option value="Suspensão">Suspensão</option>
                    <option value="Elétrica">Elétrica</option>
                    <option value="Pneus">Pneus</option>
                    <option value="Funilaria / Pintura">Funilaria / Pintura</option>
                    <option value="Revisão Periódica">Revisão Periódica</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              {/* Tipo de Manuntenção & Data Realização */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Modalidade <span className="text-rose-500">*</span></label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                  >
                    <option value="Preventiva">Preventiva</option>
                    <option value="Corretiva">Corretiva</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono font-bold text-sky-400">Data Realização <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Data da Proxima Manutenção */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Data da Próxima Revisão <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={proximaManutencao}
                  onChange={(e) => setProximaManutencao(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-xs"
                />
              </div>

              {/* KMs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Quilometragem Atual</label>
                  <input
                    type="number"
                    min="0"
                    value={quilometragemAtual}
                    onChange={(e) => setQuilometragemAtual(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">KM Próxima Revisão</label>
                  <input
                    type="number"
                    min="0"
                    value={proximaQuilometragem}
                    onChange={(e) => setProximaQuilometragem(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Valor da manutenção */}
              <div className="space-y-1 border-t border-slate-800/60 pt-2">
                <label className="text-emerald-400 block font-mono font-bold">Custo Total de Manutenção (R$)</label>
                <div className="relative">
                  <span className="text-slate-500 absolute left-2.5 top-1.5 font-mono text-xs">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorManutencao}
                    onChange={(e) => setValorManutencao(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Oficina e Fornecedor */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Oficina / Estabelecimento</label>
                  <input
                    type="text"
                    value={oficina}
                    onChange={(e) => setOficina(e.target.value)}
                    placeholder="Ex: Concessionária V-Grande"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Fornecedor de Peças</label>
                  <input
                    type="text"
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    placeholder="Ex: Distribuidora Autopeças"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
              </div>

              {/* Responsavel Técnico */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Responsável Técnico (Mecânico)</label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Nome do profissional encarregado"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                />
              </div>

              {/* Maintenance checklist 11 points */}
              <div className="border-t border-slate-800 pt-2 space-y-1.5">
                <span className="text-slate-400 block font-mono font-bold text-[10px] uppercase tracking-wider mb-2">
                  Checklist de Integridade Mecânica (11 Eixos):
                </span>
                
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={oleo} onChange={() => setOleo(!oleo)} className="rounded" />
                    Óleo Transmissão/Motor
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={filtro} onChange={() => setFiltro(!filtro)} className="rounded" />
                    Filtro Sedimento
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={freios} onChange={() => setFreios(!freios)} className="rounded" />
                    Borrachinas / Freios
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={pneus} onChange={() => setPneus(!pneus)} className="rounded" />
                    Pneus (Sulco Mínimo)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={rodas} onChange={() => setRodas(!rodas)} className="rounded" />
                    Rodas / Aperto Torque
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={suspensao} onChange={() => setSuspensao(!suspensao)} className="rounded" />
                    Suspensão / Buchas
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={amortecedores} onChange={() => setAmortecedores(!amortecedores)} className="rounded" />
                    Amortecedores
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={etiquetas} onChange={() => setEtiquetas(!etiquetas)} className="rounded" />
                    Etiquetas Homologadas
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={eletrica} onChange={() => setEletrica(!eletrica)} className="rounded" />
                    Elétrica Geral
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={motor} onChange={() => setMotor(!motor)} className="rounded" />
                    Motor / Bloco
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={lanternas} onChange={() => setLanternas(!lanternas)} className="rounded" />
                    Lanternas / Faróis
                  </label>
                </div>
              </div>

              {/* Photos upload mock */}
              <div className="border-t border-slate-800 pt-2 space-y-1">
                <span className="text-slate-400 block font-mono text-[10px] uppercase">Fotografia do Conserto / Danos</span>
                <input
                  type="file"
                  onChange={(e) => setFotoUrl(e.target.files?.[0]?.name ? "https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=1500&auto=format&fit=crop" : "")}
                  className="w-full text-slate-400 text-[10px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Descrição / Observações Técnicas <span className="text-rose-500">*</span></label>
                <textarea
                  rows={2}
                  required
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Relatório detalhado sobre peças substituídas, motivos ou diagnósticos de oficina..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded transition flex items-center justify-center gap-1 text-xs"
              >
                {editingItem ? "💾 Salvar Alterações" : "Confirmar e Registrar"}
              </button>
            </form>
          </div>
        )}

        {/* Listing of maintenances done */}
        <div className={`${isAdding ? "lg:col-span-2" : "col-span-full"} space-y-4`}>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquise por veículo, placa, categoria, oficina ou observações técnicas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filtered.map((item) => {
              // Summarize done points count
              const doneCount = Object.values(item.checklist || {}).filter((b) => b === true).length;
              return (
                <div 
                  key={item.id} 
                  className="bg-slate-900 p-5 rounded-xl border border-slate-800 hover:border-slate-750 transition flex flex-col md:flex-row gap-5"
                >
                  {/* Photo representation */}
                  <div className="w-full md:w-36 h-28 bg-slate-950 rounded border border-slate-800 shrink-0 overflow-hidden relative">
                    <img
                      src={item.fotoUrl || "https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=1500&auto=format&fit=crop"}
                      alt="Peças" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/70 px-1 py-0.5 rounded text-[8px] font-mono text-slate-350 border border-slate-800/50">
                      Cópia Inspeção
                    </span>
                  </div>

                  {/* Descriptions */}
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[9px] bg-sky-950 text-sky-400 border border-sky-900/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                              MANUTENÇÃO {item.tipo}
                            </span>
                            {item.categoria && (
                              <span className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
                                {item.categoria}
                              </span>
                            )}
                          </div>
                          
                          <h4 className="text-white text-sm font-semibold tracking-tight mt-1">
                            Veículo: <span className="font-mono text-white text-base font-bold bg-slate-950/40 px-1.5 py-0.5 rounded border border-slate-800/40">{item.veiculoId}</span>
                            {item.placa && item.placa !== item.veiculoId && (
                              <span className="text-slate-405 font-mono text-xs ml-2">({item.placa})</span>
                            )}
                          </h4>
                        </div>

                        <div className="text-right text-[10px] font-mono text-slate-350">
                          <span className="block">Rev: <strong className="text-slate-100">{item.data}</strong></span>
                          <span className="block text-rose-450 font-bold mt-1">Próx: {item.proximaManutencao}</span>
                        </div>
                      </div>

                      {/* Display key details: Valor, Oficina, Responsavel if filled */}
                      <p className="text-xs text-slate-300 italic font-sans py-1">"{item.observacao}"</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-850 text-[10px] font-mono text-slate-400 text-left">
                        <div>
                          <span className="text-slate-550 block font-sans">VALOR TOTAL</span>
                          <span className="text-emerald-400 font-bold text-xs">
                            {Number(item.valorManutencao || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-550 block font-sans">QUILOMETRAGEM</span>
                          <span className="text-slate-200">
                            {item.quilometragemAtual ? `${item.quilometragemAtual.toLocaleString()} KM` : "Não inf."}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-550 block font-sans">ST/OFICINA</span>
                          <span className="text-slate-200 truncate block" title={item.oficina || "Não inf."}>
                            {item.oficina || "Não informada"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-550 block font-sans">RESPONSÁVEL</span>
                          <span className="text-slate-200 truncate block" title={item.responsavel || "Não inf."}>
                            {item.responsavel || "Mecânico geral"}
                          </span>
                        </div>
                      </div>

                      {/* Verified 11 parameters badge list */}
                      <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-850/80">
                        <span className="text-[10px] text-slate-500 mr-2 font-mono">{doneCount} de 11 eixos OK:</span>
                        {Object.entries(item.checklist || {}).map(([key, val]) => (
                          <span 
                            key={key} 
                            className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${
                              val ? "bg-emerald-500/10 text-emerald-400 border border-emerald-950/20" : "bg-slate-950 text-slate-650"
                            }`}
                          >
                            {key.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Operational control buttons if user is authorized */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-850/60 w-full">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="px-3 py-1 bg-slate-950 hover:bg-slate-850 text-sky-400 hover:text-sky-300 rounded text-[10px] font-bold flex items-center gap-1 transition-all border border-slate-800"
                      >
                        <Edit className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (!isAuthorized) {
                            setNotification({
                              type: "error",
                              message: "Acesso Negado: Apenas supervisores e administradores master possuem privilégios para excluir manutenções."
                            });
                            return;
                          }
                          setDeletingItem(item);
                        }}
                        className="px-3 py-1 bg-slate-950 hover:bg-rose-955/20 text-rose-400 hover:text-rose-350 rounded text-[10px] font-bold flex items-center gap-1 transition-all border border-slate-800"
                      >
                        <Trash className="w-3 h-3" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-500 font-mono text-xs bg-slate-900 border border-slate-800 rounded-xl">
                Nenhum laudo de checklist técnico de oficina gravado no histórico.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Delete Confirmation Dialog */}
      {deletingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl max-w-sm w-full shadow-2xl space-y-4 text-xs font-sans text-left">
            <div className="flex items-center gap-2.5 text-rose-500">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
              <h3 className="text-white font-bold text-base tracking-tight">ATENÇÃO</h3>
            </div>
            
            <div className="text-slate-300 space-y-2">
              <p className="font-semibold text-slate-100">Deseja realmente excluir esta manutenção?</p>
              <p className="text-slate-400 leading-relaxed">
                Esta ação ficará registrada na auditoria de conformidade operacional do sistema e não poderá ser desfeita.
              </p>
              
              <div className="p-3 bg-slate-950 rounded border border-slate-850 space-y-1 font-mono text-[10px] text-slate-450 leading-normal">
                <p><span className="text-slate-600 block sm:inline-block sm:w-16">ID:</span> #{deletingItem.id}</p>
                <p><span className="text-slate-600 block sm:inline-block sm:w-16">Veículo:</span> {deletingItem.veiculoId}</p>
                <p><span className="text-slate-600 block sm:inline-block sm:w-16">Placa:</span> {deletingItem.placa || deletingItem.veiculoId}</p>
                <p><span className="text-slate-600 block sm:inline-block sm:w-16">Tipo:</span> {deletingItem.tipo}</p>
                <p><span className="text-slate-600 block sm:inline-block sm:w-16">Data:</span> {deletingItem.data}</p>
                <p><span className="text-slate-600 block sm:inline-block sm:w-16">Valor:</span> R$ {Number(deletingItem.valorManutencao || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-grow py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-grow py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
    </div>
  );
}
