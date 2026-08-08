import React, { useState, useEffect, useMemo } from "react";
import { X, Save, AlertTriangle, FileText, Calendar, DollarSign, User, Truck, Building2, MapPin, Phone, Hash } from "lucide-react";
import { DevolucaoRegistro, DevolucaoCliente, DevolucaoMotorista, DevolucaoMotivo, Veiculo } from "../../types";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: any) => Promise<void>;
  editRecord?: DevolucaoRegistro | null;
  clientes?: DevolucaoCliente[];
  motoristas?: DevolucaoMotorista[];
  motivos?: DevolucaoMotivo[];
  veiculos?: Veiculo[];
  unidades?: any[];
  currentUser: any;
}

export default function DevolucoesRegistroModal({
  isOpen,
  onClose,
  onSave,
  editRecord,
  clientes = [],
  motoristas = [],
  motivos = [],
  veiculos = [],
  unidades = [],
  currentUser
}: ModalProps) {
  const isEditing = Boolean(editRecord);

  // Vehicles state fallback if not passed as prop
  const [fetchedVehicles, setFetchedVehicles] = useState<Veiculo[]>([]);
  // System Drivers (from /api/motoristas) state fallback
  const [fetchedSystemDrivers, setFetchedSystemDrivers] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch system drivers from main database if open
    fetch("/api/motoristas", {
      headers: { "x-user-email": currentUser?.email || "" }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFetchedSystemDrivers(data);
      })
      .catch(err => console.error("Erro ao buscar motoristas da base em DevolucoesRegistroModal:", err));

    if (veiculos && veiculos.length > 0) return;

    // Fetch vehicles if not provided
    fetch("/api/veiculos", {
      headers: { "x-user-email": currentUser?.email || "" }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFetchedVehicles(data);
      })
      .catch(err => console.error("Erro ao buscar veículos em DevolucoesRegistroModal:", err));
  }, [isOpen, veiculos, currentUser]);

  const allVehicles = veiculos.length > 0 ? veiculos : fetchedVehicles;

  // Combine drivers from system database (/api/motoristas) and devolucoes drivers prop
  const allCombinedDrivers = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    // 1. First add system drivers from /api/motoristas (filtering out BLOQUEADO)
    fetchedSystemDrivers.forEach(m => {
      if (m.statusFinal === "BLOQUEADO") return; // Apenas liberados da base
      const key = (m.matricula || m.cpf || m.id || m.nome).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: m.id,
          matricula: m.matricula || m.id || m.cpf || "",
          nome: m.nome,
          telefone: m.telefone || "",
          unidadeId: m.unidadeId,
          statusFinal: m.statusFinal || "LIBERADO"
        });
      }
    });

    // 2. Add devolucoes module drivers prop
    motoristas.forEach(m => {
      const key = (m.matricula || m.id || m.nome).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: m.id,
          matricula: m.matricula || m.id || "",
          nome: m.nome,
          telefone: m.telefone || "",
          unidadeId: m.unidadeId,
          statusFinal: "LIBERADO"
        });
      }
    });

    return list;
  }, [fetchedSystemDrivers, motoristas]);

  // Form states
  const [dataOcorrido, setDataOcorrido] = useState(new Date().toISOString().split("T")[0]);

  // Resolved unit for logged in user or edit record
  const effectiveUnitId = useMemo(() => {
    if (editRecord?.unidadeId || editRecord?.filial) {
      return editRecord.unidadeId || editRecord.filial;
    }
    if (currentUser?.unidadeId && currentUser.unidadeId !== "Todas") {
      return currentUser.unidadeId;
    }
    if (currentUser?.unidade && currentUser.unidade !== "Todas") {
      return currentUser.unidade;
    }
    return unidades[0]?.id || "un-go";
  }, [editRecord, currentUser, unidades]);

  const unitDisplayName = useMemo(() => {
    const matched = unidades.find(u => u.id === effectiveUnitId || u.nome?.toLowerCase() === String(effectiveUnitId).toLowerCase() || u.cidade?.toLowerCase() === String(effectiveUnitId).toLowerCase());
    const name = matched ? (matched.nome || matched.cidade) : (currentUser?.unidade || currentUser?.unidadeId || effectiveUnitId || "Goiânia");
    return name.toUpperCase().startsWith("CDA") ? name : `CDA ${name}`;
  }, [effectiveUnitId, unidades, currentUser]);

  const [motoristaMatricula, setMotoristaMatricula] = useState("");
  const [motoristaNome, setMotoristaNome] = useState("");
  const [motoristaTelefone, setMotoristaTelefone] = useState("");

  const [veiculoPlaca, setVeiculoPlaca] = useState("");
  const [veiculoModelo, setVeiculoModelo] = useState("");

  const [clienteCodigo, setClienteCodigo] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [gerente, setGerente] = useState("");
  const [canal, setCanal] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [endereco, setEndereco] = useState("");

  const [numeroNF, setNumeroNF] = useState("");
  const [valorNF, setValorNF] = useState<string>("");

  const [motivoCodigo, setMotivoCodigo] = useState("Y40");
  const [motivoDescricao, setMotivoDescricao] = useState("PDV Fechado");

  const [status, setStatus] = useState<string>("Aguardando Tratativa");
  const [observacao, setObservacao] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Filter motoristas strictly by unit logada (combining system database + devolucoes motoristas)
  const availableDrivers = useMemo(() => {
    if (!allCombinedDrivers || allCombinedDrivers.length === 0) return [];

    if (!effectiveUnitId || effectiveUnitId === "Todas") return allCombinedDrivers;

    const unitObj = unidades.find(u => u.id === effectiveUnitId);
    const unitName = (unitObj?.nome || unitObj?.cidade || effectiveUnitId).toLowerCase();

    const filtered = allCombinedDrivers.filter(m => {
      if (!m.unidadeId) return true;
      if (m.unidadeId === effectiveUnitId) return true;
      const mUnitObj = unidades.find(u => u.id === m.unidadeId);
      const mUnitName = (mUnitObj?.nome || mUnitObj?.cidade || m.unidadeId).toLowerCase();
      return mUnitName.includes(unitName) || unitName.includes(mUnitName);
    });

    return filtered.length > 0 ? filtered : allCombinedDrivers;
  }, [allCombinedDrivers, effectiveUnitId, unidades]);

  // Filter veiculos strictly by unit logada
  const availableVehicles = useMemo(() => {
    if (!effectiveUnitId || effectiveUnitId === "Todas") return allVehicles;

    const unitObj = unidades.find(u => u.id === effectiveUnitId);
    const unitName = (unitObj?.nome || unitObj?.cidade || effectiveUnitId).toLowerCase();

    const filtered = allVehicles.filter(v => {
      if (!v.unidadeId) return true;
      if (v.unidadeId === effectiveUnitId) return true;
      const vUnitObj = unidades.find(u => u.id === v.unidadeId);
      const vUnitName = (vUnitObj?.nome || vUnitObj?.cidade || v.unidadeId).toLowerCase();
      return vUnitName.includes(unitName) || unitName.includes(vUnitName);
    });

    return filtered.length > 0 ? filtered : allVehicles;
  }, [allVehicles, effectiveUnitId, unidades]);

  // Reset or Populate form on open/edit
  useEffect(() => {
    if (!isOpen) return;

    if (editRecord) {
      setDataOcorrido(editRecord.dataOcorrido || editRecord.data || new Date().toISOString().split("T")[0]);

      setMotoristaMatricula(editRecord.motoristaMatricula || "");
      setMotoristaNome(editRecord.motoristaNome || "");
      setMotoristaTelefone(editRecord.motoristaTelefone || "");

      setVeiculoPlaca((editRecord as any).veiculoPlaca || (editRecord as any).veiculo || "");
      setVeiculoModelo((editRecord as any).veiculoModelo || "");

      setClienteCodigo(editRecord.clienteCodigo || "");
      setClienteNome(editRecord.clienteNome || editRecord.clienteNomeFantasia || editRecord.clienteRazaoSocial || "");
      setVendedor(editRecord.vendedor || "");
      setSupervisor(editRecord.supervisor || "");
      setGerente(editRecord.gerente || "");
      setCanal(editRecord.canal || "");
      setTelefoneCliente(editRecord.telefoneCliente || (editRecord as any).telefone || "");
      setEndereco(editRecord.endereco || "");

      setNumeroNF(editRecord.numeroNF || "");
      setValorNF(editRecord.valorNF !== undefined ? String(editRecord.valorNF) : "");

      setMotivoCodigo(editRecord.motivoCodigo || "Y40");
      setMotivoDescricao(editRecord.motivoDescricao || "PDV Fechado");

      setStatus(editRecord.status || "Aguardando Tratativa");
      setObservacao(editRecord.observacao || "");
    } else {
      setDataOcorrido(new Date().toISOString().split("T")[0]);

      // Auto-select first driver from unit if available
      const firstDriver = availableDrivers[0];
      setMotoristaMatricula(firstDriver?.matricula || firstDriver?.id || "");
      setMotoristaNome(firstDriver?.nome || "");
      setMotoristaTelefone(firstDriver?.telefone || "");

      // Auto-select first vehicle from unit if available
      const firstVehicle = availableVehicles[0];
      setVeiculoPlaca(firstVehicle?.placa || "");
      setVeiculoModelo(firstVehicle?.modelo || "");

      setClienteCodigo("");
      setClienteNome("");
      setVendedor("");
      setSupervisor("");
      setGerente("");
      setCanal("");
      setTelefoneCliente("");
      setEndereco("");

      setNumeroNF("");
      setValorNF("");

      const defaultMotivo = motivos[0];
      setMotivoCodigo(defaultMotivo?.codigo || "Y40");
      setMotivoDescricao(defaultMotivo?.descricao || "PDV Fechado");

      setStatus("Aguardando Tratativa");
      setObservacao("");
    }
    setErrorMsg("");
  }, [isOpen, editRecord]);

  // Handle Driver change
  const handleDriverChange = (matricula: string) => {
    setMotoristaMatricula(matricula);
    const drv = availableDrivers.find(m => String(m.matricula) === String(matricula) || String(m.id) === String(matricula) || String(m.cpf) === String(matricula))
      || allCombinedDrivers.find(m => String(m.matricula) === String(matricula) || String(m.id) === String(matricula) || String(m.cpf) === String(matricula));
    if (drv) {
      setMotoristaNome(drv.nome);
      setMotoristaTelefone(drv.telefone || "");
    } else {
      setMotoristaNome("");
      setMotoristaTelefone("");
    }
  };

  // Handle Vehicle change
  const handleVehicleChange = (placa: string) => {
    setVeiculoPlaca(placa);
    const v = availableVehicles.find(item => item.placa === placa || item.id === placa);
    if (v) {
      setVeiculoModelo(v.modelo || "");
    } else {
      setVeiculoModelo("");
    }
  };

  // Handle Motivo change
  const handleMotivoChange = (code: string) => {
    setMotivoCodigo(code);
    const mot = motivos.find(m => String(m.codigo) === String(code) || String(m.id) === String(code));
    if (mot) {
      setMotivoDescricao(mot.descricao);
    }
  };

  // Automatic "resolvido" flag
  const resolvidoAuto = status === "Resolvida" ? "SIM" : "NÃO";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motoristaMatricula) {
      setErrorMsg("Selecione um motorista da unidade.");
      return;
    }
    if (!clienteCodigo.trim()) {
      setErrorMsg("Informe o código do cliente.");
      return;
    }
    if (!clienteNome.trim()) {
      setErrorMsg("Informe o nome do cliente.");
      return;
    }
    if (!numeroNF.trim()) {
      setErrorMsg("O número da Nota Fiscal é obrigatório.");
      return;
    }
    if (!valorNF || isNaN(parseFloat(valorNF))) {
      setErrorMsg("Informe um valor de NF válido.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        id: editRecord?.id,
        dataOcorrido,
        data: dataOcorrido,
        filial: effectiveUnitId,
        unidadeId: effectiveUnitId,
        unidadeNome: unitDisplayName,

        motoristaMatricula,
        motoristaNome,
        motoristaTelefone,

        veiculoPlaca,
        veiculo: veiculoPlaca,
        veiculoModelo,

        clienteCodigo: clienteCodigo.trim(),
        clienteNome: clienteNome.trim(),
        clienteRazaoSocial: clienteNome.trim(),
        clienteNomeFantasia: clienteNome.trim(),

        vendedor: vendedor.trim(),
        supervisor: supervisor.trim(),
        gerente: gerente.trim(),
        canal: canal.trim(),
        telefoneCliente: telefoneCliente.trim(),
        telefone: telefoneCliente.trim(),
        endereco: endereco.trim(),

        numeroNF: numeroNF.trim(),
        valorNF: parseFloat(valorNF),

        motivoCodigo,
        motivoDescricao,

        status,
        resolvido: resolvidoAuto,
        observacao: observacao.trim(),

        origem: "manual",
        usuarioCadastro: isEditing ? (editRecord?.usuarioCadastro || currentUser?.nome) : currentUser?.nome,
        dataCadastro: isEditing ? (editRecord?.dataCadastro || new Date().toISOString()) : new Date().toISOString(),
        ultimaAtualizacao: new Date().toISOString()
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar registro de devolução.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
                {isEditing ? `Editar Devolução #${editRecord?.protocolo || editRecord?.id}` : "Registrar Devolução"}
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-sans">
                  Operação Heineken
                </span>
              </h2>
              <p className="text-xs text-slate-400">Preenchimento operacional direto. Seleção de frota/motorista por unidade.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs font-mono text-slate-200">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Section 1: Filial e Data */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              1. Identificação de Origem e Data
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filial Operacional (Card Somente Leitura) */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Filial Operacional
                </label>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-slate-100 font-bold font-mono text-xs block">
                        {unitDisplayName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans block">
                        Unidade do Usuário Logado
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono border border-slate-700">
                    Somente Leitura
                  </span>
                </div>
              </div>

              {/* Data */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Data da Ocorrência *
                </label>
                <input 
                  type="date"
                  value={dataOcorrido}
                  onChange={(e) => setDataOcorrido(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Motorista e Veículo */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              2. Equipe Operacional e Transporte (Bases da Unidade)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Motorista SELECT */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" /> Motorista *
                </label>
                <select
                  value={motoristaMatricula}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-medium focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">Selecione o Motorista...</option>
                  {availableDrivers.map(m => (
                    <option key={m.id || m.matricula} value={m.matricula || m.id}>
                      {m.nome} {(m.matricula || m.id) ? `(Matrícula: ${m.matricula || m.id})` : ""}
                    </option>
                  ))}
                  {motoristaMatricula && !availableDrivers.some(m => (m.matricula || m.id) === motoristaMatricula) && (
                    <option value={motoristaMatricula}>
                      {motoristaNome || "Motorista Selecionado"} ({motoristaMatricula})
                    </option>
                  )}
                </select>
              </div>

              {/* Veículo SELECT */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" /> Veículo (Placa) *
                </label>
                <select
                  value={veiculoPlaca}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">Selecione o Veículo...</option>
                  {availableVehicles.map(v => (
                    <option key={v.id || v.placa} value={v.placa}>
                      {v.placa} {v.modelo ? `- ${v.modelo}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Dados do Cliente e Estrutura Comercial (Manual) */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              3. Dados do Cliente e Hierarquia Comercial (Digitação Manual)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Código Cliente */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Código Cliente *</label>
                <input 
                  type="text"
                  placeholder="Ex: 10452"
                  value={clienteCodigo}
                  onChange={(e) => setClienteCodigo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Nome Cliente */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-slate-400 font-semibold">Nome do Cliente / Razão Social *</label>
                <input 
                  type="text"
                  placeholder="Ex: Bar e Restaurante Heineken Center"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Vendedor */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Vendedor</label>
                <input 
                  type="text"
                  placeholder="Nome do Vendedor"
                  value={vendedor}
                  onChange={(e) => setVendedor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Supervisor */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Supervisor</label>
                <input 
                  type="text"
                  placeholder="Nome do Supervisor"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Gerente */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Gerente</label>
                <input 
                  type="text"
                  placeholder="Nome do Gerente"
                  value={gerente}
                  onChange={(e) => setGerente(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Canal */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Canal</label>
                <input 
                  type="text"
                  placeholder="Ex: Rotas, AS, Chave..."
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Telefone (Opcional)</label>
                <input 
                  type="text"
                  placeholder="(62) 99999-9999"
                  value={telefoneCliente}
                  onChange={(e) => setTelefoneCliente(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Endereço */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Endereço (Opcional)</label>
                <input 
                  type="text"
                  placeholder="Rua, Número, Bairro, Cidade"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Dados da Nota Fiscal e Motivo */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              4. Nota Fiscal e Motivo da Devolução
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Número NF */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Número da NF *</label>
                <input 
                  type="text"
                  placeholder="Ex: 014523"
                  value={numeroNF}
                  onChange={(e) => setNumeroNF(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Valor NF */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Valor Total (R$) *
                </label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={valorNF}
                  onChange={(e) => setValorNF(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Motivo */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Motivo da Devolução *</label>
                <select
                  value={motivoCodigo}
                  onChange={(e) => handleMotivoChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {motivos.length > 0 ? (
                    motivos.map(m => (
                      <option key={m.id || m.codigo} value={m.codigo}>
                        {m.codigo} - {m.descricao}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Y40">Y40 - PDV Fechado</option>
                      <option value="Y35">Y35 - Pedido Recusado pelo Cliente</option>
                      <option value="Y80">Y80 - Avaria no Transporte</option>
                      <option value="Y21">Y21 - Divergência de Preço</option>
                      <option value="Y99">Y99 - Outros Motivos</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Status e Observações */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              5. Status do Processo e Observação
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Status */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Status do Processo</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Aguardando Tratativa">Aguardando Tratativa</option>
                  <option value="Em Análise">Em Análise</option>
                  <option value="Em Atendimento">Em Atendimento</option>
                  <option value="Aguardando Comercial">Aguardando Comercial</option>
                  <option value="Resolvida">Resolvida</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>

              {/* Status Resolvido */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Campo Resolvido</label>
                <div className={`p-2.5 rounded-lg border font-bold flex items-center justify-between ${
                  resolvidoAuto === "SIM" 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                }`}>
                  <span>Resolvido: {resolvidoAuto}</span>
                  <span className="text-[10px] font-normal opacity-75">
                    {resolvidoAuto === "SIM" ? "Marcado como Resolvida" : "Em Tratativa Operacional"}
                  </span>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Observações e Histórico de Atendimento</label>
              <textarea
                rows={3}
                placeholder="Insira detalhes da ocorrência, observações da equipe ou instruções de acerto..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Salvando..." : isEditing ? "Salvar Alterações" : "Confirmar Registro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
