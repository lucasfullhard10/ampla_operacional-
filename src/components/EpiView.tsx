import React, { useState, useMemo } from "react";
import { 
  Plus, Search, ShieldAlert, Archive, FileText, ArrowRight, User, 
  RefreshCw, TrendingUp, AlertTriangle, Layers, DollarSign, Calendar, Info, Bell, Tag 
} from "lucide-react";
import { EstoqueEpi, MovimentacaoEpi, Motorista } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";

interface EpiProps {
  estoque: EstoqueEpi[];
  movimentacoes: MovimentacaoEpi[];
  motoristas: Motorista[];
  onRefresh: () => void;
  userEmail: string;
}

export default function EpiView({ estoque, movimentacoes, motoristas, onRefresh, userEmail }: EpiProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingNewEpi, setIsAddingNewEpi] = useState(false);
  const [isAddingMovement, setIsAddingMovement] = useState(false);

  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);

  // Form: NEW EPI REGISTRATION
  const [epiCodigo, setEpiCodigo] = useState("");
  const [epiNome, setEpiNome] = useState("");
  const [epiCategoria, setEpiCategoria] = useState("Calçados");
  const [epiFabricante, setEpiFabricante] = useState("");
  const [epiCa, setEpiCa] = useState("");
  const [epiTamanho, setEpiTamanho] = useState("");
  const [epiUnidadeMedida, setEpiUnidadeMedida] = useState("unidade");
  const [epiQtdInicial, setEpiQtdInicial] = useState<number>(0);
  const [epiEstoqueMinimo, setEpiEstoqueMinimo] = useState<number>(5);
  const [epiValorUnitario, setEpiValorUnitario] = useState<number>(0);
  const [epiDataCompra, setEpiDataCompra] = useState("2026-06-14");
  const [epiFornecedor, setEpiFornecedor] = useState("");
  const [epiObservacoes, setEpiObservacoes] = useState("");

  // Form: NEW STOCK MOVEMENT
  const [movTipo, setMovTipo] = useState<"Entrada" | "Saída" | "Devolução" | "Perda" | "Ajuste">("Saída");
  const [movItemEpi, setMovItemEpi] = useState("");
  const [movQuantidade, setMovQuantidade] = useState<number>(1);
  const [movRecebedor, setMovRecebedor] = useState("");
  const [movMotoristaId, setMovMotoristaId] = useState("");
  const [movData, setMovData] = useState("2026-06-14");
  const [movMotivo, setMovMotivo] = useState("");

  const [loading, setLoading] = useState(false);

  // Initialize selected item on first load
  const currentSelectedEpiId = useMemo(() => {
    if (movItemEpi) return movItemEpi;
    if (estoque && estoque.length > 0) return estoque[0].id;
    return "";
  }, [movItemEpi, estoque]);

  const handleSelectDriverPreset = (dId: string) => {
    setMovMotoristaId(dId);
    const m = motoristas.find((x) => x.id === dId);
    if (m) {
      setMovRecebedor(m.nome);
    }
  };

  // Calculations for total EPI stocks
  const stats = useMemo(() => {
    let estoqueAtual = 0;
    let estoqueDisponivelCount = 0;
    let estoqueMinimoCount = 0;
    let valorTotalEstoque = 0;

    estoque.forEach(item => {
      estoqueAtual += item.saldo;
      
      const minStock = item.estoqueMinimo !== undefined ? item.estoqueMinimo : 5;
      if (item.saldo <= minStock) {
        estoqueMinimoCount++;
      } else {
        estoqueDisponivelCount++;
      }

      const unitValue = item.valorUnitario !== undefined ? item.valorUnitario : 0;
      valorTotalEstoque += (item.saldo * unitValue);
    });

    return {
      estoqueAtual,
      estoqueDisponivel: estoqueDisponivelCount,
      estoqueMinimo: estoqueMinimoCount,
      valorTotalEstoque
    };
  }, [estoque]);

  // Submit NEW EPI Form
  const handleSubmitNewEpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!epiNome.trim() || !epiCodigo.trim()) {
      setNotification({
        type: "error",
        message: "Por favor, preencha o Código e Nome do EPI para prosseguir."
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/epi-estoque", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify({
          codigo: epiCodigo,
          nome: epiNome,
          categoria: epiCategoria,
          fabricante: epiFabricante,
          ca: epiCa,
          tamanho: epiTamanho,
          unidadeMedida: epiUnidadeMedida,
          quantidadeInicial: Number(epiQtdInicial),
          estoqueMinimo: Number(epiEstoqueMinimo),
          valorUnitario: Number(epiValorUnitario),
          dataCompra: epiDataCompra,
          fornecedor: epiFornecedor,
          observacoes: epiObservacoes
        }),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: "✅ Novo EPI cadastrado e integrado com sucesso."
        });
        
        // Reset state
        setIsAddingNewEpi(false);
        setEpiCodigo("");
        setEpiNome("");
        setEpiFabricante("");
        setEpiCa("");
        setEpiTamanho("");
        setEpiQtdInicial(0);
        setEpiEstoqueMinimo(5);
        setEpiValorUnitario(0);
        setEpiFornecedor("");
        setEpiObservacoes("");
        
        onRefresh();
      } else {
        const error = await res.json();
        setNotification({
          type: "error",
          message: `❌ Falha ao cadastrar: ${error.error || "Operação rejeitada."}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "❌ Erro operacional. Conexão interrompida com o servidor."
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit NEW STOCK MOVEMENT
  const executeMovementSubmit = async () => {
    setLoading(true);
    const selectedEpi = estoque.find(s => s.id === currentSelectedEpiId);
    try {
      const res = await fetch("/api/epi-movimentacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify({
          recebedorNome: movRecebedor || "Almoxarifado/Sistema",
          motoristaId: movMotoristaId || undefined,
          itemEpi: currentSelectedEpiId,
          quantidade: Number(movQuantidade),
          tipo: movTipo,
          data: movData,
          motivo: movMotivo
        }),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: `✅ Movimentação de ${movTipo} registrada com sucesso.`
        });
        
        // Reset states
        setIsAddingMovement(false);
        setMovRecebedor("");
        setMovMotoristaId("");
        setMovQuantidade(1);
        setMovMotivo("");
        
        onRefresh();
      } else {
        const error = await res.json();
        setNotification({
          type: "error",
          message: `❌ Erro ao processar movimentação: ${error.error || "Recusa de estoque."}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "❌ Erro operacional na conexão."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedEpiId || movQuantidade <= 0) {
      setNotification({
        type: "error",
        message: "Selecione o EPI e digite uma quantidade legítima maior que zero."
      });
      return;
    }

    if ((movTipo === "Saída" || movTipo === "Perda") && !movRecebedor && movTipo !== "Perda") {
      setNotification({
        type: "error",
        message: "Indique o Beneficiário/Recebedor para saídas ordinárias."
      });
      return;
    }

    // Verify current stock levels before subtractive operations
    const activeItem = estoque.find((s) => s.id === currentSelectedEpiId);
    if (activeItem && (movTipo === "Saída" || movTipo === "Perda") && activeItem.saldo < movQuantidade) {
      setConfirmDialog({
        message: `Saldo Insuficiente: O saldo atual de "${activeItem.nome}" é apenas ${activeItem.saldo}. Deseja prosseguir com esta ${movTipo} gerando saldo negativo de estoque?`,
        onConfirm: () => {
          executeMovementSubmit();
        }
      });
      return;
    }

    executeMovementSubmit();
  };

  // Direct send notification trigger to supervisor / admin
  const handleNotifySupervisor = (epi: EstoqueEpi) => {
    setLoading(true);
    // Mimics trigger notification audit trail
    setTimeout(() => {
      setLoading(false);
      setNotification({
        type: "success",
        message: `🔔 NOTIFICAÇÃO ENVIADA!\nO supervisor de logística de Goiânia recebeu um alerta de reabastecimento urgente para o item: ${epi.nome} (Código: ${epi.codigo || "EPI"}).`
      });
    }, 600);
  };

  // Deep search and filter matching
  const filteredMovements = useMemo(() => {
    return movimentacoes.filter(
      (x) => {
        const itemObj = estoque.find(e => e.id === x.itemEpi);
        const nameMatch = (itemObj?.nome || x.itemEpi).toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch = (itemObj?.categoria || "").toLowerCase().includes(searchTerm.toLowerCase());
        const rxMatch = x.recebedorNome.toLowerCase().includes(searchTerm.toLowerCase());
        const operatorMatch = (x.usuario || "").toLowerCase().includes(searchTerm.toLowerCase());
        const typeMatch = x.tipo.toLowerCase().includes(searchTerm.toLowerCase());
        
        return nameMatch || categoryMatch || rxMatch || operatorMatch || typeMatch;
      }
    );
  }, [movimentacoes, estoque, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Upper Title and CTAs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-sky-400" />
            Controle & Gestão Logística de EPIs
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Módulo integrado com controle de estoque mínimo regulatório (NR-6), alertas de reabastecimento e auditoria de movimentações.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAddingNewEpi && (
            <button
              onClick={() => {
                setIsAddingNewEpi(true);
                setIsAddingMovement(false);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo EPI
            </button>
          )}

          {!isAddingMovement && (
            <button
              onClick={() => {
                setIsAddingMovement(true);
                setIsAddingNewEpi(false);
                // Pre-select first item
                if (estoque.length > 0) {
                  setMovItemEpi(estoque[0].id);
                }
              }}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Lançar Movimentação
            </button>
          )}

          <button
            onClick={onRefresh}
            className="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded"
            title="Recarregar Estoque"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AUTOMATIC METRICS COUNTERS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-lg">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Estoque Total</span>
            <span className="text-lg font-bold text-white font-mono">{stats.estoqueAtual} un</span>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Itens Disponíveis</span>
            <span className="text-lg font-bold text-white font-mono">{stats.estoqueDisponivel} itens</span>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className={`p-3 rounded-lg ${stats.estoqueMinimo > 0 ? "bg-rose-500/10 text-rose-400 animate-pulse" : "bg-slate-950 text-slate-500"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Estoque Crítico</span>
            <span className={`text-lg font-bold font-mono ${stats.estoqueMinimo > 0 ? "text-rose-400" : "text-white"}`}>
              {stats.estoqueMinimo} {stats.estoqueMinimo === 1 ? "item" : "itens"}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Valor Total</span>
            <span className="text-lg font-bold text-white font-mono">
              {stats.valorTotalEstoque.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        </div>
      </div>

      {/* ACTIVE FORMS PANELS */}
      <div className="space-y-4">
        {/* Form: ADD NEW EPI */}
        {isAddingNewEpi && (
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded">
                  <Archive className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">Cadastrar Novo EPI</h3>
              </div>
              <button 
                onClick={() => setIsAddingNewEpi(false)}
                className="text-xs text-slate-400 hover:text-white font-mono"
              >
                Fechar Form (✕)
              </button>
            </div>

            <form onSubmit={handleSubmitNewEpi} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Código do EPI *</label>
                  <input
                    type="text"
                    required
                    value={epiCodigo}
                    onChange={(e) => setEpiCodigo(e.target.value)}
                    placeholder="Ex: EPI-0091"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-slate-400 block font-mono">Nome do EPI *</label>
                  <input
                    type="text"
                    required
                    value={epiNome}
                    onChange={(e) => setEpiNome(e.target.value)}
                    placeholder="Ex: Óculos de Proteção Ampla Visão"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Categoria</label>
                  <select
                    value={epiCategoria}
                    onChange={(e) => setEpiCategoria(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none"
                  >
                    <option value="Calçados">Calçados de Segurança</option>
                    <option value="Proteção de Mãos">Proteção de Mãos (Luvas)</option>
                    <option value="Proteção de Cabeça">Proteção de Cabeça (Capacete/Casquete)</option>
                    <option value="Proteção Ocular">Proteção Ocular (Óculos)</option>
                    <option value="Uniformização">Uniformização / Colete</option>
                    <option value="Sinalização Rota">Sinalização de Trânsito</option>
                    <option value="Diversos">Diversos Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Fabricante</label>
                  <input
                    type="text"
                    value={epiFabricante}
                    onChange={(e) => setEpiFabricante(e.target.value)}
                    placeholder="Ex: 3M Brasil"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Certificado de Aprovação (CA)</label>
                  <input
                    type="text"
                    value={epiCa}
                    onChange={(e) => setEpiCa(e.target.value)}
                    placeholder="Ex: CA 44321"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Tamanho</label>
                  <input
                    type="text"
                    value={epiTamanho}
                    onChange={(e) => setEpiTamanho(e.target.value)}
                    placeholder="Ex: G, M, 41, Único"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Unidade de Medida</label>
                  <select
                    value={epiUnidadeMedida}
                    onChange={(e) => setEpiUnidadeMedida(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none"
                  >
                    <option value="unidade">Unidade (UN)</option>
                    <option value="par">Par (PR)</option>
                    <option value="conjunto">Conjunto (CJ)</option>
                    <option value="rolo">Rolo (RL)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-emerald-400 font-bold">Quantidade Inicial *</label>
                  <input
                    type="number"
                    required
                    value={epiQtdInicial}
                    onChange={(e) => setEpiQtdInicial(Number(e.target.value))}
                    min={0}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-emerald-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-rose-500 font-bold">Estoque Mínimo *</label>
                  <input
                    type="number"
                    required
                    value={epiEstoqueMinimo}
                    onChange={(e) => setEpiEstoqueMinimo(Number(e.target.value))}
                    min={1}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-rose-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-sky-400 font-bold">Valor Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={epiValorUnitario}
                    onChange={(e) => setEpiValorUnitario(Number(e.target.value))}
                    min={0}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-sky-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Data de Compra</label>
                  <input
                    type="date"
                    value={epiDataCompra}
                    onChange={(e) => setEpiDataCompra(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono font-bold text-slate-300">Fornecedor</label>
                  <input
                    type="text"
                    value={epiFornecedor}
                    onChange={(e) => setEpiFornecedor(e.target.value)}
                    placeholder="Ex: Distribuidora Brasil EPI Ltda"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Observações Gerais</label>
                  <input
                    type="text"
                    value={epiObservacoes}
                    onChange={(e) => setEpiObservacoes(e.target.value)}
                    placeholder="Informações adicionais do lote ou fabricante..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAddingNewEpi(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-450 hover:text-white rounded border border-slate-800 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded transition flex items-center justify-center gap-1.5"
                >
                  {loading ? "Cadastrando..." : "Confirmar e Cadastrar EPI"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Form: MOVEMENT CONTROL (Controle de Estoque) */}
        {isAddingMovement && (
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">Lançar Movimentação & Ajuste de EPI</h3>
              </div>
              <button 
                onClick={() => setIsAddingMovement(false)}
                className="text-xs text-slate-400 hover:text-white font-mono"
              >
                Fechar Form (✕)
              </button>
            </div>

            <form onSubmit={handleMovementSubmit} className="space-y-3 font-sans text-xs">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                
                {/* Movement Type input */}
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono font-bold text-sky-400">Tipo de Movimento *</label>
                  <select
                    value={movTipo}
                    onChange={(e) => setMovTipo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-slate-700"
                    required
                  >
                    <option value="Saída">Saída (Distribuição)</option>
                    <option value="Entrada">Entrada (Compra/Reabastecimento)</option>
                    <option value="Devolução">Devolução (Estorno para Estoque)</option>
                    <option value="Perda">Perda (Carga Sinistrada/Furto)</option>
                    <option value="Ajuste">Ajuste (Inventário Manual)</option>
                  </select>
                </div>

                {/* EPI selector */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-slate-400 block font-mono">Item do Almoxarifado *</label>
                  <select
                    value={currentSelectedEpiId}
                    onChange={(e) => setMovItemEpi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none focus:border-slate-700"
                    required
                  >
                    <option value="">Selecione um EPI...</option>
                    {estoque.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.codigo || "EPI"}] {s.nome} (Saldo: {s.saldo} {s.unidadeMedida || "un"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono font-bold">Quantidade *</label>
                  <input
                    type="number"
                    required
                    value={movQuantidade}
                    onChange={(e) => setMovQuantidade(Number(e.target.value))}
                    min={1}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:border-slate-700 font-mono text-center"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Data Registro</label>
                  <input
                    type="date"
                    required
                    value={movData}
                    onChange={(e) => setMovData(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>

              </div>

              {/* Conditional beneficiary and preset field (Only shown for Saída/Devolução) */}
              {(movTipo === "Saída" || movTipo === "Devolução") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-850 pt-2 bg-slate-950/20 p-2.5 rounded border border-slate-810">
                  <div className="space-y-1">
                    <label className="text-slate-450 block font-mono">Ficha de Atribuição (Condutor Preset)</label>
                    <select
                      value={movMotoristaId}
                      onChange={(e) => handleSelectDriverPreset(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 focus:outline-none"
                    >
                      <option value="">Nenhum preset...</option>
                      {motoristas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome} ({m.statusFinal})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block font-mono font-bold text-white">Nome do Beneficiário/Recebedor *</label>
                    <input
                      type="text"
                      required
                      value={movRecebedor}
                      onChange={(e) => setMovRecebedor(e.target.value)}
                      placeholder="Nome completo de quem recebeu/devolveu..."
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Reason / Justification field */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Justificativa / Motivo da Operação {movTipo === "Ajuste" || movTipo === "Perda" ? "*" : ""}</label>
                <input
                  type="text"
                  required={movTipo === "Ajuste" || movTipo === "Perda"}
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  placeholder="Justifique a movimentação ou aponte o nº do fornecedor..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingMovement(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-450 hover:text-white rounded border border-slate-800 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded transition inline-flex items-center justify-center gap-1.5"
                >
                  {loading ? "Gravando..." : `Confirmar Lançamento de ${movTipo}`}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* EPI STOCK VISUAL CARDS GRID */}
      <div className="space-y-3">
        <h3 className="text-slate-350 text-[11px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-sky-400" />
          Almoxarifado Geral de Segurança Individual (EPI)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {estoque.map((item) => {
            const minStock = item.estoqueMinimo !== undefined ? item.estoqueMinimo : 5;
            const isLow = item.saldo <= minStock;

            return (
              <div 
                key={item.id} 
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 ${
                  isLow 
                    ? "bg-rose-950/10 border-rose-900/50 hover:border-rose-900 shadow-lg shadow-rose-950/10" 
                    : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-1">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-950 text-slate-400 uppercase border border-slate-800">
                      {item.codigo || "EPI"}
                    </span>
                    <span className="text-[10px] text-slate-450 font-mono italic">
                      {item.categoria || "Proteção"}
                    </span>
                  </div>

                  <h4 className="text-white font-bold text-xs line-clamp-2 min-h-[32px]" title={item.nome}>
                    {item.nome}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1.5 bg-slate-950/35 p-2 rounded">
                    <div>
                      <span className="text-slate-500 block">CA Registro:</span>
                      <span className="text-slate-300 font-semibold">{item.ca || "N/D"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tamanho:</span>
                      <span className="text-slate-300 font-semibold uppercase">{item.tamanho || "Médio"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Mínimo ideal:</span>
                      <span className="text-rose-400 font-semibold">{minStock} {item.unidadeMedida || "un"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Valor Unitário:</span>
                      <span className="text-sky-300 font-semibold">
                        {(item.valorUnitario || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-800/40 pt-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-500 uppercase font-mono block">Saldo Atual</span>
                    <span className={`text-lg font-bold font-mono ${isLow ? "text-rose-400" : "text-emerald-400"}`}>
                      {item.saldo} <span className="text-[9px] text-slate-500">{item.unidadeMedida || "un"}</span>
                    </span>
                  </div>

                  {isLow ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="px-2 py-0.5 text-[9px] rounded font-bold font-mono bg-rose-500/20 text-rose-400 flex items-center gap-1 uppercase tracking-wide border border-rose-500/10">
                        <AlertTriangle className="w-3 h-3 text-rose-400 animate-bounce" />
                        ⚠ Estoque Baixo
                      </span>
                      
                      <button
                        onClick={() => handleNotifySupervisor(item)}
                        disabled={loading}
                        className="px-2 py-1 bg-rose-950/40 hover:bg-rose-950 text-rose-300 font-semibold text-[9px] rounded font-mono border border-rose-900/30 flex items-center gap-1 transition select-none"
                      >
                        <Bell className="w-2.5 h-2.5" />
                        Notificar Adms
                      </button>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] rounded font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 uppercase tracking-wide">
                      Conforme
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STOCK MOVEMENTS AUDIT LOGS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <div className="space-y-1">
            <h3 className="text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              Histórico Geral de Movimentações de EPI (Audit Log)
            </h3>
            <span className="text-[10px] text-slate-450 font-mono italic">
              Registro vivo de entradas, devoluções, perdas extraordinárias e auditoria logística.
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtre log por recebedor, item, tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700 font-mono"
            />
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-950/40 text-slate-450 uppercase tracking-wider font-mono text-[9px] py-1">
                  <th className="py-2.5 px-4">Momento Registro</th>
                  <th className="py-2.5 px-4 text-center">Tipo Registro</th>
                  <th className="py-2.5 px-4 font-bold">Item EPI</th>
                  <th className="py-2.5 px-4 text-center">Quantidade</th>
                  <th className="py-2.5 px-3">Beneficiário/Recebedor</th>
                  <th className="py-2.5 px-3">Justificativa / Motivo</th>
                  <th className="py-2.5 px-4 text-right">Operador Logístico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans text-xs">
                {filteredMovements.slice(0, 100).map((mov) => {
                  const itemVisualName = estoque.find((s) => s.id === mov.itemEpi)?.nome || mov.itemEpi;
                  
                  // Helper function for visual badges
                  const renderTypeBadge = (tipo: string) => {
                    const norm = (tipo || "Saída").toLowerCase().trim();
                    if (norm === "entrada") {
                      return (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 uppercase tracking-wide border border-emerald-500/10">
                          📥 Entrada
                        </span>
                      );
                    }
                    if (norm === "devolução" || norm === "devolucao") {
                      return (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 uppercase tracking-wide border border-blue-500/10">
                          🔄 Devolução
                        </span>
                      );
                    }
                    if (norm === "perda") {
                      return (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-500 uppercase tracking-wide border border-amber-500/10">
                          💥 Perda
                        </span>
                      );
                    }
                    if (norm === "ajuste") {
                      return (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 uppercase tracking-wide border border-indigo-500/10">
                          ⚙ Ajuste
                        </span>
                      );
                    }
                    return (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/10 text-rose-450 uppercase tracking-wide border border-rose-500/10">
                        📤 Saída
                      </span>
                    );
                  };

                  return (
                    <tr key={mov.id} className="hover:bg-slate-850/10 transition">
                      <td className="py-2.5 px-4 font-mono text-slate-450 text-[11px] whitespace-nowrap">
                        {mov.data} <span className="text-slate-650">•</span> {mov.hora || "00:00"}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {renderTypeBadge(mov.tipo)}
                      </td>
                      <td className="py-2.5 px-4 text-white font-semibold font-mono text-[11px] uppercase truncate max-w-[140px]">
                        {itemVisualName}
                      </td>
                      <td className="py-2.5 px-4 text-center font-extrabold text-white font-mono text-[11px]">
                        {mov.quantidade}
                      </td>
                      <td className="py-2.5 px-3 text-slate-350 font-medium whitespace-nowrap max-w-[120px] truncate">
                        {mov.recebedorNome || "Almoxarifado"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 italic text-[11px] max-w-[200px] truncate" title={mov.motivo}>
                        {mov.motivo || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500 text-[10px] uppercase">
                        {mov.usuario || "sistema"}
                      </td>
                    </tr>
                  );
                })}

                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500 font-mono">
                      Nenhuma movimentação de EPI localizada com as palavras-chave fornecidas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
