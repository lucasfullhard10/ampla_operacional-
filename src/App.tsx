import React, { useState, useEffect } from "react";
import { 
  Building, Truck, Users, Calendar, Layers, Navigation, DollarSign, Hammer, 
  Archive, AlertTriangle, Shield, LogOut, LayoutDashboard, Menu, X, Bell, ShieldAlert,
  User, CheckCircle, HelpCircle, Key, ChevronLeft, ChevronRight, ClipboardList
} from "lucide-react";

import { Unidade, Motorista, Veiculo, Rota, EntregaOff, Descarga, Manutencao, EstoqueEpi, MovimentacaoEpi, Alerta, Auditoria, Usuario } from "./types";

// Component imports
import DashboardView from "./components/DashboardView";
import UnidadesView from "./components/UnidadesView";
import VeiculosView from "./components/VeiculosView";
import MotoristasView from "./components/MotoristasView";
import DisponibilidadeView from "./components/DisponibilidadeView";
import MonitoramentoView from "./components/MonitoramentoView";
import FechamentoDtView from "./components/FechamentoDtView";
import NoShowView from "./components/NoShowView";
import EntregasOffView from "./components/EntregasOffView";
import DescargasView from "./components/DescargasView";
import ManutencaoView from "./components/ManutencaoView";
import EpiView from "./components/EpiView";
import AlertasView from "./components/AlertasView";
import AuditoriaView from "./components/AuditoriaView";
import MasterUsuariosView from "./components/MasterUsuariosView";
import MasterPermissoesView from "./components/MasterPermissoesView";
import MasterUnidadesView from "./components/MasterUnidadesView";
import CentralProcessos from "./components/CentralProcessos";
import DatabaseSettingsModal from "./components/DatabaseSettingsModal";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary definition
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary report:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 text-center">
          <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold font-mono">Erro de Renderização React Identificado</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            Ocorreu uma exceção inesperada durante o ciclo de atualização visual da interface.
          </p>
          <div className="mt-4 p-4 bg-slate-900 border border-slate-850 rounded font-mono text-[11px] text-rose-400 text-left max-w-lg overflow-x-auto">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-5 py-2 bg-sky-600 hover:bg-sky-500 rounded text-xs font-semibold uppercase"
          >
            Reinicializar Canal
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  
  // Forced password reset state
  const [forcedResetUserEmail, setForcedResetUserEmail] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
  
  // Login form field state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);

  // Layout sidebar & tab routing state
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(false);

  // Global shared relational datasets state
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [disps, setDisps] = useState<any[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [offList, setOffList] = useState<EntregaOff[]>([]);
  const [descargasList, setDescargasList] = useState<Descarga[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [estoqueEpi, setEstoqueEpi] = useState<EstoqueEpi[]>([]);
  const [movimentacoesEpi, setMovimentacoesEpi] = useState<MovimentacaoEpi[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [auditorios, setAuditorios] = useState<Auditoria[]>([]);
  const [vales, setVales] = useState<any[]>([]);
  const [fechamentosDt, setFechamentosDt] = useState<any[]>([]);
  const [noShows, setNoShows] = useState<any[]>([]);

  // Selection states
  const [selectedUnit, setSelectedUnit] = useState<string>("Todas");

  // Database persistent cloud mode states
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ configured: boolean; connected: boolean } | null>(null);

  // Multi-unit login options state
  const [loginUnidades, setLoginUnidades] = useState<Unidade[]>([]);
  const [loginUnitId, setLoginUnitId] = useState<string>("");

  const fetchLoginUnidades = () => {
    fetch("/api/auth/unidades")
      .then(res => {
        if (!res.ok) {
          throw new Error(`Resposta HTTP inválida: ${res.status}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Resposta do servidor não é JSON.");
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setLoginUnidades(data);
          const activeOnes = data.filter(u => u.status !== "inativo");
          if (activeOnes.length > 0) {
            setLoginUnitId(prev => {
              if (prev && activeOnes.some(u => u.id === prev)) return prev;
              return activeOnes[0].id;
            });
          } else {
            setLoginUnitId("");
          }
        }
      })
      .catch(err => console.warn("Aguardando carregamento do servidor de unidades...", err.message));
  };

  useEffect(() => {
    fetchLoginUnidades();
  }, []);

  // Load all logistics data from API safely
  const loadGlobalData = async () => {
    if (!currentUser) return;
    try {
      const headers = { 
        "x-user-email": currentUser.email,
        "x-selected-unit": selectedUnit
      };

      const safeFetchJson = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) return null;
          const ct = res.headers.get("content-type");
          if (!ct || !ct.includes("application/json")) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      const dataUnidades = await safeFetchJson("/api/unidades");
      if (dataUnidades) {
        setUnidades(dataUnidades);
        // Also keep the login options synchronized dynamically
        const activeUnitsOnly = dataUnidades.filter((u: Unidade) => u.status !== "inativo");
        setLoginUnidades(dataUnidades);
        if (activeUnitsOnly.length > 0) {
          setLoginUnitId(prev => {
            if (prev && activeUnitsOnly.some((u: Unidade) => u.id === prev)) return prev;
            return activeUnitsOnly[0].id;
          });
        }
      }

      const dataMotoristas = await safeFetchJson("/api/motoristas");
      if (dataMotoristas) setMotoristas(dataMotoristas);

      const dataVeiculos = await safeFetchJson("/api/veiculos");
      if (dataVeiculos) setVeiculos(dataVeiculos);

      const dataDisps = await safeFetchJson("/api/disponibilidade");
      if (dataDisps) setDisps(dataDisps);

      const dataRotas = await safeFetchJson("/api/rotas");
      if (dataRotas) setRotas(dataRotas);

      const dataOff = await safeFetchJson("/api/entregas-off");
      if (dataOff) setOffList(dataOff);

      const dataDescargas = await safeFetchJson("/api/descargas");
      if (dataDescargas) setDescargasList(dataDescargas);

      const dataManutencao = await safeFetchJson("/api/manutencao");
      if (dataManutencao) setManutencoes(dataManutencao);

      const dataEpiEstoque = await safeFetchJson("/api/epi-estoque");
      if (dataEpiEstoque) setEstoqueEpi(dataEpiEstoque);

      const dataEpiMovs = await safeFetchJson("/api/epi-movimentacoes");
      if (dataEpiMovs) setMovimentacoesEpi(dataEpiMovs);

      const dataAlertas = await safeFetchJson("/api/alertas");
      if (dataAlertas) setAlertas(dataAlertas);

      const dataAudit = await safeFetchJson("/api/auditoria");
      if (dataAudit) setAuditorios(dataAudit);

      const dataVales = await safeFetchJson("/api/vales");
      if (dataVales) setVales(dataVales);

      const dataClosures = await safeFetchJson("/api/fechamentos_dt");
      if (dataClosures) setFechamentosDt(dataClosures);

      const dataNoShows = await safeFetchJson("/api/noshows");
      if (dataNoShows) setNoShows(dataNoShows);

      const dataStatus = await safeFetchJson("/api/database/status");
      if (dataStatus) setDbStatus(dataStatus);
    } catch (e) {
      console.warn("Fracasso temporário no sincronismo de dados em segundo plano:", e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadGlobalData();
      // Periodically refresh alerts to catch upcoming events
      const interval = setInterval(loadGlobalData, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser, selectedUnit]);

  // Synchronize sidebar and compact state on mount / login
  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email;
      const savedCollapsed = localStorage.getItem(`sidebar_collapsed_${email}`);
      const savedCompact = localStorage.getItem(`compact_mode_${email}`);

      const width = window.innerWidth;
      const isTablet = width >= 768 && width < 1024;

      if (savedCollapsed !== null) {
        setSidebarCollapsed(savedCollapsed === "true");
      } else {
        setSidebarCollapsed(isTablet);
      }

      if (savedCompact !== null) {
        setCompactMode(savedCompact === "true");
      } else {
        setCompactMode(false);
      }
    }
  }, [currentUser]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const nextVal = !prev;
      if (currentUser) {
        localStorage.setItem(`sidebar_collapsed_${currentUser.email}`, String(nextVal));
      }
      return nextVal;
    });
  };

  const toggleCompactMode = () => {
    setCompactMode(prev => {
      const nextVal = !prev;
      if (currentUser) {
        localStorage.setItem(`compact_mode_${currentUser.email}`, String(nextVal));
        if (nextVal) {
          setSidebarCollapsed(true);
          localStorage.setItem(`sidebar_collapsed_${currentUser.email}`, "true");
        }
      }
      return nextVal;
    });
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoadingSession(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.forcePasswordReset) {
          setForcedResetUserEmail(email);
          setLoginError("");
        } else {
          setCurrentUser(data.user);
          const isMaster = data.user.perfil === "admin_master" || data.user.tipo_usuario === "MASTER";
          const startUnit = isMaster ? loginUnitId : (data.user.unidadeId || data.user.unidade_id || "Todas");
          setSelectedUnit(startUnit);
          setForcedResetUserEmail(null);

          // Log starting unit context to server for audit trail
          fetch("/api/logs/acesso-unidade", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-user-email": data.user.email,
              "x-selected-unit": startUnit
            },
            body: JSON.stringify({ unidadeId: startUnit })
          }).catch(e => console.error(e));
        }
      } else {
        const error = await res.json();
        setLoginError(error.message || "Senha incorreta ou usuário inexistente.");
      }
    } catch (err) {
      setLoginError("Servidor fora de operação.");
    } finally {
      setLoadingSession(false);
    }
  };

  // Google OAuth Simulation login
  const handleSimulatedGoogleOAuth = async () => {
    setLoginError("");
    setLoadingSession(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleUser: {
            email: "operador.google@tms-log.com",
            name: "Operador Autorizado (Google Auth)"
          }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setSelectedUnit("Todas");
        setForcedResetUserEmail(null);
      }
    } catch (err) {
      setLoginError("Falha na interceptação OAuth.");
    } finally {
      setLoadingSession(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (newPasswordValue.length < 4) {
      setLoginError("A nova senha deve possuir pelo menos 4 caracteres.");
      return;
    }
    if (newPasswordValue !== confirmPasswordValue) {
      setLoginError("A confirmação de senha é diferente da senha digitada.");
      return;
    }

    setLoadingSession(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forcedResetUserEmail, newPassword: newPasswordValue }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setSelectedUnit(data.user.unidadeId || data.user.unidade_id || "Todas");
        setForcedResetUserEmail(null);
        setNewPasswordValue("");
        setConfirmPasswordValue("");
      } else {
        const err = await res.json();
        setLoginError(err.message || "Fracasso ao atualizar senha.");
      }
    } catch (err) {
      setLoginError("Erro na comunicação com o servidor.");
    } finally {
      setLoadingSession(false);
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-user-email": currentUser.email }
      }).catch(err => console.error("Logout audit failed:", err));
    }
    setCurrentUser(null);
    setActiveTab("dashboard");
    fetchLoginUnidades();
  };

  // Nav categories filter logic according to privileges
  const isMaster = currentUser && (currentUser.perfil === "admin_master" || currentUser.tipo_usuario === "MASTER");

  const itemsSidemenu = [
    { id: "dashboard", label: "Painel Executivo", icon: LayoutDashboard },
    { id: "processos", label: "Central de Processos", icon: ClipboardList },
    { id: "unidades", label: "Unidades Operat.", icon: Building, roleLocked: "admin_master" },
    { id: "veiculos", label: "Frotas / Veículos", icon: Truck },
    { id: "motoristas", label: "Cadastro Condutores", icon: Users },
    { id: "disponibilidade", label: "Agenda Disponibilidade", icon: Calendar },
    { id: "monitoramento", label: "Vistoria & DTs", icon: Layers },
    { id: "fechamento-dt", label: "Fechamento de DT", icon: Shield, isSubmenu: true },
    { id: "noshow", label: "Controle de No Show", icon: ShieldAlert },
    { id: "entregas-off", label: "Entregas OFF-Route", icon: Navigation },
    { id: "descargas", label: "Taxas Descarga/Chapa", icon: DollarSign },
    { id: "manutencao", label: "Ficha Manutenção", icon: Hammer },
    { id: "epi", label: "Estoque de EPIs", icon: Archive },
    { id: "alertas", label: "Central de Conformidades", icon: AlertTriangle, count: alertas.length },
    { id: "auditoria", label: "Logs de Auditoria", icon: Shield },
  ].filter(m => {
    if (!currentUser) return false;
    if (m.roleLocked && !isMaster) return false;
    
    // Check granular module permission
    if (!isMaster && currentUser.permissions) {
      const p = currentUser.permissions[m.id];
      if (p && p.view === false) {
        return false;
      }
    }
    return true;
  });

  if (!currentUser) {
    // Elegant Enterprise Logistic Lock Screen
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(10, 18, 36, 0.95), rgba(10, 15, 28, 0.98)), url('https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=1500&auto=format&fit=crop')` }}>
        
        {/* Abstract design vector circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col items-center max-w-sm w-full space-y-6 relative z-10">
          <div className="flex flex-col items-center space-y-2">
            <div className="p-3 bg-sky-500/10 border border-sky-400/20 rounded-2xl flex items-center justify-center">
              <Truck className="w-8 h-8 text-sky-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">AMPLA</h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">sistema operacional</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full shadow-2xl space-y-5">
            {forcedResetUserEmail ? (
              <div>
                <h2 className="text-sm font-semibold text-sky-400 tracking-tight flex items-center gap-1.5 font-mono">
                  <ShieldAlert className="w-4 h-4 text-sky-400 animate-pulse" />
                  ATUALIZAÇÃO DE SENHA OBRIGATÓRIA
                </h2>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Sua conta de filial está no primeiro acesso. Por determinação da portaria da Ampla, defina uma nova senha forte para ativar seu acesso definitivo.
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">Portal Operacional unificado</h2>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Identifique-se com suas credenciais para adentrar o sistema</p>
              </div>
            )}

            {loginError && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/20 rounded-md font-mono text-[10px] text-rose-400 leading-tight">
                ⚠️ {loginError}
              </div>
            )}

            {forcedResetUserEmail ? (
              <form onSubmit={handleChangePassword} className="space-y-3 font-sans text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Usuário / E-mail</label>
                  <input
                    type="text"
                    disabled
                    value={forcedResetUserEmail}
                    className="w-full bg-slate-950/60 border border-slate-800 text-slate-500 rounded px-3 py-2 text-xs outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Nova Senha Forte</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo de 4 caracteres"
                    value={newPasswordValue}
                    disabled={loadingSession}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha nova"
                    value={confirmPasswordValue}
                    disabled={loadingSession}
                    onChange={(e) => setConfirmPasswordValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForcedResetUserEmail(null);
                      setNewPasswordValue("");
                      setConfirmPasswordValue("");
                      setLoginError("");
                    }}
                    className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 py-2 rounded text-xs transition cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loadingSession}
                    className="flex-1 bg-sky-600 hover:bg-sky-500 font-semibold text-white py-2 rounded transition-all text-xs cursor-pointer"
                  >
                    {loadingSession ? "Gravando..." : "Salvar & Entrar"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3 font-sans text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Usuário</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite seu usuário..."
                    value={email}
                    disabled={loadingSession}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Digite sua senha..."
                    value={password}
                    disabled={loadingSession}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono font-medium">Selecionar Unidade</label>
                  <select
                    value={loginUnitId}
                    disabled={loadingSession}
                    onChange={(e) => setLoginUnitId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs cursor-pointer select-none"
                  >
                    {loginUnidades.filter(u => u.status !== "inativo").map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.estado})
                      </option>
                    ))}
                    {loginUnidades.filter(u => u.status !== "inativo").length === 0 && (
                      <option value="">Nenhuma unidade cadastrada</option>
                    )}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loadingSession}
                  className="w-full bg-sky-600 hover:bg-sky-500 font-semibold text-white py-2 rounded transition-all font-sans tracking-wide text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  {loadingSession ? "Conectando..." : "Entrar"}
                </button>
              </form>
            )}
          </div>

          <p className="text-[10px] text-slate-500 font-sans">
            AMPLA sistema operacional • Licenciado sob portarias de escoamento real.
          </p>
        </div>
      </div>
    );
  }

  // Active base authorized filter check
  const isAuthorized = (itemUnit: string) => {
    if (currentUser.perfil === "admin_master") return true; // Master views all
    return currentUser.unidadeId === itemUnit; // match specific base
  };

  // Switch views routing
  const navigateToTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const getAuthorizedUnits = () => {
    if (currentUser.perfil === "admin_master") return unidades;
    return unidades.filter((u) => u.id === currentUser.unidadeId);
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row transition-all duration-300 ${compactMode ? "ultra-compact text-xs" : ""}`}>
        
        {/* MOBILE HEADER BAR */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-400" />
            <span className="font-bold text-white tracking-wide text-xs uppercase">AMPLA sistema operacional</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 bg-slate-950 text-slate-400 rounded-lg animate-pulse"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className={`${
          mobileMenuOpen ? "block fixed inset-0 z-50 bg-slate-900 pt-16 md:pt-0" : "hidden"
        } md:flex md:flex-col ${sidebarCollapsed ? "md:w-[68px]" : "md:w-64"} bg-slate-900 border-r border-slate-800 shrink-0 font-sans select-none text-xs transition-all duration-250 ease-in-out`}>
          
          {/* Logo Brand */}
          <div className={`hidden md:flex items-center ${sidebarCollapsed ? "justify-center py-4" : "justify-between px-5 py-4.5"} border-b border-slate-800 shrink-0 transition-all duration-250`}>
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 bg-sky-600 rounded flex items-center justify-center font-bold text-white italic text-sm shrink-0">A</div>
                <div className="min-w-0">
                  <h1 className="text-white font-bold tracking-tight text-[11px] uppercase truncate">AMPLA</h1>
                  <span className="text-sky-400 font-normal text-[8px] block lowercase tracking-wider -mt-0.5">sistema operacional</span>
                </div>
              </div>
            ) : (
              <div className="w-7 h-7 bg-sky-600 rounded flex items-center justify-center font-bold text-white italic text-sm shrink-0">A</div>
            )}
            
            <button 
              id="btn-toggle-sidebar"
              onClick={toggleSidebar}
              className={`p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer ${sidebarCollapsed ? "absolute mt-14 bg-slate-950 border border-slate-800 rounded-full shadow p-1.5 hover:bg-slate-900 text-sky-400 z-20" : ""}`}
              title={sidebarCollapsed ? "Expandir Menu (☰)" : "Recolher Menu (◀)"}
            >
              {sidebarCollapsed ? (
                <Menu className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Connected User Profile */}
          <div className={`mx-3 my-4 bg-slate-950 rounded-xl border border-slate-800/80 shrink-0 relative flex items-center transition-all duration-250 ${sidebarCollapsed ? "p-2 justify-center" : "p-3.5 gap-2.5"}`}>
            <div className="p-2 bg-slate-900 text-sky-400 rounded-lg shrink-0" title={`${currentUser.nome} (${currentUser.perfil.replace("_", " ")})`}>
              <User className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <span className="text-white font-medium block truncate max-w-[130px] font-sans text-xs">{currentUser.nome}</span>
                <span className="text-[9px] text-slate-500 font-mono block tracking-wider uppercase">{currentUser.perfil.replace("_", " ")}</span>
                <div className="mt-1 flex items-center gap-1 text-[9px] text-sky-400 font-mono font-medium truncate">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <span className="truncate">
                    {currentUser.unidadeId === "Todas" ? "Todas as Filiais" : (unidades.find(u => u.id === currentUser.unidadeId)?.nome || "Goiânia")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Sidemenu options */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
            {itemsSidemenu.map((m) => {
              if (m.roleLocked && currentUser.perfil !== m.roleLocked) return null;

              const Icon = m.icon;
              const isActive = activeTab === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => navigateToTab(m.id)}
                  id={`btn-nav-${m.id}`}
                  className={`group relative w-full flex items-center rounded-lg font-medium transition-all duration-150 border ${
                    sidebarCollapsed ? "justify-center py-2.5 px-0" : "justify-between px-3 py-2"
                  } ${
                    !sidebarCollapsed && (m as any).isSubmenu ? "pl-8 text-xs bg-slate-900/10" : ""
                  } ${
                    isActive 
                      ? "bg-sky-500/10 text-sky-400 border-sky-500/20 font-semibold" 
                      : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30"
                  }`}
                >
                  <span className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2"}`}>
                    {!sidebarCollapsed && (m as any).isSubmenu ? (
                      <span className="text-slate-600 font-mono pr-1 select-none text-[10px]">└─</span>
                    ) : (
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                    )}
                    {!sidebarCollapsed && <span className="truncate">{m.label}</span>}
                  </span>
                  
                  {m.count !== undefined && m.count > 0 && (
                    sidebarCollapsed ? (
                      <span className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center bg-rose-500 text-white text-[8px] font-bold font-mono rounded-full animate-pulse">
                        {m.count}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-rose-500 text-white font-mono text-[9px] font-bold rounded-full animate-pulse leading-none">
                        {m.count}
                      </span>
                    )
                  )}

                  {/* Smart Tooltip triggered on hover when collapsed */}
                  {sidebarCollapsed && (
                    <div className="absolute left-[58px] top-1/2 -translate-y-1/2 invisible opacity-0 scale-95 group-hover:visible group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 bg-slate-950 border border-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-2xl whitespace-nowrap z-50 pointer-events-none">
                      {m.label}
                      {m.count !== undefined && m.count > 0 && ` (${m.count})`}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Master Administration Exclusive Sidebar Block */}
            {isMaster && (
              <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-1">
                {!sidebarCollapsed ? (
                  <span className="px-3 text-[9px] font-bold text-sky-400 block tracking-widest uppercase mb-2 font-mono">
                    🛡️ ADMINISTRAÇÃO MASTER
                  </span>
                ) : (
                  <div className="border-t border-slate-850 my-2 mx-1"></div>
                )}
                {[
                  { id: "master-usuarios", label: "Gerenciar Usuários", icon: Users },
                  { id: "master-permissoes", label: "Controle Permissões", icon: Key },
                  { id: "master-unidades", label: "Gerenciar Unidades", icon: Building }
                ].map((m) => {
                  const Icon = m.icon;
                  const isActive = activeTab === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => navigateToTab(m.id)}
                      id={`btn-nav-${m.id}`}
                      className={`group relative w-full flex items-center rounded-lg font-medium transition-all duration-150 border ${
                        sidebarCollapsed ? "justify-center py-2.5 px-0" : "justify-between px-3 py-2"
                      } ${
                        isActive 
                          ? "bg-sky-500/10 text-sky-400 border-sky-500/20 font-semibold" 
                          : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30"
                      }`}
                    >
                      <span className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2"}`}>
                        <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                        {!sidebarCollapsed && <span className="text-[11px] truncate">{m.label}</span>}
                      </span>

                      {/* Smart Tooltip triggered on hover when collapsed */}
                      {sidebarCollapsed && (
                        <div className="absolute left-[58px] top-1/2 -translate-y-1/2 invisible opacity-0 scale-95 group-hover:visible group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 bg-slate-950 border border-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-2xl whitespace-nowrap z-50 pointer-events-none">
                          {m.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </nav>

          {/* Modo Compacto Settings Toggle Button */}
          <div className={`mx-3 mb-2 shrink-0 ${sidebarCollapsed ? "flex justify-center" : "px-1"}`}>
            <button
              id="btn-compact-mode"
              onClick={toggleCompactMode}
              className={`group relative flex items-center justify-center rounded-lg border text-slate-450 hover:text-sky-400 transition-all text-[10px] uppercase font-mono ${
                compactMode 
                  ? "bg-sky-950/20 border-sky-500/35 text-sky-400" 
                  : "bg-transparent border-slate-800/60 hover:bg-slate-800/20"
              } ${sidebarCollapsed ? "p-2 w-8 h-8" : "w-full py-2 px-3.5 gap-2"}`}
              title={compactMode ? "Desativar Modo Compacto" : "Ativar Modo Compacto"}
            >
              <Layers className={`w-3.5 h-3.5 shrink-0 ${compactMode ? "text-sky-400 animate-pulse" : "text-slate-400"}`} />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-[9px] tracking-tight">Modo Compacto</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${compactMode ? "bg-sky-400 shadow shadow-sky-400 animate-pulse" : "bg-slate-700"}`}></span>
                </div>
              )}

              {/* Tooltip triggered on hover when collapsed */}
              {sidebarCollapsed && (
                <div className="absolute left-[58px] top-1/2 -translate-y-1/2 invisible opacity-0 scale-95 group-hover:visible group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 bg-slate-950 border border-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-2xl whitespace-nowrap z-50 pointer-events-none">
                  {compactMode ? "Modo Compacto: Ativo" : "Modo Compacto: Ativar"}
                </div>
              )}
            </button>
          </div>

          {/* Logout Action */}
          <div className={`border-t border-slate-800/60 shrink-0 transition-all duration-250 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
            <button
              onClick={handleLogout}
              id="btn-logout"
              className={`group relative w-full py-2 bg-slate-950 hover:bg-rose-950/10 text-slate-400 hover:text-rose-400 font-semibold rounded-lg transition border border-slate-800 flex items-center justify-center ${
                sidebarCollapsed ? "px-0" : "gap-1.5 px-3"
              }`}
            >
              <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              {!sidebarCollapsed && <span className="text-xs">Sair da Conta</span>}

              {/* Tooltip triggered on hover when collapsed */}
              {sidebarCollapsed && (
                <div className="absolute left-[58px] top-1/2 -translate-y-1/2 invisible opacity-0 scale-95 group-hover:visible group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 bg-slate-950 border border-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-2xl whitespace-nowrap z-50 pointer-events-none">
                  Sair da Conta
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* MAIN BODY CONTAINER */}
        <main className="flex-1 flex flex-col min-w-0">

          {/* DYNAMIC SUB-HEADER BAR */}
          <section className="bg-slate-900 border-b border-slate-800 px-6 py-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none shrink-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                {activeTab === "dashboard" && "Dashboard Operativo"}
                {activeTab === "unidades" && "Unidades Logísticas"}
                {activeTab === "veiculos" && "Cadastro de Frotas"}
                {activeTab === "motoristas" && "Motoristas & Conformidades"}
                {activeTab === "disponibilidade" && "Agenda Diária"}
                {activeTab === "monitoramento" && "Vistoria DT"}
                {activeTab === "fechamento-dt" && "Fechamento de DT & Controle de Vales"}
                {activeTab === "entregas-off" && "Entregas OFF-Route"}
                {activeTab === "descargas" && "Taxas de Descarga"}
                {activeTab === "manutencao" && "Histórico de Manutenções"}
                {activeTab === "epi" && "Alocação EPIs"}
                {activeTab === "alertas" && "Painel Alertas Ativos"}
                {activeTab === "auditoria" && "Logs de Segurança"}
                {activeTab === "master-usuarios" && "Gerenciamento Geral de Usuários"}
                {activeTab === "master-permissoes" && "Matriz Geral de Permissões"}
                {activeTab === "master-unidades" && "Administração Master de Unidades"}
              </h1>
              <span className="text-[10px] text-slate-500 font-mono">/ {activeTab}</span>
            </div>

            {/* Quick base switch summary or indicators */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-mono text-[10px] self-end sm:self-auto select-none">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">unidade atual:</span>
                <select
                  value={selectedUnit}
                  onChange={async (e) => {
                    const newVal = e.target.value;
                    setSelectedUnit(newVal);
                    // Log access to backend
                    try {
                      const selName = newVal === "Todas" ? "Visão Consolidada" : (unidades.find(u => u.id === newVal)?.nome || newVal);
                      await fetch("/api/logs/acesso-unidade", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-user-email": currentUser.email
                        },
                        body: JSON.stringify({ unidadeId: newVal, unidadeNome: selName })
                      });
                    } catch (err) {
                      console.error("Erro ao registrar log de acesso à unidade:", err);
                    }
                  }}
                  className="bg-slate-950 text-sky-400 border border-slate-800 rounded px-2 py-0.5 font-bold focus:outline-none focus:border-sky-500 transition-colors uppercase cursor-pointer"
                >
                  {currentUser.perfil === "admin_master" && (
                    <option value="Todas">★ VISÃO CONSOLIDADA (MASTER)</option>
                  )}
                  {unidades
                    .filter(u => {
                      if (currentUser.perfil === "admin_master" || currentUser.unidadeId === "Todas") return true;
                      if (u.id === currentUser.unidadeId) return true;
                      return currentUser.unidadesPermitidas?.includes(u.id);
                    })
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.estado})
                      </option>
                    ))
                  }
                </select>
              </div>

              <span className="text-slate-700 hidden sm:block">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">BANCO:</span>
                {dbStatus?.connected ? (
                  <button
                    onClick={() => setDbModalOpen(true)}
                    className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/10 flex items-center gap-1 leading-none hover:bg-sky-500/20 transition-colors uppercase cursor-pointer text-[10px]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    SUPABASE EM NUVEM
                  </button>
                ) : (
                  <button
                    onClick={() => setDbModalOpen(true)}
                    className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/10 flex items-center gap-1 leading-none hover:bg-amber-500/20 transition-colors uppercase animate-pulse cursor-pointer text-[10px]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    LOCAL (EFÊMERO - RISCO)
                  </button>
                )}
              </div>

              <span className="text-slate-700 hidden sm:block">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">STATUS:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/10 flex items-center gap-1 leading-none text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  ATIVO REAL-TIME
                </span>
              </div>
            </div>
          </section>

          {/* ACTIVE CONTENT VIEW WINDOW */}
          <section className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-850">
            
            {activeTab === "dashboard" && (
              <DashboardView 
                unidades={unidades}
                selectedUnit={selectedUnit}
                setSelectedUnit={setSelectedUnit}
                userEmail={currentUser.email}
                userRole={currentUser.perfil}
                userUnidadeId={currentUser.unidadeId}
              />
            )}

            {activeTab === "processos" && (
              <CentralProcessos 
                currentUser={currentUser}
                unidades={unidades}
              />
            )}

            {activeTab === "unidades" && (
              <UnidadesView 
                unidades={unidades}
                onRefresh={loadGlobalData}
                userRole={currentUser.perfil}
                userEmail={currentUser.email}
              />
            )}

            {activeTab === "veiculos" && (
              <VeiculosView 
                veiculos={veiculos}
                motoristas={motoristas}
                unidades={unidades}
                disps={disps}
                rotas={rotas}
                manutencoes={manutencoes}
                userRole={currentUser.perfil}
                onRefresh={loadGlobalData}
                userEmail={currentUser.email}
              />
            )}

            {activeTab === "motoristas" && (
              <MotoristasView 
                motoristas={motoristas}
                unidades={unidades}
                veiculos={veiculos}
                onRefresh={loadGlobalData}
                userEmail={currentUser.email}
              />
            )}

            {activeTab === "disponibilidade" && (
              <DisponibilidadeView 
                veiculos={veiculos}
                motoristas={motoristas}
                userEmail={currentUser.email}
              />
            )}

            {activeTab === "monitoramento" && (
              <MonitoramentoView 
                rotas={rotas}
                veiculos={veiculos}
                motoristas={motoristas}
                unidades={unidades}
                onRefresh={loadGlobalData}
                userEmail={currentUser.email}
                noShows={noShows}
              />
            )}

            {activeTab === "fechamento-dt" && (
              <FechamentoDtView 
                rotas={rotas}
                veiculos={veiculos}
                motoristas={motoristas}
                unidades={unidades}
                vales={vales}
                fechamentosDt={fechamentosDt}
                onRefresh={loadGlobalData}
                userEmail={currentUser.email}
                noShows={noShows}
              />
            )}

            {activeTab === "noshow" && (
              <NoShowView 
                rotas={rotas}
                veiculos={veiculos}
                motoristas={motoristas}
                unidades={unidades}
                noShows={noShows}
                userEmail={currentUser.email}
                onRefresh={loadGlobalData}
              />
            )}

            {activeTab === "entregas-off" && (
              <EntregasOffView 
                offList={offList}
                veiculos={veiculos}
                motoristas={motoristas}
                unidades={unidades}
                onRefresh={loadGlobalData}
                userEmail={currentUser?.email || ""}
              />
            )}

            {activeTab === "descargas" && (
              <DescargasView 
                descargasList={descargasList}
                veiculos={veiculos}
                motoristas={motoristas}
                rotas={rotas}
                offList={offList}
                onRefresh={loadGlobalData}
                currentUser={currentUser!}
              />
            )}

            {activeTab === "manutencao" && (
              <ManutencaoView 
                manutencoes={manutencoes}
                veiculos={veiculos}
                onRefresh={loadGlobalData}
                currentUser={currentUser!}
              />
            )}

            {activeTab === "epi" && (
              <EpiView 
                estoque={estoqueEpi}
                movimentacoes={movimentacoesEpi}
                motoristas={motoristas}
                onRefresh={loadGlobalData}
                userEmail={currentUser.email}
              />
            )}

            {activeTab === "alertas" && (
              <AlertasView 
                alertas={alertas}
                onRefresh={loadGlobalData}
              />
            )}

            {activeTab === "auditoria" && (
              <AuditoriaView 
                logs={auditorios}
              />
            )}

            {activeTab === "master-usuarios" && (
              <MasterUsuariosView 
                unidades={unidades}
                onRefresh={loadGlobalData}
                userEmail={currentUser.email}
              />
            )}

            {activeTab === "master-permissoes" && (
              <MasterPermissoesView 
                unidades={unidades}
                userEmail={currentUser.email}
              />
            )}

            {activeTab === "master-unidades" && (
              <MasterUnidadesView 
                unidades={unidades}
                onRefresh={loadGlobalData}
                userEmail={currentUser.email}
              />
            )}

          </section>

          {/* Humble Global Footer */}
          <footer className="bg-slate-900 border-t border-slate-800/80 px-6 py-3 shrink-0 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>Copyright © 2026 AMPLA sistema operacional - Todos os direitos reservados.</span>
            <span className="flex gap-4 mt-2 md:mt-0">
              <a href="#" className="hover:text-slate-300">Portaria Operacional Antigravidade</a>
              <a href="#" className="hover:text-slate-300">Auditoria SOX</a>
            </span>
          </footer>

        </main>

        <DatabaseSettingsModal 
          isOpen={dbModalOpen} 
          onClose={() => setDbModalOpen(false)} 
          currentUser={currentUser} 
        />

      </div>
    </ErrorBoundary>
  );
}
