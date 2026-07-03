import React, { useState, useEffect } from "react";
import { ShieldCheck, Search, Check, Save, User, Settings2, ShieldAlert } from "lucide-react";
import { Unidade, Usuario } from "../types";
import { NotificationModal, NotificationType } from "./NotificationModal";

interface MasterPermissoesProps {
  unidades: Unidade[];
  userEmail: string;
}

interface ModuleDef {
  key: string;
  name: string;
  desc: string;
}

const MODULES: ModuleDef[] = [
  { key: "dashboard", name: "📋 Painel Executivo / Dashboard", desc: "Acesso às telemetrias de conformidade e consolidados." },
  { key: "veiculos", name: "🚛 Frotas / Veículos", desc: "Controle de chassis, modelos, rastreadores e documentações." },
  { key: "motoristas", name: "👥 Cadastro Condutores", desc: "Listagem de condutores habilitados, exames e logs de vencimento." },
  { key: "disponibilidade", name: "📅 Agenda Disponibilidade", desc: "Quadro de escalas preventivas e saídas programadas." },
  { key: "monitoramento", name: "🔎 Vistoria & DTs", desc: "Inspeções obrigatórias de segurança no escoamento de cargas." },
  { key: "descargas", name: "💸 Taxas Descarga / Chapa", desc: "Lançamento de custos operantes e chapas auxiliares." },
  { key: "epi", name: "📦 Estoque de EPIs", desc: "Movimentação de botas, cones de sinalização e óculos de proteção." },
  { key: "alertas", name: "⚠️ Central de Conformidades", desc: "Alertas automáticos de documentos e exames vencidos." }
];

export default function MasterPermissoesView({ unidades, userEmail }: MasterPermissoesProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Permissoes checklist state
  // Format: { [moduleKey]: { view: boolean, create: boolean, edit: boolean, delete: boolean, export: boolean } }
  const [permissionsState, setPermissionsState] = useState<{
    [moduleKey: string]: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      export: boolean;
    };
  }>({});

  const [notification, setNotification] = useState<NotificationType | null>(null);

  const fetchUsuarios = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Initialize permissions state when user is selected
  useEffect(() => {
    if (!selectedUser) return;

    const initialPermissions: typeof permissionsState = {};
    const existingPerms = selectedUser.permissions || {};

    MODULES.forEach(mod => {
      initialPermissions[mod.key] = {
        view: existingPerms[mod.key]?.view !== false, // default true
        create: existingPerms[mod.key]?.create !== false, // default true
        edit: existingPerms[mod.key]?.edit !== false, // default true
        delete: existingPerms[mod.key]?.delete !== false, // default true
        export: existingPerms[mod.key]?.export !== false // default true
      };
    });

    setPermissionsState(initialPermissions);
  }, [selectedUser]);

  const handleToggle = (moduleKey: string, action: "view" | "create" | "edit" | "delete" | "export") => {
    setPermissionsState(prev => {
      const modObj = prev[moduleKey] || { view: true, create: true, edit: true, delete: true, export: true };
      return {
        ...prev,
        [moduleKey]: {
          ...modObj,
          [action]: !modObj[action]
        }
      };
    });
  };

  const handleToggleAll = (action: "view" | "create" | "edit" | "delete" | "export", value: boolean) => {
    setPermissionsState(prev => {
      const next = { ...prev };
      MODULES.forEach(mod => {
        next[mod.key] = {
          ...next[mod.key],
          [action]: value
        };
      });
      return next;
    });
  };

  const savePermissions = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/usuarios/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({
          ...selectedUser,
          permissions: permissionsState
        })
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: `✅ Permissões de acesso de "${selectedUser.nome}" atualizadas com sucesso!`
        });
        fetchUsuarios();
      } else {
        const errData = await res.json();
        setNotification({
          type: "error",
          message: `🚫 Falha ao salvar as permissões: ${errData.error || "Operação rejeitada"}`
        });
      }
    } catch (e) {
      setNotification({
        type: "error",
        message: "❌ Erro ao tentar se conectar com a API."
      });
    }
  };

  const filtered = usuarios.filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: USERS LIST */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-fit space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <User className="w-4 h-4 text-sky-400" />
              Selecionar Colaborador
            </h3>
            <p className="text-[10px] text-slate-450 mt-1 font-mono">
              Selecione o operador do sistema para configurar os privilégios granulares de leitura, escrita e exportação.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-slate-750"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-800/60 border border-slate-850 rounded bg-slate-950/40">
            {filtered.map(u => {
              const isSel = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left p-2.5 transition flex flex-col ${
                    isSel 
                      ? "bg-sky-500/10 border-l-4 border-l-sky-500 text-white" 
                      : "hover:bg-slate-850 text-slate-400"
                  }`}
                >
                  <span className={`text-xs font-semibold ${isSel ? "text-sky-400" : "text-white"}`}>{u.nome}</span>
                  <span className="text-[9px] font-mono text-slate-500 mt-0.5 uppercase tracking-wide">
                    {u.tipo_usuario || "OPERADOR"} — {u.email}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-slate-600 font-mono text-[10px]">
                Nenhum usuário localizado.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PERMISSIONS MATRIX GRID */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedUser ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 font-mono flex flex-col items-center justify-center space-y-3">
              <ShieldAlert className="w-8 h-8 text-slate-600 animate-pulse" />
              <span>Por favor, selecione um colaborador na coluna esquerda para parametrizar suas regras de acesso corporativo.</span>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-sky-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Matriz de Controle de Permissões: <span className="text-sky-400">{selectedUser.nome}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                      Privilégios Corporativos do Nível: <span className="text-amber-500 font-bold">{selectedUser.tipo_usuario || "OPERADOR"}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={savePermissions}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold font-mono text-[10px] flex items-center gap-1 cursor-pointer transition-all uppercase shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Regras
                </button>
              </div>

              {/* Quick helper controls */}
              <div className="bg-slate-950 p-3 rounded border border-slate-850 flex flex-wrap items-center gap-3 justify-between font-mono text-[9px] text-slate-450 uppercase">
                <span className="font-bold text-slate-350">Controle Automático rápido:</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleToggleAll("view", true)} className="hover:text-white underline">Ativar Visualizar</button>
                  <button onClick={() => handleToggleAll("create", true)} className="hover:text-white underline font-medium">Ativar Criar</button>
                  <button onClick={() => handleToggleAll("edit", true)} className="hover:text-white underline">Ativar Editar</button>
                  <button onClick={() => handleToggleAll("delete", true)} className="hover:text-white underline">Ativar Excluir</button>
                  <button onClick={() => handleToggleAll("export", true)} className="hover:text-white underline font-semibold">Ativar Exportar</button>
                  <span className="text-slate-800">|</span>
                  <button onClick={() => {
                    MODULES.forEach(mod => {
                      setPermissionsState(prev => ({
                        ...prev,
                        [mod.key]: { view: false, create: false, edit: false, delete: false, export: false }
                      }));
                    });
                  }} className="text-rose-400 hover:text-rose-350 underline">Zerar Todas</button>
                </div>
              </div>

              {/* THE PERMISSIONS TABLE MATRIX */}
              <div className="border border-slate-850 rounded-lg overflow-hidden bg-slate-950/30">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-850 text-slate-450 font-mono text-[9.5px] uppercase font-bold select-none">
                      <th className="p-3">Módulo / Permissão</th>
                      <th className="p-3 text-center">Visualizar</th>
                      <th className="p-3 text-center">Criar</th>
                      <th className="p-3 text-center">Editar</th>
                      <th className="p-3 text-center text-rose-450">Excluir</th>
                      <th className="p-3 text-center">Exportar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60">
                    {MODULES.map(m => {
                      const permissions = permissionsState[m.key] || { view: true, create: true, edit: true, delete: true, export: true };
                      return (
                        <tr key={m.key} className="hover:bg-slate-850/15">
                          <td className="p-3">
                            <span className="text-white font-medium block">{m.name}</span>
                            <span className="text-[9.5px] text-slate-500 block mt-0.5">{m.desc}</span>
                          </td>

                          {/* Checkboxes matrix cells */}
                          {(["view", "create", "edit", "delete", "export"] as const).map(action => (
                            <td key={action} className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggle(m.key, action)}
                                className={`mx-auto w-5 h-5 rounded border flex items-center justify-center transition cursor-pointer select-none ${
                                  permissions[action]
                                    ? action === "delete"
                                      ? "bg-rose-500/10 border-rose-500/35 text-rose-400"
                                      : "bg-sky-500/10 border-sky-500/35 text-sky-400"
                                    : "border-slate-800 bg-transparent text-transparent hover:border-slate-750"
                                }`}
                              >
                                {permissions[action] && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-950 rounded border border-slate-850 text-[10px] text-slate-500 leading-relaxed font-mono">
                💡 <b>REVISÃO DE SEGURANÇA OPERACIONAL:</b> As permissões parametrizadas acima controlam tanto a exibição dos respectivos botões de ação e abas na interface do usuário (Client-side) quanto a validação transacional e de segurança conduzida em todas as requisições enviadas ao servidor (Backend-side).
              </div>
            </div>
          )}
        </div>

      </div>

      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
    </div>
  );
}
