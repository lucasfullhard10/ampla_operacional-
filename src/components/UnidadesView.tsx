import React, { useState, useEffect } from "react";
import { Plus, Trash, Globe, Shield, MapPin, Search, User, Mail, Phone, Lock, Edit, Check, Settings, ShieldCheck } from "lucide-react";
import { Unidade, Usuario } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";

interface UnidadesProps {
  unidades: Unidade[];
  onRefresh: () => void;
  userRole: string;
  userEmail: string;
}

export default function UnidadesView({ unidades, onRefresh, userRole, userEmail }: UnidadesProps) {
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("GO");
  const [supervisor, setSupervisor] = useState("");
  const [usuarioResponsavel, setUsuarioResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Custom notification & confirmation
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);

  // Administrative / Sub-tabs for unit management & permissions
  const [activeSubtab, setActiveSubtab] = useState<"unidades" | "permissoes">("unidades");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<Usuario | null>(null);
  const [permCheckboxes, setPermCheckboxes] = useState<{ [unidadeId: string]: boolean }>({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  // User form states
  const [uEmail, setUEmail] = useState("");
  const [uNome, setUNome] = useState("");
  const [uPerfil, setUPerfil] = useState<"admin_unidade" | "operador">("operador");
  const [uUnidadeId, setUUnidadeId] = useState("");
  const [uSenha, setUSenha] = useState("");
  const [uCreating, setUCreating] = useState(false);

  const isMaster = userRole === "admin_master";

  // Load backend users list
  const fetchUsuarios = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/usuarios", {
        headers: { "x-user-email": userEmail }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (err) {
      console.error("Erro ao listar usuários:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isMaster && activeSubtab === "permissoes") {
      fetchUsuarios();
    }
  }, [activeSubtab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cidade.trim() || !estado.trim() || !supervisor.trim() || !usuarioResponsavel.trim()) {
      setNotification({
        type: "error",
        message: "Não foi possível cadastrar a unidade. Motivo: Nome, Cidade, Estado, Supervisor e Usuário Responsável são obrigatórios."
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/unidades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify({
          nome: nome.trim(),
          cidade: cityComplement(cidade),
          estado,
          supervisor: supervisor.trim(),
          usuarioResponsavel: usuarioResponsavel.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNome("");
        setCidade("");
        setSupervisor("");
        setUsuarioResponsavel("");
        setEmail("");
        setTelefone("");
        
        let successMessage = "✅ Registro salvo com sucesso.";
        if (data.generatedUser) {
          successMessage += `\n\nUsuário de Unidade gerado: \nLogin: ${data.generatedUser.email} | Senha temporária: ${data.generatedUser.senha}`;
        }

        setNotification({
          type: "success",
          message: successMessage
        });

        onRefresh();
      } else {
        const data = await res.json();
        setNotification({
          type: "error",
          message: `❌ Não foi possível cadastrar a unidade. Motivo: ${data.error || "Operação rejeitada pelo servidor."}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "❌ Não foi possível cadastrar a unidade. Motivo: Conexão indisponível."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const cityComplement = (text: string) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const handleDelete = (id: string) => {
    const confirmMessage = "ATENÇÃO: Esta ação poderá impactar veículos, motoristas, entregas e históricos vinculados à unidade. Deseja continuar?";
    
    setConfirmDialog({
      message: confirmMessage,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/unidades/${id}`, {
            method: "DELETE",
            headers: {
              "x-user-email": userEmail,
            },
          });

          if (res.ok) {
            setNotification({
              type: "success",
              message: "✅ Registro excluído com sucesso."
            });
            onRefresh();
          } else {
            const err = await res.json();
            setNotification({
              type: "error",
              message: `❌ Não foi possível excluir a unidade. Motivo: ${err.error || "Apenas Administradores MASTER podem excluir unidades."}`
            });
          }
        } catch (e) {
          setNotification({
            type: "error",
            message: "❌ Não foi possível excluir. Motivo: Erro operacional de conexão."
          });
        }
      }
    });
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uEmail.trim() || !uNome.trim() || !uSenha.trim() || !uUnidadeId) {
      setNotification({
        type: "error",
        message: "❌ E-mail, Nome, Senha e Unidade Sede são obrigatórios para registrar o usuário."
      });
      return;
    }

    setUCreating(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({
          email: uEmail.trim(),
          nome: uNome.trim(),
          perfil: uPerfil,
          unidadeId: uUnidadeId,
          status: "ativo",
          senha: uSenha.trim(),
          unidadesPermitidas: []
        })
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: `✅ Usuário "${uNome}" criado com sucesso! Sua senha de acesso padrão é: ${uSenha}`
        });
        setUEmail("");
        setUNome("");
        setUSenha("");
        setUUnidadeId("");
        fetchUsuarios();
      } else {
        const data = await res.json();
        setNotification({
          type: "error",
          message: `❌ Erro ao cadastrar usuário: ${data.error || "Rejeitado."}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "❌ Conexão indisponível com a API de usuários."
      });
    } finally {
      setUCreating(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = (u: Usuario) => {
    setConfirmDialog({
      message: `Tem certeza que deseja remover permanentemente o acesso do usuário "${u.nome}" (${u.email})?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/usuarios/${u.id}`, {
            method: "DELETE",
            headers: { "x-user-email": userEmail }
          });
          if (res.ok) {
            setNotification({
              type: "success",
              message: "✅ Usuário excluído com sucesso."
            });
            fetchUsuarios();
          } else {
            const data = await res.json();
            setNotification({
              type: "error",
              message: `❌ Erro ao excluir usuário: ${data.error || "Operação rejeitada."}`
            });
          }
        } catch (err) {
          setNotification({
            type: "error",
            message: "❌ Falha ao tentar desvincular usuário."
          });
        }
      }
    });
  };

  // Save modified user permissions/details
  const handleSaveUserPermissions = async () => {
    if (!selectedUserForEdit) return;
    const allowedUnitIds = Object.keys(permCheckboxes).filter(id => permCheckboxes[id]);

    try {
      const res = await fetch(`/api/usuarios/${selectedUserForEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({
          nome: selectedUserForEdit.nome,
          perfil: selectedUserForEdit.perfil,
          unidadeId: selectedUserForEdit.unidadeId,
          status: selectedUserForEdit.status,
          unidadesPermitidas: allowedUnitIds
        })
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: `✅ Permissões e dados do usuário "${selectedUserForEdit.nome}" salvos com sucesso!`
        });
        setSelectedUserForEdit(null);
        fetchUsuarios();
      } else {
        const data = await res.json();
        setNotification({
          type: "error",
          message: `❌ Não foi possível salvar permissões: ${data.error || "Rejeitado."}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "❌ Falha operacional ao tentar salvar as permissões."
      });
    }
  };

  const startEditUserPermissions = (u: Usuario) => {
    setSelectedUserForEdit(u);
    const checks: { [id: string]: boolean } = {};
    unidades.forEach(unit => {
      checks[unit.id] = u.unidadesPermitidas?.includes(unit.id) || false;
    });
    setPermCheckboxes(checks);
  };

  const filtered = unidades.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.cidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Subtab Navigation Selector */}
      <div className="flex border-b border-slate-800/80 gap-1 font-mono text-[11px] select-none">
        <button
          onClick={() => setActiveSubtab("unidades")}
          className={`px-4 py-2 hover:text-slate-200 transition font-bold border-b-2 uppercase tracking-tight focus:outline-none ${
            activeSubtab === "unidades"
              ? "border-sky-500 text-sky-400 font-bold"
              : "border-transparent text-slate-500"
          }`}
        >
          ⚙️ Cadastro de Filiais
        </button>
        {isMaster && (
          <button
            onClick={() => setActiveSubtab("permissoes")}
            className={`px-4 py-2 hover:text-slate-200 transition font-bold border-b-2 uppercase tracking-tight focus:outline-none ${
              activeSubtab === "permissoes"
                ? "border-sky-500 text-sky-400 font-bold"
                : "border-transparent text-slate-500"
            }`}
          >
            🔒 Gerenciar Acesso às Unidades
          </button>
        )}
      </div>

      {activeSubtab === "unidades" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Unit registration form */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 h-fit space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-sky-400" />
                Cadastrar Unidade
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Insira os dados cadastrais da nova filial e configure credenciais de supervisão.
              </p>
            </div>

            {!isMaster ? (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[11px] text-rose-400 font-mono">
                ⚠️ Bloqueado: Apenas Administradores Master têm privilégios para gerenciar ou excluir unidades.
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-3 font-sans text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono font-medium">Nome da Unidade *</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Minas Gerais"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 block font-mono font-medium">Cidade Sede *</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Ex: Belo Horizonte"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block font-mono font-medium">Estado (UF) *</label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    >
                      {["GO", "DF", "MG", "SP", "RJ", "BA", "PE", "CE", "MA", "PA", "TO", "MT", "MS", "PR", "SC", "RS", "ES"].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 my-2 pt-2">
                  <span className="text-[10px] uppercase tracking-wider text-sky-400 font-mono font-semibold block mb-2">
                    Dados de Supervisão e Login
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono font-medium">Nome do Supervisor *</label>
                  <input
                    type="text"
                    value={supervisor}
                    onChange={(e) => setSupervisor(e.target.value)}
                    placeholder="Ex: Gabriela"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono font-medium">Usuário Responsável * (Login)</label>
                  <input
                    type="text"
                    value={usuarioResponsavel}
                    onChange={(e) => setUsuarioResponsavel(e.target.value)}
                    placeholder="Ex: gabriela.mg"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    required
                  />
                  <span className="text-[9px] text-slate-500 block">
                    Será configurada a senha provisória padrão <b>"[Nome]@2026"</b> obrigatória para alteração no primeiro login.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 block font-mono font-medium">E-mail de Contato</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="gabriela@site.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block font-mono font-medium">Telefone</label>
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(31) 98888-7777"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 rounded transition flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {submitting ? "Cadastrando..." : "Adicionar Unidade"}
                </button>
              </form>
            )}
          </div>

          {/* Right Panel: Grid listing units */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquise por nome ou cidade operante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-slate-700 font-sans"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                {filtered.length} unidade(s) encontrada(s)
              </span>
            </div>

            {/* Big Cards list of Units */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-slate-950 text-sky-400 rounded-lg border border-slate-800 shadow">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-semibold tracking-tight">{u.nome}</h4>
                        <p className="text-slate-400 font-mono text-[10px] mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {u.cidade} - {u.estado}
                        </p>
                      </div>
                    </div>

                    {isMaster && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 bg-slate-950 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition border border-slate-800 cursor-pointer"
                        title="Excluir unidade"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Advanced Supervisor Metadata block */}
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 text-[11px] font-sans space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-sky-400" />
                        <b>Supervisor:</b>
                      </span>
                      <span className="text-white font-medium">{u.supervisor || "Rodrigo Silva"}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-sky-400" />
                        <b>Login Responsável:</b>
                      </span>
                      <span className="text-white font-mono">{u.usuarioResponsavel || "admin.master"}</span>
                    </div>

                    {(u.email || u.telefone) && (
                      <div className="border-t border-slate-800/60 pt-1.5 mt-1.5 flex flex-col space-y-1 text-slate-500 text-[10px]">
                        {u.email && (
                          <span className="flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {u.email}
                          </span>
                        )}
                        {u.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {u.telefone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs bg-slate-900 border border-slate-800 rounded-xl">
                  Nenhuma unidade operacional localizada que coincida com a pesquisa.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* MASTER SECURITY TAB: GERENCIAR ACESSO ÀS UNIDADES */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creation form column (Defines User creation, user profiles and base assignments) */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 h-fit space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-sky-400" />
                Criar Novo Usuário
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Cadastre e transfira supervisores e operadores de filiais, definindo perfis com isolamento nativo.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 font-sans text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono font-medium">Nome Completo *</label>
                <input
                  type="text"
                  value={uNome}
                  onChange={(e) => setUNome(e.target.value)}
                  placeholder="Ex: Gabriela Miranda Silva"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono font-medium">E-mail (Login) *</label>
                <input
                  type="email"
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  placeholder="gabriela.miranda@tms-log.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono font-medium">Nível de Perfil *</label>
                <select
                  value={uPerfil}
                  onChange={(e) => setUPerfil(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                >
                  <option value="operador">Operador (Uso Comum)</option>
                  <option value="admin_unidade">Supervisor (Acesso da Filial)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono font-medium">Unidade Sede Principal *</label>
                <select
                  value={uUnidadeId}
                  onChange={(e) => setUUnidadeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                  required
                >
                  <option value="">Selecione a sede principal...</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.estado})</option>
                  ))}
                </select>
                <span className="text-[9px] text-slate-500 block">
                  Define o destino padrão e o painel correspondente do usuário.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono font-medium">Senha Provisória *</label>
                <input
                  type="password"
                  value={uSenha}
                  onChange={(e) => setUSenha(e.target.value)}
                  placeholder="Mínimo de 4 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={uCreating}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 rounded transition flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {uCreating ? "Gravando..." : "Gravar Novo Usuário"}
              </button>
            </form>
          </div>

          {/* Right Panel Layout: Search Users & User Table & Checkboxes Switcher card */}
          <div className="lg:col-span-2 space-y-4">
            {/* User Search */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquise usuários pelo nome ou login..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-slate-700 font-sans"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                {usuarios.length - 1} usuário(s) operacional(is)
              </span>
            </div>

            {/* Checklist of Users in the system */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono font-semibold uppercase text-[10px] border-b border-slate-800/80">
                      <th className="p-3">Nome / Login</th>
                      <th className="p-3">Perfil</th>
                      <th className="p-3">Unidade Sede</th>
                      <th className="p-3">Outros Acessos</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {usuarios
                      .filter(u => u.email !== userEmail && (u.nome.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(userSearchTerm.toLowerCase())))
                      .map(u => {
                        const userBase = unidades.find(un => un.id === u.unidadeId);
                        const otherAccesses = u.unidadesPermitidas || [];
                        return (
                          <tr key={u.id} className="hover:bg-slate-800/10">
                            <td className="p-3 max-w-[180px] truncate">
                              <span className="text-white font-medium block truncate">{u.nome}</span>
                              <span className="text-[9px] text-slate-500 font-mono block truncate">{u.email}</span>
                            </td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase leading-none ${
                                u.perfil === "admin_unidade" ? "bg-amber-500/10 text-amber-500" : "bg-sky-500/10 text-sky-400"
                              }`}>
                                {u.perfil === "admin_unidade" ? "Supervisor" : "Operador"}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-slate-300 font-bold">
                                {u.unidadeId === "Todas" ? "Todas" : (userBase?.nome || u.unidadeId)}
                              </span>
                            </td>
                            <td className="p-3">
                              {otherAccesses.length === 0 ? (
                                <span className="text-slate-600 italic">Nenhum</span>
                              ) : (
                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                  {otherAccesses.map(opId => {
                                    const opName = unidades.find(un => un.id === opId)?.nome || opId;
                                    return (
                                      <span key={opId} className="px-1 py-0.5 bg-slate-950 text-slate-400 border border-slate-800/65 rounded font-bold text-[8px] uppercase">
                                        {opName}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => startEditUserPermissions(u)}
                                className="p-1 px-2 bg-slate-950 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded border border-slate-800 font-bold text-[10px] font-mono cursor-pointer"
                              >
                                VÍNCULOS
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1 bg-slate-950 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded border border-slate-800 cursor-pointer"
                                title="Desvincular usuário"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    }
                    {loadingUsers && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-mono text-xs">
                          Carregando cadastro de usuários...
                        </td>
                      </tr>
                    )}
                    {usuarios.filter(u => u.email !== userEmail).length === 0 && !loadingUsers && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-mono text-xs">
                          Nenhum usuário cadastrado localizado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODAL / BOTTOM EDITING WORKSPACE PANEL FOR VINCULOS */}
            {selectedUserForEdit && (
              <div className="bg-slate-900 p-5 rounded-xl border border-sky-500/40 shadow-xl space-y-4 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-sky-400" />
                    <div>
                      <h4 className="text-white text-sm font-bold">Definir Permissões de Unidade</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Usuário: {selectedUserForEdit.nome} ({selectedUserForEdit.email})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUserForEdit(null)}
                    className="text-slate-500 hover:text-slate-300 font-bold"
                  >
                    FECHAR ✕
                  </button>
                </div>

                {/* Transfer User primary Base or manage user properties */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono text-[10px] uppercase font-bold">Transferir Sede Principal:</label>
                    <select
                      value={selectedUserForEdit.unidadeId}
                      onChange={(e) => setSelectedUserForEdit({ ...selectedUserForEdit, unidadeId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    >
                      {unidades.map(un => (
                        <option key={un.id} value={un.id}>{un.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono text-[10px] uppercase font-bold">Nível / Perfil:</label>
                    <select
                      value={selectedUserForEdit.perfil}
                      onChange={(e) => setSelectedUserForEdit({ ...selectedUserForEdit, perfil: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    >
                      <option value="operador">Operador (Uso Comum)</option>
                      <option value="admin_unidade">Supervisor (Acesso da Filial)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono text-[10px] uppercase font-bold">Status do Login:</label>
                    <select
                      value={selectedUserForEdit.status}
                      onChange={(e) => setSelectedUserForEdit({ ...selectedUserForEdit, status: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="suspenso">Suspenso</option>
                    </select>
                  </div>
                </div>

                {/* Checkboxes representing allowed additional units */}
                <div className="space-y-2">
                  <span className="text-slate-300 font-mono font-bold block text-[10px] uppercase tracking-wider">
                    Unidades Autorizadas para Alternância de Acesso (UsuarioUnidadePermissao):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800/60">
                    {unidades.map(unit => {
                      const isPrimarySede = selectedUserForEdit.unidadeId === unit.id;
                      return (
                        <label
                          key={unit.id}
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer select-none transition ${
                            isPrimarySede
                              ? "bg-sky-500/5 border-sky-500/20 text-slate-500"
                              : permCheckboxes[unit.id]
                              ? "bg-slate-900 border-sky-500/40 text-sky-400"
                              : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700 text-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isPrimarySede || permCheckboxes[unit.id] || false}
                            disabled={isPrimarySede}
                            onChange={(e) => {
                              setPermCheckboxes({
                                ...permCheckboxes,
                                [unit.id]: e.target.checked
                              });
                            }}
                            className="hidden"
                          />
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            isPrimarySede
                              ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                              : permCheckboxes[unit.id]
                              ? "bg-sky-500/20 border-sky-400 text-sky-400"
                              : "border-slate-500 bg-transparent text-transparent"
                          }`}>
                            {(isPrimarySede || permCheckboxes[unit.id]) && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="truncate text-xs font-medium font-sans">
                            {unit.nome} {isPrimarySede && <span className="text-[9px] text-slate-500 font-mono flex font-normal">(SEDE)</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <span className="text-[9px] text-slate-500 block">
                    * Os checkboxes marcados acima representam as filiais operacionais extras que o usuário selecionado poderá alternar livremente no topo do sistema.
                  </span>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setSelectedUserForEdit(null)}
                    className="p-1 px-3 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 rounded font-bold font-mono transition inline-flex"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={handleSaveUserPermissions}
                    className="p-1 px-4 bg-sky-600 hover:bg-sky-500 text-white border border-transparent rounded font-bold font-mono transition inline-flex"
                  >
                    SALVAR ALTERAÇÕES
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popups & Dialogs modals */}
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
