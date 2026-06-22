import React, { useState } from "react";
import { 
  Plus, Search, DollarSign, FileText, Camera, Eye, 
  Trash, Check, Paperclip, Edit, AlertTriangle, X, CheckSquare 
} from "lucide-react";
import { Descarga, Veiculo, Motorista, Rota, EntregaOff, Usuario } from "../types";
import { NotificationModal, NotificationType } from "./NotificationModal";

interface DescargasProps {
  descargasList: Descarga[];
  veiculos: Veiculo[];
  motoristas: Motorista[];
  rotas: Rota[];
  offList: EntregaOff[];
  onRefresh: () => void;
  currentUser: Usuario;
}

export default function DescargasView({ 
  descargasList, 
  veiculos, 
  motoristas, 
  rotas, 
  offList, 
  onRefresh, 
  currentUser 
}: DescargasProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Descarga | null>(null);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<NotificationType | null>(null);

  // Deletion Modal
  const [deletingItem, setDeletingItem] = useState<Descarga | null>(null);
  const [motivoExclusao, setMotivoExclusao] = useState("");

  // Form states
  const [dt, setDt] = useState("");
  const [placa, setPlaca] = useState("");
  const [motoristaNome, setMotoristaNome] = useState("");
  const [valorDescarga, setValorDescarga] = useState<number>(0);
  const [reciboUrl, setReciboUrl] = useState("");
  const [tipoTaxa, setTipoTaxa] = useState("Taxa de Descarga");
  const [local, setLocal] = useState("Goiânia - Matriz");
  const [dataRecibo, setDataRecibo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");

  // Search DT / Typeahead variables
  const [dtInputSearch, setDtInputSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dtVerification, setDtVerification] = useState<{
    checked: boolean;
    found: boolean;
    info: {
      type: string;
      dt: string;
      motoristaNome: string;
      placa: string;
      veiculoModelo: string;
      unidadeId: string;
      status: string;
    } | null;
  }>({ checked: false, found: false, info: null });

  // Security Check
  const isAuthorized = currentUser?.perfil === "admin_master" || currentUser?.perfil === "admin_unidade";

  // Check if a DT exists in either rotas or offList
  const findDtInfo = (dtString: string) => {
    if (!dtString) return null;
    const cleanDt = dtString.trim();

    // 1. Search in rotas (Vistoria & DTs)
    const rotaMatch = rotas.find(r => r.dt === cleanDt || r.id === cleanDt);
    if (rotaMatch) {
      const mot = motoristas.find(m => m.id === rotaMatch.motoristaId);
      const veic = veiculos.find(v => v.id === rotaMatch.veiculoId || v.placa === rotaMatch.veiculoId);
      return {
        type: "Vistoria & DTs",
        dt: rotaMatch.dt,
        motoristaNome: mot ? mot.nome : "Motorista não identificado",
        placa: veic ? veic.placa : "Placa não identificada",
        veiculoModelo: veic ? veic.modelo : "",
        unidadeId: rotaMatch.unidadeId,
        status: rotaMatch.status
      };
    }

    // 2. Search in offList (Entregas OFF Route)
    const offMatch = offList.find(o => o.dt === cleanDt || o.id === cleanDt);
    if (offMatch) {
      const mot = motoristas.find(m => m.id === offMatch.motoristaId);
      const veic = veiculos.find(v => v.id === offMatch.veiculoId || v.placa === offMatch.veiculoId);
      return {
        type: "Entregas OFF Route",
        dt: offMatch.dt || offMatch.id,
        motoristaNome: mot ? mot.nome : "Motorista não identificado",
        placa: offMatch.placa || (veic ? veic.placa : "Placa não identificada"),
        veiculoModelo: veic ? veic.modelo : "",
        unidadeId: offMatch.unidadeId || "",
        status: offMatch.status_entrega || "Finalizada"
      };
    }

    return null;
  };

  // Obtain DT suggestions based on typing
  const getDtSuggestions = (query: string) => {
    if (!query || query.length < 1) return [];
    const qClean = query.trim().toLowerCase();

    const suggestions: Array<{
      dt: string;
      source: "Vistoria" | "OFF Route";
      motoristaNome: string;
      placa: string;
      veiculoModelo: string;
      unidadeId: string;
      status: string;
    }> = [];

    // Search rotas
    rotas.forEach(r => {
      const rDt = r.dt || r.id;
      const mot = motoristas.find(m => m.id === r.motoristaId);
      const motName = mot ? mot.nome : "";

      if (rDt.toLowerCase().includes(qClean) || motName.toLowerCase().includes(qClean)) {
        const veic = veiculos.find(v => v.id === r.veiculoId || v.placa === r.veiculoId);
        suggestions.push({
          dt: rDt,
          source: "Vistoria",
          motoristaNome: motName || "Motorista não identificado",
          placa: veic ? veic.placa : "",
          veiculoModelo: veic ? veic.modelo : "",
          unidadeId: r.unidadeId,
          status: r.status
        });
      }
    });

    // Search offList
    offList.forEach(o => {
      const oDt = o.dt || o.id;
      const mot = motoristas.find(m => m.id === o.motoristaId);
      const motName = mot ? mot.nome : "";

      if (oDt.toLowerCase().includes(qClean) || motName.toLowerCase().includes(qClean)) {
        const veic = veiculos.find(v => v.id === o.veiculoId || v.placa === o.veiculoId);
        suggestions.push({
          dt: oDt,
          source: "OFF Route",
          motoristaNome: motName || "Motorista não identificado",
          placa: o.placa || (veic ? veic.placa : ""),
          veiculoModelo: veic ? veic.modelo : "",
          unidadeId: o.unidadeId || "",
          status: o.status_entrega || "Finalizada"
        });
      }
    });

    // De-duplicate findings by DT
    const uniqueList: typeof suggestions = [];
    const handled = new Set<string>();
    for (const item of suggestions) {
      if (!handled.has(item.dt)) {
        handled.add(item.dt);
        uniqueList.push(item);
      }
    }

    return uniqueList.slice(0, 7); // Max 7 suggestions
  };

  const suggestions = getDtSuggestions(dtInputSearch);

  // Typeahead input changes
  const handleDtInputChange = (val: string) => {
    setDtInputSearch(val);
    setDt(val);
    setShowSuggestions(true);

    if (!val.trim()) {
      setDtVerification({ checked: false, found: false, info: null });
      return;
    }

    const info = findDtInfo(val);
    if (info) {
      setDtVerification({
        checked: true,
        found: true,
        info: info
      });
      // Auto populate fields
      setPlaca(info.placa);
      setMotoristaNome(info.motoristaNome);
    } else {
      setDtVerification({
        checked: true,
        found: false,
        info: null
      });
    }
  };

  const handleSelectSuggestedDt = (sug: typeof suggestions[0]) => {
    setDt(sug.dt);
    setDtInputSearch(sug.dt);
    setPlaca(sug.placa);
    setMotoristaNome(sug.motoristaNome);
    setShowSuggestions(false);

    setDtVerification({
      checked: true,
      found: true,
      info: {
        type: sug.source === "Vistoria" ? "Vistoria & DTs" : "Entregas OFF Route",
        dt: sug.dt,
        motoristaNome: sug.motoristaNome,
        placa: sug.placa,
        veiculoModelo: sug.veiculoModelo,
        unidadeId: sug.unidadeId,
        status: sug.status
      }
    });
  };

  const handleStartCreate = () => {
    setEditingItem(null);
    setDt("");
    setDtInputSearch("");
    setPlaca("");
    setMotoristaNome("");
    setValorDescarga(0);
    setReciboUrl("");
    setTipoTaxa("Taxa de Descarga");
    setLocal("Goiânia - Matriz");
    setDataRecibo(new Date().toISOString().split("T")[0]);
    setObservacoes("");
    setAttachedFileName("");
    setDtVerification({ checked: false, found: false, info: null });
    setIsAdding(true);
  };

  const handleStartEdit = (item: Descarga) => {
    // Check if user is authorized to edit
    if (!isAuthorized) {
      setNotification({
        type: "error",
        message: "Acesso Negado: Apenas supervisores e administradores master possuem privilégios para editar recibos neste módulo."
      });
      return;
    }

    setEditingItem(item);
    setDt(item.dt);
    setDtInputSearch(item.dt);
    setPlaca(item.placa);
    setMotoristaNome(item.motoristaNome);
    setValorDescarga(item.valorDescarga);
    setReciboUrl(item.reciboUrl || "");
    setTipoTaxa(item.tipoTaxa || "Taxa de Descarga");
    setLocal(item.local || "Goiânia - Matriz");
    setDataRecibo(item.data || new Date().toISOString().split("T")[0]);
    setObservacoes(item.observacoes || "");
    setAttachedFileName(item.reciboUrl ? "recibo_digitalizado.png" : "");

    const info = findDtInfo(item.dt);
    setDtVerification({
      checked: true,
      found: !!info,
      info: info
    });

    setIsAdding(true);
  };

  const handleTriggerDelete = (item: Descarga) => {
    if (!isAuthorized) {
      setNotification({
        type: "error",
        message: "Acesso Negado: Apenas supervisores e administradores master possuem privilégios para excluir recibos neste módulo."
      });
      return;
    }
    setDeletingItem(item);
    setMotivoExclusao("");
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    try {
      const response = await fetch(`/api/descargas/${deletingItem.id}?motivo=${encodeURIComponent(motivoExclusao)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email
        },
        body: JSON.stringify({ motivo: motivoExclusao })
      });

      if (response.ok) {
        setNotification({
          type: "success",
          message: "✅ Recibo de descarga excluído permanentemente!\nA ação foi registrada com sucesso no relatório de auditoria do sistema."
        });
        setDeletingItem(null);
        onRefresh();
      } else {
        const errorData = await response.json();
        setNotification({
          type: "error",
          message: `Erro ao excluir: ${errorData.error || "Operação recusada pelo servidor."}`
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "Erro de conexão ocorrido ao tentar processar a exclusão."
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check DT exists validation
    if (!dtVerification.found || !dtVerification.info) {
      setNotification({
        type: "error",
        message: "SALVAMENTO BLOQUEADO\n\n❌ DT NÃO ENCONTRADA\nA DT informada não está cadastrada no sistema. Verifique o número informado antes de continuar."
      });
      return;
    }

    if (!dt.trim() || !placa.trim() || !motoristaNome.trim() || valorDescarga <= 0) {
      setNotification({
        type: "error",
        message: "Por favor, selecione uma DT válida e preencha todos os campos do formulário."
      });
      return;
    }

    const submissionData = {
      dt: dt.trim(),
      placa: placa.trim(),
      motoristaNome: motoristaNome.trim(),
      valorDescarga: Number(valorDescarga),
      reciboUrl: reciboUrl || (attachedFileName ? "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1500&auto=format&fit=crop" : ""),
      data: dataRecibo,
      tipoTaxa,
      local,
      observacoes,
      unidadeId: dtVerification.info.unidadeId || currentUser.unidadeId
    };

    try {
      const url = editingItem ? `/api/descargas/${editingItem.id}` : "/api/descargas";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email,
        },
        body: JSON.stringify(submissionData),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: editingItem 
            ? "✅ Transação e relatório financeiro atualizados com sucesso!"
            : "✅ Recibo lançado e computado com sucesso!"
        });
        setIsAdding(false);
        setEditingItem(null);
        onRefresh();
      } else {
        const error = await res.json();
        setNotification({
          type: "error",
          message: `❌ Falha ao processar solicitação: ${error.error || "Operação recusada."}`
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "❌ Falha operacional de conexão com o banco de dados."
      });
    }
  };

  const handleSelectVehiclePreset = (vPlate: string) => {
    setPlaca(vPlate);
    const vObj = veiculos.find((v) => v.placa === vPlate);
    if (vObj?.motoristaId) {
      const motObj = motoristas.find((m) => m.id === vObj.motoristaId);
      if (motObj) {
        setMotoristaNome(motObj.nome);
      }
    }
  };

  const handleAttachMockFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
      setReciboUrl("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1500&auto=format&fit=crop");
    } else {
      setAttachedFileName("");
      setReciboUrl("");
    }
  };

  const filtered = descargasList.filter((x) => {
    const matchSearch = 
      x.dt.includes(searchTerm) ||
      x.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      x.motoristaNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (x.tipoTaxa && x.tipoTaxa.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex justify-between items-center bg-slate-900/30 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white">Controle de Taxas de Descargas / Chapa</h2>
          <p className="text-xs text-slate-400 font-mono">Veja adiantamentos, recibos de ajudantes de descarga e conciliação de DTs.</p>
        </div>
        {!isAdding && (
          <button
            onClick={handleStartCreate}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Lançar Recibo Chapa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Launch / Edit Modal Form */}
        {isAdding && (
          <div className="bg-slate-900 p-5 rounded-xl border border-sky-950/70 h-fit space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-400" />
                {editingItem ? "✏️ Editar Recibo Cadastrado" : "Lançar Despesa Chapa"}
              </h3>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setEditingItem(null);
                }} 
                className="text-xs text-slate-400 hover:text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-850"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
              
              {/* Pesquisa inteligente de DT */}
              <div className="space-y-1 relative">
                <label className="text-slate-400 block font-mono">
                  Pesquisa Inteligente de DT (Vistoria / OFF) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={dtInputSearch}
                    onChange={(e) => handleDtInputChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Digite número da DT ou Motorista..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white pr-7"
                  />
                  {dtInputSearch && (
                    <button 
                      type="button"
                      onClick={() => {
                        setDtInputSearch("");
                        setDt("");
                        setDtVerification({ checked: false, found: false, info: null });
                      }}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 left-5 right-5 mt-1 bg-slate-950 border border-slate-850 rounded-md shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                    {suggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSuggestedDt(sug)}
                        className="p-2 hover:bg-slate-900 border-b border-slate-900/50 cursor-pointer text-[10px] text-slate-300 transition flex flex-col justify-start"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-white">DT {sug.dt}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 font-mono text-sky-400">
                            {sug.source}
                          </span>
                        </div>
                        <div className="mt-0.5 text-slate-400">
                          Motorista: {sug.motoristaNome} • Placa: {sug.placa}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Indicator Panel */}
              {dtVerification.checked && (
                <div className="p-2.5 rounded-lg border text-[11px] font-sans">
                  {dtVerification.found && dtVerification.info ? (
                    <div className="bg-emerald-950/20 border-emerald-900/30 text-emerald-400 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-xs">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span>✅ DT Encontrada ({dtVerification.info.type})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono text-slate-300 mt-1">
                        <div><span className="text-slate-500">Mot:</span> {dtVerification.info.motoristaNome}</div>
                        <div><span className="text-slate-500">Placa:</span> {dtVerification.info.placa}</div>
                        <div><span className="text-slate-500">Unidade:</span> {dtVerification.info.unidadeId === "un-go" ? "Goiânia" : dtVerification.info.unidadeId}</div>
                        <div><span className="text-slate-500">Status:</span> {dtVerification.info.status}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-rose-950/20 border-rose-900/30 text-rose-400 space-y-1 p-1">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>❌ DT NÃO ENCONTRADA</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                        A DT informada não existe em nenhum módulo do sistema. Verifique o número informado. O salvamento permanecerá bloqueado.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Placa do veículo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Placa do Veículo</label>
                  <select
                    value={placa}
                    onChange={(e) => handleSelectVehiclePreset(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    {veiculos.map((v) => (
                      <option key={v.id} value={v.placa}>
                        {v.placa} ({v.modelo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Tipo de Taxa</label>
                  <select
                    value={tipoTaxa}
                    onChange={(e) => setTipoTaxa(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                  >
                    <option value="Taxa de Descarga">Taxa de Descarga</option>
                    <option value="Chapa (Ajudante)">Chapa (Ajudante)</option>
                    <option value="Serviço de Chapa Terceirizado">Chapa Terceirizado</option>
                    <option value="Estadia">Estadia</option>
                    <option value="Pedágio Extra">Pedágio Extra</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              {/* Motorista Declarado */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Motorista</label>
                <input
                  type="text"
                  required
                  value={motoristaNome}
                  onChange={(e) => setMotoristaNome(e.target.value)}
                  placeholder="Nome completo do motorista"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              {/* Data e Local */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Data do Recibo</label>
                  <input
                    type="date"
                    required
                    value={dataRecibo}
                    onChange={(e) => setDataRecibo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Cidade / Local</label>
                  <input
                    type="text"
                    required
                    value={local}
                    onChange={(e) => setLocal(e.target.value)}
                    placeholder="Ex: Goiânia - Matriz"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                  />
                </div>
              </div>

              {/* Valor de Descarga */}
              <div className="space-y-1">
                <label className="text-emerald-400 block font-mono font-medium">Custo Total Descarga / Chapa (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={valorDescarga}
                  onChange={(e) => setValorDescarga(Number(e.target.value))}
                  placeholder="Ex: 350.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Observações Operacionais</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione informações adicionais pertinentes sobre o serviço ou despesa..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
                />
              </div>

              {/* Place to attach Receipt */}
              <div className="p-2 rounded bg-slate-950 border border-slate-850 space-y-1.5">
                <span className="text-slate-400 block font-mono text-[10px]">Anexo de Recibo (Opcional)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="recibo-file-uploader"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleAttachMockFile}
                    className="hidden"
                  />
                  <label
                    htmlFor="recibo-file-uploader"
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white cursor-pointer transition flex items-center gap-1 text-[10px]"
                  >
                    <Paperclip className="w-3 h-3 text-sky-400" />
                    {attachedFileName ? "Alterar Arquivo" : "Escolher Arquivo..."}
                  </label>
                  {attachedFileName && (
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 truncate max-w-[200px]">
                      {attachedFileName}
                      <button 
                        type="button" 
                        onClick={() => {
                          setAttachedFileName("");
                          setReciboUrl("");
                        }}
                        className="text-rose-500 hover:text-rose-400 font-bold font-sans"
                      >
                        Remover
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={!dtVerification.found}
                className="w-full py-2 rounded transition flex items-center justify-center gap-1.5 font-bold font-sans bg-sky-600 hover:bg-sky-500 text-white disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <DollarSign className="w-3.5 h-3.5" />
                {editingItem ? "Atualizar Registro de Descarga" : "Confirmar Lançamento Chapa"}
              </button>
            </form>
          </div>
        )}

        {/* Display List Grid */}
        <div className={`${isAdding || selectedReceiptUrl ? "lg:col-span-2" : "col-span-full"} space-y-4`}>
          
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquise por DT, Placa, Motorista ou Tipo de Taxa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
              />
            </div>
            
            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
              <span>{filtered.length} registro(s) encontrado(s)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <div 
                key={item.id} 
                className="bg-slate-900 p-4 rounded-xl border border-slate-850 hover:border-slate-805 bg-slate-900/60 shadow-md flex flex-col justify-between space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono bg-sky-950/40 text-sky-400 px-2 py-0.5 rounded border border-sky-900/30">
                        DT #{item.dt}
                      </span>
                      {item.tipoTaxa && (
                        <span className="text-[9px] font-mono bg-indigo-950/40 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900/30">
                          {item.tipoTaxa}
                        </span>
                      )}
                    </div>
                    <h4 className="text-white text-sm font-semibold tracking-tight mt-2">{item.motoristaNome}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Placa: <strong className="text-slate-300">{item.placa}</strong> • Local: {item.local || "Goiânia"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                      Data: {item.data}
                    </p>
                    {item.observacoes && (
                      <p className="text-[10px] text-slate-400 italic bg-slate-950/60 px-2 py-1.5 rounded mt-2 border border-slate-900/50">
                        "{item.observacoes}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-emerald-400 font-bold font-mono text-sm">
                      {item.valorDescarga.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Frame */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-850/80 gap-2">
                  <div className="flex gap-1.5">
                    {/* View attachment if present */}
                    {item.reciboUrl ? (
                      <button
                        onClick={() => setSelectedReceiptUrl(item.reciboUrl!)}
                        className="text-[10px] text-sky-400 hover:text-white font-semibold font-mono flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800 transition"
                      >
                        <Eye className="w-3 h-3" /> Ver Recibo
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-500 font-mono px-2 py-1">Sem Comprovante</span>
                    )}
                  </div>

                  {/* Edit / Delete Buttons - restricted to auth roles */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(item)}
                      title="Editar Recibo"
                      className="p-1 px-2 text-slate-400 hover:text-sky-400 bg-slate-950 rounded border border-slate-850 hover:bg-slate-900 transition flex items-center gap-1 text-[10px]"
                    >
                      <Edit className="w-3 h-3" /> <span>Editar</span>
                    </button>
                    
                    <button
                      onClick={() => handleTriggerDelete(item)}
                      title="Excluir Recibo"
                      className="p-1 px-2 text-slate-400 hover:text-rose-400 bg-slate-950 rounded border border-slate-850 hover:bg-slate-900 transition flex items-center gap-1 text-[10px]"
                    >
                      <Trash className="w-3 h-3" /> <span>Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs bg-slate-900 border border-slate-800 rounded-xl">
                Nenhum recibo de descarga localizado nesta busca operante.
              </div>
            )}
          </div>
        </div>

        {/* Selected receipt simulation viewer */}
        {selectedReceiptUrl && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shrink-0 h-fit space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-white font-mono text-xs font-bold uppercase">Anexo: Recibo de Chapa</span>
              <button onClick={() => setSelectedReceiptUrl(null)} className="text-slate-500 hover:text-white">
                Fechar
              </button>
            </div>
            
            <div className="w-full h-44 bg-slate-950 rounded flex items-center justify-center overflow-hidden border border-slate-800 relative bg-cover bg-center" style={{ backgroundImage: `url(${selectedReceiptUrl})` }}>
              <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center text-center p-3 text-xs">
                <Paperclip className="w-6 h-6 text-sky-400 mb-1.5" />
                <span className="text-white font-bold block">Documento Validado Digitalmente</span>
                <span className="text-[10px] text-slate-400 font-mono mt-1">recibo_chapa_dt.pdf • 152 KB</span>
              </div>
            </div>

            <button
              onClick={() => {
                setNotification({
                  type: "success",
                  message: "✅ Cópia oficial do recibo de chapa obtida com sucesso!"
                });
              }}
              className="w-full py-1.5 bg-slate-950 border border-slate-800 text-white rounded text-xs hover:bg-slate-850"
            >
              Baixar Cópia Oficial
            </button>
          </div>
        )}

      </div>
      
      {/* Custom Deletion Dialog Modal with Motivo field */}
      {deletingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-500">
              <AlertTriangle className="w-7 h-7" />
              <h3 className="text-white font-bold text-base">ATENÇÃO</h3>
            </div>
            
            <div className="text-slate-300 text-xs space-y-2">
              <p className="font-semibold text-slate-100">Deseja realmente excluir este recibo?</p>
              <p className="text-slate-400">Esta ação ficará permanentemente registrada no histórico de auditoria.</p>
              
              <div className="p-2.5 bg-slate-950 rounded border border-slate-850 space-y-1 font-mono text-[10px] text-slate-300">
                <p><span className="text-slate-500">Recibo:</span> #{deletingItem.id}</p>
                <p><span className="text-slate-500">Data:</span> {deletingItem.data}</p>
                <p><span className="text-slate-500">DT:</span> {deletingItem.dt}</p>
                <p><span className="text-slate-500">Motorista:</span> {deletingItem.motoristaNome}</p>
                <p><span className="text-slate-500">Valor:</span> R$ {deletingItem.valorDescarga.toLocaleString("pt-BR", {minimumFractionDigits: 2})}</p>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-slate-400 block text-[10px] font-mono">Motivo da Exclusão <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={motivoExclusao}
                onChange={(e) => setMotivoExclusao(e.target.value)}
                placeholder="Ex: Erro de digitação / Novo recibo"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!motivoExclusao.trim()}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold transition disabled:opacity-55 disabled:cursor-not-allowed"
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
