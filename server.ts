import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { FileDatabase, Usuario, Motorista, Veiculo, Rota, NotaFiscal, Manutencao, UsuarioUnidadePermissao, Unidade } from "./server/database";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize and bootstrap database connection
  try {
    await FileDatabase.bootstrap();
    console.log("[FileDatabase] Bootstrapping accomplished.");
  } catch (err) {
    console.error("[FileDatabase] Error during database bootstrapping:", err);
  }

  // Middleware
  app.use(express.json({ limit: "50mb" }));

  // Critical Supabase Live-Sync and Write-Verification Middleware
  app.use("/api", async (req, res, next) => {
    // 1. Sync cache from Supabase for all reads to ensure we always fetch from live database
    try {
      if (FileDatabase.isSupabaseConfigured()) {
        await FileDatabase.bootstrap();
      }
    } catch (err) {
      console.error("[Middleware] Live reload from Supabase failed:", err);
    }

    // 2. Wrap res.json and res.send to wait for any pending writes to complete
    const originalJson = res.json;
    const originalSend = res.send;

    let isIntercepted = false;

    const waitForWrites = async () => {
      if (isIntercepted) return true;
      isIntercepted = true;
      
      if (FileDatabase.pendingWrites.length > 0) {
        console.log(`[Middleware] Waiting for ${FileDatabase.pendingWrites.length} pending Supabase writes...`);
        try {
          // Wait for all current pending writes to resolve
          await Promise.all(FileDatabase.pendingWrites);
          console.log("[Middleware] All pending writes persisted successfully on Supabase.");
        } catch (err: any) {
          console.error("[Middleware] Database persistence failed in Supabase:", err);
          
          // Restore original methods so we can send an error without infinite loop
          res.json = originalJson;
          res.send = originalSend;
          
          res.status(500).json({
            success: false,
            error: "Erro de Persistência no Supabase",
            message: "Falha crítica ao gravar ou atualizar o registro no banco de dados Supabase. Operação cancelada para garantir a integridade dos dados.",
            details: err.message || String(err)
          });
          return false;
        }
      }
      return true;
    };

    res.json = function (body) {
      waitForWrites().then((success) => {
        if (success) {
          originalJson.call(res, body);
        }
      });
      return res;
    };

    res.send = function (body) {
      waitForWrites().then((success) => {
        if (success) {
          originalSend.call(res, body);
        }
      });
      return res;
    };

    next();
  });

  // API logs helper
  const logApiAction = (userEmail: string, action: string, details: string) => {
    FileDatabase.logAudit(userEmail || "Sistema", action, details);
  };

  // Structured Error logger and response formatter
  const handleApiError = (res: express.Response, info: {
    tableName: "veiculos" | "motoristas";
    operation: "INSERT" | "UPDATE" | "DELETE" | "SELECT";
    errorField?: string;
    message: string;
    dbMessage: string;
    status?: number;
  }) => {
    const status = info.status || 400;
    
    // Determine the subject
    const subject = info.tableName === "veiculos" ? "veículo" : "motorista";
    
    // Determine the action word
    let action = "consultar";
    if (info.operation === "INSERT") action = "inserir";
    else if (info.operation === "UPDATE") action = "atualizar";
    else if (info.operation === "DELETE") action = "remover";
    
    // Build exact phrase format requested, e.g., "Erro ao inserir veículo. Campo placa duplicado."
    const fullErrorMsg = `Erro ao ${action} ${subject}. ${info.errorField && info.errorField !== "N/A" ? `Campo ${info.errorField} ` : ""}${info.message}`;
    
    const payload = {
      success: false,
      message: fullErrorMsg,
      error: fullErrorMsg,
      details: {
        tableName: info.tableName,
        operation: info.operation,
        errorField: info.errorField || "N/A",
        dbMessage: info.dbMessage
      }
    };

    console.error(`[BACKEND ERROR LOG] Table: ${info.tableName} | Op: ${info.operation} | Error:`, JSON.stringify(payload, null, 2));
    res.setHeader("Content-Type", "application/json");
    return res.status(status).json(payload);
  };

  // Helper to log audit actions with real IP and unit name context for compliance
  const logAudit = (req: express.Request, username: string, action: string, details: string, unitId: string = "") => {
    const rawIp = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1";
    const ip = rawIp.replace(/^.*:/, ""); // Resolve standard clean IP address
    
    let unitName = "";
    if (unitId) {
      if (unitId === "Todas") {
        unitName = "Visão Consolidada";
      } else {
        const units = FileDatabase.get("unidades") as any[];
        unitName = units.find(u => u.id === unitId)?.nome || unitId;
      }
    }
    FileDatabase.logAudit(username, action, details, unitName, ip);
  };

  // Helper to get active user from request headers
  const getRequestUser = (req: express.Request): Usuario | null => {
    const emailHeader = req.headers["x-user-email"] as string;
    if (!emailHeader) return null;
    const users = FileDatabase.get("usuarios");
    // Match either email or username/id
    return users.find(u => u.email.toLowerCase() === emailHeader.toLowerCase() || u.id.toLowerCase() === emailHeader.toLowerCase()) || null;
  };

  // Helper to get authorized units for user
  const getAuthorizedUnitsForUser = (user: Usuario): string[] => {
    const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
    if (isMaster || user.unidadeId === "Todas" || user.unidade_id === "Todas") {
      const units = FileDatabase.get("unidades") as any[];
      return ["Todas", ...units.map(u => u.id)];
    }
    const permissoes = FileDatabase.get("usuario_unidade_permissao") as UsuarioUnidadePermissao[];
    const authorized = [
      user.unidadeId,
      user.unidade_id,
      ...permissoes.filter(p => p.usuario_id === user.id && p.ativo).map(p => p.unidade_id)
    ].filter(Boolean);
    return Array.from(new Set(authorized));
  };

  // Helper to get request selected unit context
  const getRequestUnitContext = (req: express.Request, user: Usuario): string => {
    const selectedHeader = req.headers["x-selected-unit"] as string || "";
    const auths = getAuthorizedUnitsForUser(user);
    
    // If client requested a specific authorized unit, let's use it!
    if (selectedHeader && auths.includes(selectedHeader)) {
      return selectedHeader;
    }
    // If "Todas" is authorized and nothing specific requested, return "Todas"
    if (auths.includes("Todas")) {
      return selectedHeader || "Todas";
    }
    // Default to primary unit or first authorized
    return user.unidadeId !== "Todas" ? user.unidadeId : (auths[0] || "");
  };

  // Helper to check if a user has access to a given process card
  const checkUserHasAccess = (user: Usuario, process: any): boolean => {
    if (!user || !process) return false;
    const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
    if (isMaster) return true;

    const emailNorm = (user.email || "").toLowerCase();

    const isPart = process.criadoPor?.toLowerCase() === emailNorm || 
                   process.responsavel?.toLowerCase() === emailNorm ||
                   process.participantes?.some((pt: string) => pt.toLowerCase() === emailNorm);
    if (isPart) return true;

    const auths = getAuthorizedUnitsForUser(user);
    const mainUnitMatch = auths.includes(process.unidadeId);
    const sharedMatch = process.unidadesCompartilhadas?.some((unId: string) => auths.includes(unId)) || 
                        process.unidadesCompartilhadas?.includes("Todas");
    
    if (mainUnitMatch || sharedMatch) {
      return true;
    }

    return false;
  };

  // Helper to get access level of a user for a given process card
  const getProcessUserRole = (process: any, user: Usuario): "visualizador" | "editor" | "administrador" => {
    if (!user || !process) return "visualizador";
    
    const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
    if (isMaster) return "administrador";

    const emailNorm = (user.email || "").toLowerCase();

    // Explicit roles override defaults
    if (process.participanteRoles && process.participanteRoles[emailNorm]) {
      return process.participanteRoles[emailNorm];
    }

    // Creator or responsible is always administrador
    const isCreatorOrResponsible = process.criadoPor?.toLowerCase() === emailNorm || 
                                   process.responsavel?.toLowerCase() === emailNorm;
    if (isCreatorOrResponsible) return "administrador";

    // Participant is editor by default
    const isParticipant = process.participantes?.some((pt: string) => pt.toLowerCase() === emailNorm);
    if (isParticipant) return "editor";

    // Default for shared access is visualizador
    return "visualizador";
  };

  // Helper to enrich user with allowed units permissions
  const getUserWithPerms = (user: Usuario): any => {
    const permissoes = FileDatabase.get("usuario_unidade_permissao") as UsuarioUnidadePermissao[];
    const activePerms = permissoes
      .filter(p => p.usuario_id === user.id && p.ativo)
      .map(p => p.unidade_id);
    return {
      ...user,
      unidadesPermitidas: activePerms
    };
  };

  // ----------------------------------------------------
  // DATABASE STATUS & SYNC (SUPABASE)
  // ----------------------------------------------------
  app.get("/api/database/status", (req, res) => {
    try {
      const status = FileDatabase.getSupabaseStatus();
      res.json({
        success: true,
        ...status
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/database/sync", async (req, res) => {
    try {
      const isConfigured = FileDatabase.isSupabaseConfigured();
      if (!isConfigured) {
        return res.status(400).json({ success: false, message: "Supabase não está configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis de ambiente." });
      }
      
      const user = getRequestUser(req);
      
      await FileDatabase.bootstrap(); // reloads / forces sync
      logAudit(req, user?.nome || "Sistema", "SYNC_DATABASE", `Sincronização manual com o Supabase efetuada`);
      
      res.json({
        success: true,
        message: "Sincronização com o Supabase efetuada com sucesso!",
        status: FileDatabase.getSupabaseStatus()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ----------------------------------------------------
  // AUTH API
  // ----------------------------------------------------
  app.get("/api/auth/unidades", (req, res) => {
    const unidades = FileDatabase.get("unidades");
    res.json(unidades);
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password, googleUser } = req.body;
    console.log(`\n[Auth DIAGNOSTICS] Login attempt received for '${email}'`);
    const users = FileDatabase.get("usuarios");
    console.log(`[Auth DIAGNOSTICS] Loaded ${users ? users.length : 0} users from cached database.`);

    if (googleUser) {
      console.log(`[Auth DIAGNOSTICS] OAuth Google Login flow triggered for email: ${googleUser.email}`);
      // Simulate Google Login
      let user = users.find((u) => u.email.toLowerCase() === googleUser.email.toLowerCase() || u.id.toLowerCase() === googleUser.email.toLowerCase());
      if (!user) {
        console.log(`[Auth DIAGNOSTICS] Google user not found in the database. Auto-creating a new operator account.`);
        // Create auto operator
        user = {
          id: `usr-${googleUser.email.split('@')[0]}`,
          email: googleUser.email,
          nome: googleUser.name || "Usuário Google",
          perfil: "operador",
          unidadeId: "Todas",
          status: "ativo",
          deveAlterarSenha: false
        };
        FileDatabase.add("usuarios", user, "oauth-system");
      }
      logApiAction(user.email, "AUTH_GOOGLE_SUCCESS", "Login via Google OAuth efetuado");
      console.log(`[Auth DIAGNOSTICS] Google OAuth Successful for user: ${user.nome} (Profile: ${user.perfil})`);
      return res.json({ success: true, user: getUserWithPerms(user) });
    }

    // Traditional Credential login
    console.log(`[Auth DIAGNOSTICS] Looking up user by email or ID match for credentials...`);
    const user = users.find((u) => u.email.toLowerCase() === email?.toLowerCase() || u.id.toLowerCase() === email?.toLowerCase());
    
    if (user) {
      console.log(`[Auth DIAGNOSTICS] User match found! Nome: ${user.nome}, Profile: ${user.perfil}, Status: ${user.status}, Needs PW Change: ${user.deveAlterarSenha}`);
      
      if (user.status === "inativo") {
        console.warn(`[Auth DIAGNOSTICS] Login rejected: target account is inactive/suspended.`);
        return res.status(403).json({ success: false, message: "Esta conta está suspensa ou inativa. Entre em contato com a Administração Master." });
      }

      if (user.senha && user.senha !== password) {
        console.warn(`[Auth DIAGNOSTICS] Login rejected: incorrect password. Provided: "${password}", Stored: "${user.senha}"`);
        return res.status(401).json({ success: false, message: "Senha incorreta." });
      }

      if (user.deveAlterarSenha) {
        logApiAction(user.email, "AUTH_PWD_PENDING_CHANGE", "Logado com sucesso, necessita alterar a senha padrão");
        logAudit(req, user.nome, "LOGIN", `Login padrão efetuado (necessita redefinir senha)`, user.unidadeId);
        console.log(`[Auth DIAGNOSTICS] Login successful (pending required password change) for ${user.nome}`);
        return res.json({ success: true, user: getUserWithPerms(user), forcePasswordReset: true });
      }

      logApiAction(user.email, "AUTH_PWD_SUCCESS", "Login tradicional efetuado");
      logAudit(req, user.nome, "LOGIN", `Efetuou login com sucesso no sistema. Tipo: ${user.tipo_usuario || "MASTER"}`, user.unidadeId);
      console.log(`[Auth DIAGNOSTICS] Login successful! Session granted for ${user.nome}`);
      return res.json({ success: true, user: getUserWithPerms(user) });
    }

    console.warn(`[Auth DIAGNOSTICS] Login failed: No user found matching identifier "${email}". Available users in cached database:`);
    if (users && users.length > 0) {
      users.forEach(u => {
        console.log(` - ID: ${u.id} | Email: ${u.email} | Nome: ${u.nome}`);
      });
    } else {
      console.warn(`[Auth DIAGNOSTICS] WARNING: The "usuarios" table is completely empty! Please check your local JSON database.json or Supabase table.`);
    }

    return res.status(401).json({ success: false, message: "E-mail ou credenciais inválidas" });
  });

  // Change Password endpoint for first log-in
  app.post("/api/auth/change-password", (req, res) => {
    const { email, newPassword } = req.body;
    const users = FileDatabase.get("usuarios");
    const userIdx = users.findIndex(u => u.email.toLowerCase() === email?.toLowerCase() || u.id.toLowerCase() === email?.toLowerCase());

    if (userIdx !== -1) {
      const user = users[userIdx];
      user.senha = newPassword;
      user.deveAlterarSenha = false;
      users[userIdx] = user;
      FileDatabase.set("usuarios", users);

      logApiAction(user.email, "PASSWORD_CHANGED", "A senha obrigatória do primeiro acesso foi alterada com sucesso");
      logAudit(req, user.nome, "CHANGE_PASSWORD", "Alterou a senha de primeiro acesso", user.unidadeId);
      return res.json({ success: true, user: getUserWithPerms(user) });
    }
    return res.status(404).json({ success: false, message: "Usuário não localizado." });
  });

  app.post("/api/auth/logout", (req, res) => {
    const user = getRequestUser(req);
    if (user) {
      logAudit(req, user.nome, "LOGOUT", "Efetuou logout do sistema", user.unidadeId);
    }
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // DASHBOARD API
  // ----------------------------------------------------
  // ----------------------------------------------------
  // DASHBOARD API
  // ----------------------------------------------------
  app.get("/api/dashboard", (req, res) => {
    const { period, unitId, selectedDate, startDate, endDate, month, year } = req.query as { 
      period?: "Dia" | "Semana" | "Mês" | "Ano" | "Personalizado"; 
      unitId?: string;
      selectedDate?: string;
      startDate?: string;
      endDate?: string;
      month?: string;
      year?: string;
    };
    
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const rotas = FileDatabase.get("rotas") as Rota[];
    const motoristas = FileDatabase.get("motoristas") as Motorista[];
    const veiculos = FileDatabase.get("veiculos") as Veiculo[];
    const disponibilidade = FileDatabase.get("disponibilidade") || [];
    const descargas = FileDatabase.get("descargas") || [];
    const nfs = FileDatabase.get("notas_fiscais") || [];
    const unidades = FileDatabase.get("unidades") || [];

    // Force unit isolation for non-master users or respect selected context
    const activeHeaderUnit = getRequestUnitContext(req, user);
    const authUnits = getAuthorizedUnitsForUser(user);
    const filteredUnitId = (unitId && authUnits.includes(unitId)) ? unitId : activeHeaderUnit;

    // Filter by Unit first
    const filterUnit = (item: any) => {
      if (filteredUnitId === "Todas") return true;
      const uid = item.unidadeId || item.unidade;
      return uid === filteredUnitId;
    };

    const filteredRotasUnit = rotas.filter(filterUnit);
    const filteredMotoristas = motoristas.filter(filterUnit);
    const filteredVeiculos = veiculos.filter(filterUnit);

    // ----------------------------------------------------
    // TEMPORAL FILTER RESOLUTION
    // ----------------------------------------------------
    const getRangeForPeriod = (p: string, selDate?: string, stDate?: string, enDate?: string, m?: string, y?: string) => {
      let start = "1970-01-01";
      let end = "2999-12-31";
      
      const todayStr = "2026-06-12"; // system preseeded active date
      
      if (p === "Dia") {
        const ref = selDate || todayStr;
        start = ref;
        end = ref;
      } else if (p === "Semana") {
        if (stDate && enDate) {
          start = stDate;
          end = enDate;
        } else {
          // Default to Week 24 of 2026
          start = "2026-06-08";
          end = "2026-06-14";
        }
      } else if (p === "Mês") {
        const yr = y || "2026";
        const mn = (m || "06").padStart(2, "0");
        start = `${yr}-${mn}-01`;
        end = `${yr}-${mn}-31`; // string compares are safe with prefixing
      } else if (p === "Ano") {
        const yr = y || "2026";
        start = `${yr}-01-01`;
        end = `${yr}-12-31`;
      } else if (p === "Personalizado") {
        start = stDate || "2026-06-01";
        end = enDate || "2026-06-14";
      } else {
        // Fallback default
        start = "2026-06-08";
        end = "2026-06-14";
      }
      return { start, end };
    };

    const getPreviousRange = (p: string, currStart: string, currEnd: string) => {
      let prevStart = "";
      let prevEnd = "";
      
      try {
        const dStart = new Date(currStart + "T12:00:00");
        const dEnd = new Date(currEnd + "T12:00:00");
        
        const periodType = p || "Semana";

        if (periodType === "Dia") {
          dStart.setDate(dStart.getDate() - 1);
          const s = dStart.toISOString().split("T")[0];
          prevStart = s;
          prevEnd = s;
        } else if (periodType === "Semana") {
          dStart.setDate(dStart.getDate() - 7);
          dEnd.setDate(dEnd.getDate() - 7);
          prevStart = dStart.toISOString().split("T")[0];
          prevEnd = dEnd.toISOString().split("T")[0];
        } else if (periodType === "Mês") {
          dStart.setMonth(dStart.getMonth() - 1);
          const mnStr = String(dStart.getMonth() + 1).padStart(2, "0");
          prevStart = `${dStart.getFullYear()}-${mnStr}-01`;
          prevEnd = `${dStart.getFullYear()}-${mnStr}-31`;
        } else if (periodType === "Ano") {
          dStart.setFullYear(dStart.getFullYear() - 1);
          prevStart = `${dStart.getFullYear()}-01-01`;
          prevEnd = `${dStart.getFullYear()}-12-31`;
        } else {
          const diffMs = dEnd.getTime() - dStart.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
          dStart.setDate(dStart.getDate() - diffDays);
          dEnd.setDate(dEnd.getDate() - diffDays);
          prevStart = dStart.toISOString().split("T")[0];
          prevEnd = dEnd.toISOString().split("T")[0];
        }
      } catch (e) {
        prevStart = "2026-06-01";
        prevEnd = "2026-06-07";
      }
      return { start: prevStart, end: prevEnd };
    };

    const activePeriod = period || "Semana";
    const currentRange = getRangeForPeriod(activePeriod, selectedDate, startDate, endDate, month, year);
    const previousRange = getPreviousRange(activePeriod, currentRange.start, currentRange.end);

    // Helper to calculate statistics for a specific range of days
    const calculateKpisForRange = (rangeStart: string, rangeEnd: string) => {
      const rangeRotas = filteredRotasUnit.filter(r => r.data >= rangeStart && r.data <= rangeEnd);
      
      let totalEntregasCount = 0;
      let entreguesCount = 0;
      let devolucoesCount = 0;
      let pendentesCount = 0;
      let reentregasCount = 0;
      let recargasCount = 0;
      let rotasFinalizadas = 0;
      let rotasEmAndamento = 0;

      let viagensEmRota = 0;
      let viagensEmCarregamento = 0;
      let viagensAgDescarga = 0;
      let viagensFinalizadas = 0;
      let viagensAgCarregamento = 0;
      let viagensCanceladas = 0;
      let viagensVeiculoQuebrado = 0;

      rangeRotas.forEach((r) => {
        totalEntregasCount += r.totalEntregas;
        entreguesCount += r.entregues;
        devolucoesCount += r.devolucoes;
        pendentesCount += (r.totalEntregas - r.entregues - r.devolucoes);

        if (r.tipo === "Reentrega") reentregasCount++;
        if (r.tipo === "Recarga") recargasCount++;

        if (r.status === "Finalizada") {
          rotasFinalizadas++;
        } else {
          rotasEmAndamento++;
        }

        const sv = (r.status_viagem || r.status || "").trim().toLowerCase();
        if (sv === "em rota" || sv === "em rota (entregando)") {
          viagensEmRota++;
        } else if (sv === "em carregamento") {
          viagensEmCarregamento++;
        } else if (sv === "aguardando descarga" || sv === "ag. descarga" || sv === "ag.descarga" || sv === "em descarga") {
          viagensAgDescarga++;
        } else if (sv === "finalizada") {
          viagensFinalizadas++;
        } else if (sv === "aguardando carregamento" || sv === "ag. carregamento" || sv === "aguardando carga") {
          viagensAgCarregamento++;
        } else if (sv === "cancelada") {
          viagensCanceladas++;
        } else if (sv === "veículo quebrado" || sv === "veiculo quebrado") {
          viagensVeiculoQuebrado++;
        } else {
          viagensAgCarregamento++;
        }
      });

      return {
        entregasPrevistas: totalEntregasCount,
        entregasRealizadas: entreguesCount,
        devolucoes: devolucoesCount,
        entregasPendentes: pendentesCount,
        reentregas: reentregasCount,
        recargas: recargasCount,
        rotasFinalizadas,
        rotasEmAndamento,
        viagensEmRota,
        viagensEmCarregamento,
        viagensAgDescarga,
        viagensFinalizadas,
        viagensAgCarregamento,
        viagensCanceladas,
        viagensVeiculoQuebrado,
        rotasTotal: rangeRotas.length
      };
    };

    // Calculate current scope statistics
    const currentStats = calculateKpisForRange(currentRange.start, currentRange.end);
    // Calculate previous scope statistics for comparisons
    const previousStats = calculateKpisForRange(previousRange.start, previousRange.end);

    // Vehicles static counting (pool is unit-based, independent of date-filtering)
    const veiculosEmRota = filteredRotasUnit.filter(r => r.status === "Em rota" && r.data >= currentRange.start && r.data <= currentRange.end).length;
    const veiculosDisponiveis = filteredVeiculos.filter(v => v.status === "Liberado").length;
    const veiculosIndisponiveis = filteredVeiculos.filter(v => v.status === "Bloqueado").length;

    // Availability KPI records
    const mDisps = disponibilidade.map((item: any) => {
      const isRoteirizado = rotas.some(r => r.veiculoId === item.veiculoId && r.data === item.data);
      return {
        ...item,
        roteirizado: isRoteirizado,
        status_disponibilidade: isRoteirizado ? "ROTEIRIZADO" : "NÃO ROTEIRIZADO",
        unidadeId: item.unidadeId || item.unidade || "un-go",
      };
    });

    const filteredMDisps = mDisps.filter(filterUnit);

    // Active availability KPIs filtered
    const rangeDisps = filteredMDisps.filter(d => d.data >= currentRange.start && d.data <= currentRange.end);
    const disponibilizadosHoje = rangeDisps.length;
    const roteirizadosHoje = rangeDisps.filter(d => d.roteirizado).length;
    const naoUtilizadosHoje = Math.max(0, disponibilizadosHoje - roteirizadosHoje);
    const aproveitamentoHoje = disponibilizadosHoje > 0 ? Math.round((roteirizadosHoje / disponibilizadosHoje) * 100) : 0;

    const veiculosNaoRoteirizados = naoUtilizadosHoje;

    // Monthly default reference
    const activeMonth = currentRange.start.slice(0, 7);
    const activeYear = currentRange.start.slice(0, 4);

    const monthlyDisps = filteredMDisps.filter(d => d.data.startsWith(activeMonth));
    const disponibilizadosMes = monthlyDisps.length;
    const roteirizadosMes = monthlyDisps.filter(d => d.roteirizado).length;
    const aproveitamentoMes = disponibilizadosMes > 0 ? Math.round((roteirizadosMes / disponibilizadosMes) * 100) : 0;

    // Daily Grouping
    const dailyGroup: Record<string, { disp: number; rot: number }> = {};
    filteredMDisps.forEach((d) => {
      if (!dailyGroup[d.data]) dailyGroup[d.data] = { disp: 0, rot: 0 };
      dailyGroup[d.data].disp++;
      if (d.roteirizado) dailyGroup[d.data].rot++;
    });

    const sortedDatesStr = Object.keys(dailyGroup).sort().slice(-7);
    if (sortedDatesStr.length === 0) {
      sortedDatesStr.push("2026-06-11", "2026-06-12");
      dailyGroup["2026-06-11"] = { disp: 4, rot: 3 };
      dailyGroup["2026-06-12"] = { disp: 5, rot: 4 };
    }

    const aproveitamentoDiario = sortedDatesStr.map((dStr) => {
      const g = dailyGroup[dStr] || { disp: 0, rot: 0 };
      const rate = g.disp > 0 ? Math.round((g.rot / g.disp) * 100) : 0;
      const parts = dStr.split("-");
      const name = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
      return { 
        name, 
        "Aproveitamento %": rate, 
        "Disponibilizados": g.disp, 
        "Roteirizados": g.rot,
        "Ociosos": Math.max(0, g.disp - g.rot)
      };
    });

    // Monthly Grouping
    const monthlyGroup: Record<string, { disp: number; rot: number }> = {};
    filteredMDisps.forEach((d) => {
      const monthKey = d.data.slice(0, 7);
      if (!monthlyGroup[monthKey]) monthlyGroup[monthKey] = { disp: 0, rot: 0 };
      monthlyGroup[monthKey].disp++;
      if (d.roteirizado) monthlyGroup[monthKey].rot++;
    });
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    if (!monthlyGroup[activeMonth]) {
      monthlyGroup[activeMonth] = { disp: disponibilizadosMes || 6, rot: roteirizadosMes || 5 };
    }
    const aproveitamentoMensalMap = Object.keys(monthlyGroup).sort().map((mKey) => {
      const g = monthlyGroup[mKey];
      const rate = g.disp > 0 ? Math.round((g.rot / g.disp) * 100) : 0;
      const monthPart = parseInt(mKey.split("-")[1], 10);
      const name = monthNames[monthPart - 1] || mKey;
      return { name, "Aproveitamento %": rate, "Disponibilizados": g.disp, "Roteirizados": g.rot };
    });

    // Yearly Grouping
    const yearlyGroup: Record<string, { disp: number; rot: number }> = {};
    filteredMDisps.forEach((d) => {
      const yearKey = d.data.slice(0, 4);
      if (!yearlyGroup[yearKey]) yearlyGroup[yearKey] = { disp: 0, rot: 0 };
      yearlyGroup[yearKey].disp++;
      if (d.roteirizado) yearlyGroup[yearKey].rot++;
    });
    if (!yearlyGroup[activeYear]) {
      yearlyGroup[activeYear] = { disp: filteredMDisps.length || 10, rot: filteredMDisps.filter(d => d.roteirizado).length || 8 };
    }
    const aproveitamentoAnualMap = Object.keys(yearlyGroup).sort().map((yKey) => {
      const g = yearlyGroup[yKey];
      const rate = g.disp > 0 ? Math.round((g.rot / g.disp) * 100) : 0;
      return { name: yKey, "Aproveitamento %": rate, "Disponibilizados": g.disp, "Roteirizados": g.rot };
    });

    // Unit Grouping for master
    const unitGroup: Record<string, { disp: number; rot: number }> = {};
    mDisps.forEach((d: any) => {
      if (!unitGroup[d.unidadeId]) unitGroup[d.unidadeId] = { disp: 0, rot: 0 };
      unitGroup[d.unidadeId].disp++;
      if (d.roteirizado) unitGroup[d.unidadeId].rot++;
    });
    const aproveitamentoUnidadeMap = Object.keys(unitGroup).map((uId) => {
      const g = unitGroup[uId];
      const rate = g.disp > 0 ? Math.round((g.rot / g.disp) * 100) : 0;
      const uObj = unidades.find((u: any) => u.id === uId);
      const name = uObj ? uObj.nome : uId;
      return { name, "Aproveitamento %": rate, "Disponibilizados": g.disp, "Roteirizados": g.rot };
    }).sort((a, b) => b["Aproveitamento %"] - a["Aproveitamento %"]);

    // Idle vehicles list
    const veiculosOciososMap = sortedDatesStr.map((dStr) => {
      const g = dailyGroup[dStr] || { disp: 0, rot: 0 };
      const parts = dStr.split("-");
      const name = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
      return { name, Ociosos: Math.max(0, g.disp - g.rot) };
    });

    // Driver Leaderboards filtered by date range
    const activeRangeRotas = filteredRotasUnit.filter(r => r.data >= currentRange.start && r.data <= currentRange.end);
    const driversMap: Record<string, { nome: string; entregasRealizadas: number; devolucoes: number; rotas: number; produtividade: number }> = {};
    
    activeRangeRotas.forEach((r) => {
      const motObj = motoristas.find(m => m.id === r.motoristaId);
      if (!motObj) return;

      if (!driversMap[r.motoristaId]) {
        driversMap[r.motoristaId] = {
          nome: motObj.nome,
          entregasRealizadas: 0,
          devolucoes: 0,
          rotas: 0,
          produtividade: 0,
        };
      }
      driversMap[r.motoristaId].entregasRealizadas += r.entregues;
      driversMap[r.motoristaId].devolucoes += r.devolucoes;
      driversMap[r.motoristaId].rotas += 1;
    });

    const driversList = Object.values(driversMap).map((d) => {
      const tot = d.entregasRealizadas + d.devolucoes;
      const rate = tot > 0 ? Math.round((d.entregasRealizadas / tot) * 100) : 0;
      return { ...d, produtividade: rate };
    }).sort((a, b) => b.entregasRealizadas - a.entregasRealizadas || b.produtividade - a.produtividade);

    // ----------------------------------------------------
    // DYNAMIC CHART GENERATOR (REAL & ACCURATE)
    // ----------------------------------------------------
    let chartPeriodData: Array<{ name: string; Entregas: number; Devolucoes: number }> = [];

    if (activePeriod === "Dia") {
      // For single day, show hourly trend or show previous 7 days trend leading up to this day
      const targetDateObj = new Date(currentRange.start + "T12:00:00");
      for (let i = 6; i >= 0; i--) {
        const d = new Date(targetDateObj);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split("T")[0];
        const dayRotas = filteredRotasUnit.filter(r => r.data === dStr);
        let delivered = 0;
        let returns = 0;
        dayRotas.forEach(r => {
          delivered += r.entregues;
          returns += r.devolucoes;
        });
        const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        chartPeriodData.push({
          name: i === 0 ? `Hoje (${d.getDate()}/${d.getMonth() + 1})` : `${weekdayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`,
          Entregas: delivered,
          Devolucoes: returns
        });
      }
    } else if (activePeriod === "Semana" || activePeriod === "Personalizado") {
      // Group each single day in the selection
      const startD = new Date(currentRange.start + "T12:00:00");
      const endD = new Date(currentRange.end + "T12:00:00");
      let curr = new Date(startD);
      let limitCount = 0;
      const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      while (curr <= endD && limitCount < 32) {
        const dStr = curr.toISOString().split("T")[0];
        const dayRotas = filteredRotasUnit.filter(r => r.data === dStr);
        let delivered = 0;
        let returns = 0;
        dayRotas.forEach(r => {
          delivered += r.entregues;
          returns += r.devolucoes;
        });
        chartPeriodData.push({
          name: `${weekdayNames[curr.getDay()]} ${curr.getDate()}/${curr.getMonth() + 1}`,
          Entregas: delivered,
          Devolucoes: returns
        });
        curr.setDate(curr.getDate() + 1);
        limitCount++;
      }
    } else if (activePeriod === "Mês") {
      // Group by Week of that month
      for (let w = 1; w <= 5; w++) {
        // Simple 7-day windows in month
        const dayStart = (w - 1) * 7 + 1;
        const dayEnd = Math.min(31, w * 7);
        const mn = currentRange.start.slice(5, 7);
        const yr = currentRange.start.slice(0, 4);
        
        let delivered = 0;
        let returns = 0;
        
        for (let d = dayStart; d <= dayEnd; d++) {
          const dStr = `${yr}-${mn}-${String(d).padStart(2, "0")}`;
          const dayRotas = filteredRotasUnit.filter(r => r.data === dStr);
          dayRotas.forEach(r => {
            delivered += r.entregues;
            returns += r.devolucoes;
          });
        }
        
        chartPeriodData.push({
          name: `Semana ${w}`,
          Entregas: delivered,
          Devolucoes: returns
        });
      }
    } else if (activePeriod === "Ano") {
      // Group by Month (Jan to Dec)
      const yr = currentRange.start.slice(0, 4);
      const mNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      for (let m = 1; m <= 12; m++) {
        const prefix = `${yr}-${String(m).padStart(2, "0")}`;
        const monthRotas = filteredRotasUnit.filter(r => r.data.startsWith(prefix));
        let delivered = 0;
        let returns = 0;
        monthRotas.forEach(r => {
          delivered += r.entregues;
          returns += r.devolucoes;
        });
        chartPeriodData.push({
          name: mNames[m - 1],
          Entregas: delivered,
          Devolucoes: returns
        });
      }
    }

    // Driver pool details
    const totalMot = filteredMotoristas.length;
    const libMot = filteredMotoristas.filter(m => m.statusFinal === "LIBERADO").length;
    const penMot = filteredMotoristas.filter(m => m.statusFinal === "PENDENTE").length;
    const bloqMot = filteredMotoristas.filter(m => m.statusFinal === "BLOQUEADO").length;
    const rateCompliance = totalMot > 0 ? Math.round((libMot / totalMot) * 100) : 100;

    // ----------------------------------------------------
    // CORPORATE DT CLOSURES & VALES ANALYTICS
    // ----------------------------------------------------
    const vales = FileDatabase.get("vales") as any[] || [];
    const fechamentos_dt = FileDatabase.get("fechamentos_dt") as any[] || [];

    const filteredVales = vales.filter(filterUnit);
    const filteredClosures = fechamentos_dt.filter(c => {
      if (filteredUnitId === "Todas") return true;
      return c.unidadeId === filteredUnitId;
    });

    const totalValorVales = filteredVales.reduce((sum, v) => sum + Number(v.valor || 0), 0);

    let totalQuantidadeFaltas = 0;
    filteredClosures.forEach(c => {
      const occurrencesList = c.ocorrencias || [];
      occurrencesList.forEach((occ: any) => {
        if (occ.tipo === "Falta de Mercadoria") {
          totalQuantidadeFaltas += Number(occ.quantidade || 0);
        }
      });
    });

    const driverValesMap: Record<string, { name: string; count: number; valor: number }> = {};
    filteredVales.forEach(v => {
      const motObj = motoristas.find(m => m.id === v.motoristaId);
      const name = motObj ? motObj.nome : "Motorista Terceiro";
      if (!driverValesMap[v.motoristaId]) {
        driverValesMap[v.motoristaId] = { name, count: 0, valor: 0 };
      }
      driverValesMap[v.motoristaId].count++;
      driverValesMap[v.motoristaId].valor += Number(v.valor || 0);
    });
    const topMotoristasVales = Object.values(driverValesMap)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    const unitValesMap: Record<string, { name: string; count: number; valor: number }> = {};
    filteredVales.forEach(v => {
      const uObj = unidades.find((u: any) => u.id === v.unidadeId);
      const name = uObj ? uObj.nome : "Filial";
      if (!unitValesMap[v.unidadeId]) {
        unitValesMap[v.unidadeId] = { name, count: 0, valor: 0 };
      }
      unitValesMap[v.unidadeId].count++;
      unitValesMap[v.unidadeId].valor += Number(v.valor || 0);
    });
    const topUnidadesVales = Object.values(unitValesMap)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    const monthlyValesMap: Record<string, number> = {};
    const mNamesShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Seed standard months under current year
    const currentYearNum = 2026;
    for (let m = 1; m <= 6; m++) {
      const key = `${currentYearNum}-${String(m).padStart(2, "0")}`;
      monthlyValesMap[key] = 0;
    }

    filteredVales.forEach(v => {
      if (v.data) {
        const monthKey = v.data.slice(0, 7);
        monthlyValesMap[monthKey] = (monthlyValesMap[monthKey] || 0) + Number(v.valor || 0);
      }
    });

    const evolucaoMensalVales = Object.entries(monthlyValesMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, valor]) => {
        const parts = key.split("-");
        const monthIndex = parseInt(parts[1], 10) - 1;
        const name = `${mNamesShort[monthIndex] || parts[1]}/${parts[0].slice(2)}`;
        return { name, valor };
      });

    const dtsWithOccurrencesCount = filteredClosures.filter(c => (c.ocorrencias || []).length > 0).length;
    const totalDtsInPeriodCount = filteredRotasUnit.length;
    const indiceOcorrenciasPorDt = totalDtsInPeriodCount > 0 
      ? Math.round((dtsWithOccurrencesCount / totalDtsInPeriodCount) * 100)
      : (filteredClosures.length > 0 ? Math.round((dtsWithOccurrencesCount / filteredClosures.length) * 100) : 0);

    const totalDtsFechadas = filteredClosures.length;
    const totalDtsFechadasSemVale = filteredClosures.filter(c => c.statusFechamento === "Fechada Sem Vale" || (!c.statusFechamento && (c.ocorrencias || []).length === 0)).length;
    const totalDtsFechadasComVale = filteredClosures.filter(c => c.statusFechamento === "Fechada Com Vale" || (!c.statusFechamento && (c.ocorrencias || []).some((occ: any) => occ.tipo === "Falta de Mercadoria"))).length;
    const totalDtsComDevolucao = filteredClosures.filter(c => c.statusFechamento === "Fechada Com Devolução" || c.houveDevolucao === "Sim" || c.houveDevolucao === true || (!c.statusFechamento && (c.ocorrencias || []).some((occ: any) => occ.tipo === "Devolução"))).length;

    res.json({
      cards: {
        entregasPrevistas: currentStats.entregasPrevistas,
        entregasRealizadas: currentStats.entregasRealizadas,
        entregasPendentes: currentStats.entregasPendentes,
        reentregas: currentStats.reentregas,
        recargas: currentStats.recargas,
        devolucoes: currentStats.devolucoes,
        rotasFinalizadas: currentStats.rotasFinalizadas,
        rotasEmAndamento: currentStats.rotasEmAndamento,
        veiculosEmRota,
        veiculosDisponiveis,
        veiculosIndisponiveis,
        veiculosNaoRoteirizados,
        motoristasAtivos: libMot,
        motoristasTotal: totalMot,
        motoristasPendentes: penMot,
        motoristasBloqueados: bloqMot,
        motoristasConformidade: rateCompliance,
        viagensEmRota: currentStats.viagensEmRota,
        viagensEmCarregamento: currentStats.viagensEmCarregamento,
        viagensAgDescarga: currentStats.viagensAgDescarga,
        viagensFinalizadas: currentStats.viagensFinalizadas,
        viagensAgCarregamento: currentStats.viagensAgCarregamento,
        viagensCanceladas: currentStats.viagensCanceladas,
        viagensVeiculoQuebrado: currentStats.viagensVeiculoQuebrado,
      },
      previousCards: previousStats,
      rangeAnalyzed: {
        start: currentRange.start,
        end: currentRange.end,
        label: activePeriod === "Dia" ? `Dia ${currentRange.start.split("-").reverse().join("/")}` :
               activePeriod === "Semana" ? `${currentRange.start.split("-").reverse().join("/")} até ${currentRange.end.split("-").reverse().join("/")}` :
               activePeriod === "Mês" ? `Competência ${monthNames[parseInt(currentRange.start.split("-")[1]) - 1]} de ${currentRange.start.split("-")[0]}` :
               activePeriod === "Ano" ? `Exercício ${currentRange.start.split("-")[0]}` :
               `${currentRange.start.split("-").reverse().join("/")} até ${currentRange.end.split("-").reverse().join("/")}`
      },
      ranking: driversList,
      dadosGraficoPeriodo: chartPeriodData,
      disponibilidadeKpis: {
        disponibilizadosHoje,
        roteirizadosHoje,
        naoUtilizadosHoje,
        aproveitamentoHoje,
        disponibilizadosMes,
        roteirizadosMes,
        aproveitamentoMes,
        aproveitamentoDiario,
        aproveitamentoMensal: aproveitamentoMensalMap,
        aproveitamentoAnual: aproveitamentoAnualMap,
        aproveitamentoUnidade: aproveitamentoUnidadeMap,
        veiculosOciosos: veiculosOciososMap
      },
      valesKpis: {
        totalValorVales,
        totalQuantidadeFaltas,
        topMotoristasVales,
        topUnidadesVales,
        evolucaoMensalVales,
        indiceOcorrenciasPorDt,
        totalDtsFechadas,
        totalDtsFechadasSemVale,
        totalDtsFechadasComVale,
        totalDtsComDevolucao
      }
    });
  });

  // ----------------------------------------------------
  // ----------------------------------------------------
  // UNIDADES API
  // ----------------------------------------------------
  app.get("/api/unidades", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const list = FileDatabase.get("unidades") as Unidade[];
    const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
    const authUnits = getAuthorizedUnitsForUser(user);
    
    // Non-masters only see active and authorized units
    if (!isMaster) {
      return res.json(list.filter(u => u.status !== "inativo" && authUnits.includes(u.id)));
    }
    
    // Masters see all units for administrative purposes
    res.json(list);
  });

  app.post("/api/unidades", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente usuários MASTER podem cadastrar novas unidades." });
    }

    const { nome, codigo, cidade, estado, endereco, status, supervisor, usuarioResponsavel } = req.body;
    if (!nome || !cidade || !estado) {
      return res.status(400).json({ error: "Nome, cidade e estado são obrigatórios." });
    }

    const finalCodigo = (codigo && codigo.trim()) || `UN-${nome.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "FIL"}-${Math.floor(100 + Math.random() * 900)}`;
    const finalEndereco = (endereco && endereco.trim()) || `Área de Carga e Descarga Geral, s/n - ${cidade} - ${estado}`;

    // Auto-generate unit ID based on slug of name
    const sanitizedName = nome.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const unitId = `un-${sanitizedName}-${Date.now().toString().slice(-4)}`;

    const newUnit: Unidade = {
      id: unitId,
      nome,
      codigo: finalCodigo,
      cidade,
      estado,
      endereco: finalEndereco,
      status: status || "ativo",
      supervisor: supervisor || "Supervisor",
      usuarioResponsavel: usuarioResponsavel || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const operator = user.email;
    const added = FileDatabase.add("unidades", newUnit, operator);

    // Auto User Creation for supervisor
    const supervisorName = supervisor || "Supervisor";
    const tempUsername = usuarioResponsavel || `${supervisorName.toLowerCase().replace(/[^a-z]/g, "")}.${estado.toLowerCase()}`;
    const tempPassword = `${supervisorName.charAt(0).toUpperCase()}${supervisorName.slice(1)}@2026`;

    const generatedSupervisor: Usuario = {
      id: `usr-${tempUsername}`,
      email: tempUsername,
      nome: `${supervisorName} (${nome})`,
      perfil: "admin_unidade",
      unidadeId: unitId,
      status: "ativo",
      senha: tempPassword,
      deveAlterarSenha: true,
      supervisor: supervisorName,
      unidade_id: unitId,
      tipo_usuario: "SUPERVISOR",
      cargo: "Supervisor de Filial"
    };

    FileDatabase.add("usuarios", generatedSupervisor, operator);

    // Auto Seed EPI Stock for this specific unit
    const db = FileDatabase.getFull();
    const defaultTemplateStock = [
      { id: `botina-${unitId}`, nome: "Botina de Segurança", saldo: 0, unidadeId: unitId },
      { id: `casquete-${unitId}`, nome: "Casquete", saldo: 0, unidadeId: unitId },
      { id: `capa-chuva-${unitId}`, nome: "Capa de Chuva", saldo: 0, unidadeId: unitId },
      { id: `luvas-${unitId}`, nome: "Luvas de Vaqueta/Grip", saldo: 0, unidadeId: unitId },
      { id: `cones-${unitId}`, nome: "Cones de Sinalização", saldo: 0, unidadeId: unitId },
      { id: `calcos-${unitId}`, nome: "Calços de Pneu", saldo: 0, unidadeId: unitId },
      { id: `oculos-${unitId}`, nome: "Óculos de Proteção", saldo: 0, unidadeId: unitId },
      { id: `colete-${unitId}`, nome: "Colete Refletivo", saldo: 0, unidadeId: unitId },
      { id: `mangote-${unitId}`, nome: "Mangote Anticorte", saldo: 0, unidadeId: unitId },
    ];
    db.estoque_epi = [...(db.estoque_epi || []), ...defaultTemplateStock];
    FileDatabase.set("estoque_epi", db.estoque_epi);

    logAudit(req, user.nome, "CADASTRO_UNIDADE", `Criou Unidade Comercial ${nome} (Código: ${codigo})`, unitId);
    res.json({ success: true, added, generatedUser: generatedSupervisor });
  });

  app.put("/api/unidades/:id", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente administradores MASTER podem alterar unidades." });
    }
    const { id } = req.params;
    const { nome, codigo, cidade, estado, endereco, status, supervisor, usuarioResponsavel } = req.body;

    const list = FileDatabase.get("unidades") as Unidade[];
    const idx = list.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Unidade não localizada." });
    }

    const updated: any = { updated_at: new Date().toISOString() };
    if (nome) updated.nome = nome;
    if (codigo) updated.codigo = codigo;
    if (cidade) updated.cidade = cidade;
    if (estado) updated.estado = estado;
    if (endereco) updated.endereco = endereco;
    if (status) updated.status = status;
    if (supervisor !== undefined) updated.supervisor = supervisor;
    if (usuarioResponsavel !== undefined) updated.usuarioResponsavel = usuarioResponsavel;

    FileDatabase.update("unidades", id, updated, user.email);

    // Sync or Auto-Create Supervisor User associated with this unit
    if (supervisor !== undefined || usuarioResponsavel !== undefined) {
      const users = FileDatabase.get("usuarios") as any[];
      const unit = list[idx];
      const finalUnitName = nome || unit.nome;
      const finalSupervisor = supervisor !== undefined ? supervisor : (unit.supervisor || "Supervisor");
      const finalUsuarioResponsavel = usuarioResponsavel !== undefined ? usuarioResponsavel : (unit.usuarioResponsavel || "");

      if (finalUsuarioResponsavel) {
        // Find existing supervisor user for this unit
        const existingUser = users.find(u => u.unidadeId === id && (u.perfil === "admin_unidade" || u.tipo_usuario === "SUPERVISOR"));
        
        if (existingUser) {
          // Update the existing user account
          const fieldsToUpdate = {
            email: finalUsuarioResponsavel,
            nome: `${finalSupervisor} (${finalUnitName})`,
            supervisor: finalSupervisor
          };
          FileDatabase.update("usuarios", existingUser.id, fieldsToUpdate, user.email);
        } else {
          // Create new user account since none was found
          const firstPart = finalSupervisor.split(" ")[0];
          const tempPassword = `${firstPart.charAt(0).toUpperCase()}${firstPart.replace(/[^a-zA-Z]/g, "").slice(1)}@2026` || "Supervisor@2026";
          const newUser: any = {
            id: `usr-${finalUsuarioResponsavel}`,
            email: finalUsuarioResponsavel,
            nome: `${finalSupervisor} (${finalUnitName})`,
            perfil: "admin_unidade",
            unidadeId: id,
            status: "ativo",
            senha: tempPassword,
            deveAlterarSenha: true,
            supervisor: finalSupervisor,
            unidade_id: id,
            tipo_usuario: "SUPERVISOR",
            cargo: "Supervisor de Filial"
          };
          FileDatabase.add("usuarios", newUser, user.email);
        }
      }
    }

    logAudit(req, user.nome, "ALTERACAO_DADOS", `Modificou dados da unidade ${nome || id} (Status: ${status || "N/A"})`, id);
    res.json({ success: true });
  });

  app.delete("/api/unidades/:id", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente usuários de perfil MASTER podem inativar unidades." });
    }

    const { id } = req.params;
    const operator = user.email;

    // Soft delete / inactivation to protect data relationships (Rule 8)
    const list = FileDatabase.get("unidades") as Unidade[];
    const target = list.find(u => u.id === id);
    if (!target) {
      return res.status(404).json({ error: "Unidade não localizada." });
    }

    FileDatabase.update("unidades", id, { status: "inativo" }, operator);
    logAudit(req, user.nome, "EXCLUSAO_UNIDADE", `Inativou/Desabilitou o acesso à unidade ${target.nome} (ID: ${id})`, id);
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // USUARIOS & PERMISSOES API
  // ----------------------------------------------------
  app.get("/api/usuarios", (req, res) => {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ error: "Não autorizado" });
    }
    const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
    const usuarios = FileDatabase.get("usuarios") as Usuario[];
    const permissoes = FileDatabase.get("usuario_unidade_permissao") as UsuarioUnidadePermissao[];
    
    let filteredUsers = usuarios;
    if (!isMaster) {
      // Get all unit IDs current user is authorized to access
      const allowedUnits = [
        user.unidadeId,
        user.unidade_id,
        ...permissoes.filter(p => p.usuario_id === user.id && p.ativo).map(p => p.unidade_id)
      ].filter(Boolean);
      
      filteredUsers = usuarios.filter(u => {
        const uUnit = u.unidadeId || u.unidade_id;
        return uUnit && allowedUnits.includes(uUnit);
      });
    }
    
    const mapped = filteredUsers.map(u => {
      const activePerms = permissoes
        .filter(p => p.usuario_id === u.id && p.ativo)
        .map(p => p.unidade_id);
      return {
        ...u,
        unidadesPermitidas: activePerms
      };
    });
    res.json(mapped);
  });

  app.get("/api/processos-participantes-disponiveis", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const usuarios = FileDatabase.get("usuarios") as Usuario[];
    const activeUsers = usuarios.filter(u => u.status !== "inativo");
    res.json(activeUsers);
  });

  app.post("/api/usuarios", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente administradores MASTER podem criar usuários." });
    }
    const { email, nome, tipo_usuario, unidade_id, status, senha, unidadesPermitidas, cpf, telefone, cargo, permissions } = req.body;
    if (!email || !nome || !senha || !unidade_id || !tipo_usuario) {
      return res.status(400).json({ error: "Usuário, nome, senha, tipo de usuário e unidade de referência são obrigatórios." });
    }
    
    const currentUsers = FileDatabase.get("usuarios") as Usuario[];
    if (currentUsers.some(u => u.email.toLowerCase() === email.toLowerCase() || u.id === `usr-${email.toLowerCase()}`)) {
      return res.status(400).json({ error: "E-mail ou Usuário já cadastrado." });
    }

    // Map new tipo_usuario to classic perfil to maintain backward compatibility
    let calculatedPerfil: "admin_master" | "admin_unidade" | "operador" = "operador";
    if (tipo_usuario === "MASTER") {
      calculatedPerfil = "admin_master";
    } else if (tipo_usuario === "SUPERVISOR") {
      calculatedPerfil = "admin_unidade";
    }

    const newUser: Usuario = {
      id: `usr-${email.split('@')[0].toLowerCase()}`,
      email: email.trim(),
      nome: nome.trim(),
      perfil: calculatedPerfil,
      unidadeId: unidade_id, // Unidade principal de referência
      status: status || "ativo",
      senha: senha,
      deveAlterarSenha: false,
      
      // New compliance fields
      unidade_id,
      tipo_usuario,
      cpf: cpf || "",
      telefone: telefone || "",
      cargo: cargo || "",
      permissions: permissions || {},
    };

    FileDatabase.add("usuarios", newUser, user.email);

    if (Array.isArray(unidadesPermitidas)) {
      const permissoes = FileDatabase.get("usuario_unidade_permissao") as UsuarioUnidadePermissao[];
      unidadesPermitidas.forEach(uId => {
        permissoes.push({
          id: `uup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          usuario_id: newUser.id,
          unidade_id: uId,
          ativo: true,
          created_at: new Date().toISOString()
        });
      });
      FileDatabase.set("usuario_unidade_permissao", permissoes);
    }

    logAudit(req, user.nome, "CADASTRO_USUARIO", `Cadastrou usuário: ${newUser.nome} (${newUser.email}) - Tipo: ${tipo_usuario}`, user.unidadeId);
    res.json({ success: true, user: newUser });
  });

  app.put("/api/usuarios/:id", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente administradores MASTER podem editar usuários." });
    }
    const { id } = req.params;
    const { nome, tipo_usuario, unidade_id, status, senha, unidadesPermitidas, cpf, telefone, cargo, permissions } = req.body;
    
    const currentUsers = FileDatabase.get("usuarios") as Usuario[];
    const targetIdx = currentUsers.findIndex(u => u.id === id || (u.id && u.id.toLowerCase() === id.toLowerCase()));
    if (targetIdx === -1) {
      return res.status(404).json({ error: "Usuário não localizado." });
    }

    // Map new tipo_usuario to classic perfil to maintain backward compatibility
    let calculatedPerfil: "admin_master" | "admin_unidade" | "operador" | undefined;
    if (tipo_usuario) {
      if (tipo_usuario === "MASTER") {
        calculatedPerfil = "admin_master";
      } else if (tipo_usuario === "SUPERVISOR") {
        calculatedPerfil = "admin_unidade";
      } else {
        calculatedPerfil = "operador";
      }
    }

    const updatedFields: any = {};
    if (nome) updatedFields.nome = nome.trim();
    if (tipo_usuario) {
      updatedFields.tipo_usuario = tipo_usuario;
      if (calculatedPerfil) updatedFields.perfil = calculatedPerfil;
    }
    if (unidade_id) {
      updatedFields.unidade_id = unidade_id;
      updatedFields.unidadeId = unidade_id;
    }
    if (status) updatedFields.status = status;
    if (senha) updatedFields.senha = senha;
    if (cpf !== undefined) updatedFields.cpf = cpf;
    if (telefone !== undefined) updatedFields.telefone = telefone;
    if (cargo !== undefined) updatedFields.cargo = cargo;
    if (permissions !== undefined) updatedFields.permissions = permissions;

    FileDatabase.update("usuarios", id, updatedFields, user.email);

    if (Array.isArray(unidadesPermitidas)) {
      let permissoes = FileDatabase.get("usuario_unidade_permissao") as UsuarioUnidadePermissao[];
      permissoes = permissoes.filter(p => p.usuario_id !== id);
      
      unidadesPermitidas.forEach(uId => {
        permissoes.push({
          id: `uup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          usuario_id: id,
          unidade_id: uId,
          ativo: true,
          created_at: new Date().toISOString()
        });
      });
      FileDatabase.set("usuario_unidade_permissao", permissoes);
    }

    logAudit(req, user.nome, "ALTERACAO_DADOS", `Alterou dados cadastrais do usuário ID ${id}: ${nome || ""}`, user.unidadeId);
    if (permissions !== undefined || unidadesPermitidas !== undefined) {
      logAudit(req, user.nome, "ALTERACAO_PERMISSOES", `Editou privilégios e permissões de acesso do usuário ID ${id}`, user.unidadeId);
    }

    res.json({ success: true });
  });

  app.delete("/api/usuarios/:id", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente administradores MASTER podem excluir usuários." });
    }
    const { id } = req.params;
    if (id === user.id) {
      return res.status(400).json({ error: "Você não pode se auto-excluir." });
    }
    
    const targetUser = (FileDatabase.get("usuarios") as Usuario[]).find(u => u.id === id || (u.id && u.id.toLowerCase() === id.toLowerCase()));
    if (!targetUser) {
      return res.status(404).json({ error: "Usuário não localizado no banco de dados." });
    }
    const targetName = targetUser.nome;

    if (targetUser.id === user.id) {
      return res.status(400).json({ error: "Você não pode se auto-excluir." });
    }

    const deleted = FileDatabase.delete("usuarios", targetUser.id, user.email);
    if (!deleted) {
      return res.status(500).json({ error: "Falha interna ao tentar excluir o registro do usuário." });
    }

    logAudit(req, user.nome, "EXCLUSAO_USUARIO", `Removeu permanentemente a conta de usuário: ${targetName} (ID: ${id})`, user.unidadeId);
    res.json({ success: true });
  });

  app.post("/api/logs/acesso-unidade", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const { unidadeId, unidadeNome } = req.body;
    if (!unidadeId) return res.status(400).json({ error: "Unidade é obrigatória" });

    const units = FileDatabase.get("unidades");
    const name = unidadeNome || units.find(u => u.id === unidadeId)?.nome || (unidadeId === "Todas" ? "Visão Consolidada" : unidadeId);

    logAudit(req, user.nome, "TROCA_UNIDADE", `Visualizou ou alterou para a unidade: ${name}`, unidadeId);
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // MOTORISTAS API
  // ----------------------------------------------------
  app.get("/api/motoristas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const list = FileDatabase.get("motoristas");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter(m => m.unidadeId === activeUnit));
  });

  app.post("/api/motoristas", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "x-user-email",
          message: "Usuário sem permissão de INSERT.",
          dbMessage: "Unauthorized: Request user credentials not found.",
          status: 401
        });
      }

      // Check if table "motoristas" is available in the memory database schema
      const tableExists = "motoristas" in FileDatabase.getFull();
      if (!tableExists) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "N/A",
          message: "Tabela motoristas não encontrada.",
          dbMessage: "Table 'motoristas' does not exist in DatabaseSchema context.",
          status: 500
        });
      }

      const item = req.body as Partial<Motorista>;
      const operator = user.email;

      // Enforce strict required fields
      if (!item.nome || !item.nome.trim()) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "nome",
          message: "Campo nome obrigatório.",
          dbMessage: "Column 'nome' cannot be null.",
          status: 400
        });
      }
      if (!item.cpf || !item.cpf.trim()) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "cpf",
          message: "Campo cpf obrigatório.",
          dbMessage: "Column 'cpf' cannot be null.",
          status: 400
        });
      }

      const finalUnidadeId = item.unidadeId || (user.perfil !== "admin_master" && user.unidadeId !== "Todas" ? user.unidadeId : null);
      if (!finalUnidadeId) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "unidadeId",
          message: "Campo unidadeId obrigatório.",
          dbMessage: "Constraint failure: Column 'unidadeId' is foreign key and cannot be null.",
          status: 400
        });
      }

      // Reject duplicate CPFs
      const list = FileDatabase.get("motoristas");
      const cleanCpfInput = item.cpf.replace(/\D/g, "");
      const duplicate = list.find(m => m.cpf.replace(/\D/g, "") === cleanCpfInput);
      if (duplicate) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "cpf",
          message: "Campo cpf duplicado.",
          dbMessage: `duplicate key value violates unique constraint "motoristas_cpf_key" (Key cpf=${item.cpf} already exists)`,
          status: 400
        });
      }

      if (user.perfil !== "admin_master") {
        item.unidadeId = user.unidadeId;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cnhDate = item.cnhVencimento ? new Date(item.cnhVencimento) : null;
      const asoDate = item.asoVencimento ? new Date(item.asoVencimento) : null;

      const isCnhExpired = cnhDate && cnhDate < today;
      const isAsoExpired = asoDate && asoDate < today;

      const allFeito =
        item.integracao === "Feito" &&
        item.pesquisa === "Feito" &&
        item.aso === "Feito" &&
        item.fichaEpi === "Feito";

      const hasPendente =
        item.integracao === "Pendente" ||
        item.pesquisa === "Pendente" ||
        item.aso === "Pendente" ||
        item.fichaEpi === "Pendente";

      if (isCnhExpired || isAsoExpired) {
        item.statusFinal = "BLOQUEADO";
      } else if (allFeito) {
        item.statusFinal = "LIBERADO";
      } else if (hasPendente) {
        item.statusFinal = "PENDENTE";
      } else {
        item.statusFinal = "BLOQUEADO";
      }

      const added = FileDatabase.add("motoristas", item, operator);
      res.json(added);
    } catch (err: any) {
      return handleApiError(res, {
        tableName: "motoristas",
        operation: "INSERT",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });

  app.put("/api/motoristas/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "UPDATE",
          errorField: "x-user-email",
          message: "Usuário sem permissão de UPDATE.",
          dbMessage: "Unauthorized: Request user credentials not found.",
          status: 401
        });
      }

      const item = req.body;
      const operator = user.email;

      const current = FileDatabase.get("motoristas").find(x => x.id === req.params.id);
      if (!current) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "UPDATE",
          errorField: "id",
          message: "Registro não encontrado.",
          dbMessage: `Record with id '${req.params.id}' was not found in table 'motoristas'.`,
          status: 404
        });
      }

      // Enforce isolation validation
      if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "UPDATE",
          errorField: "unidadeId",
          message: "Usuário sem permissão de UPDATE.",
          dbMessage: "Access denied. Operation requires admin privileges or matching unit.",
          status: 403
        });
      }

      if (item.nome !== undefined && (!item.nome || !item.nome.trim())) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "UPDATE",
          errorField: "nome",
          message: "Campo nome obrigatório.",
          dbMessage: "Column 'nome' cannot be null.",
          status: 400
        });
      }
      if (item.cpf !== undefined && (!item.cpf || !item.cpf.trim())) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "UPDATE",
          errorField: "cpf",
          message: "Campo cpf obrigatório.",
          dbMessage: "Column 'cpf' cannot be null.",
          status: 400
        });
      }

      // If CPF changed, check unique constraint duplication
      if (item.cpf !== undefined && item.cpf.trim() !== current.cpf.trim()) {
        const cleanCpfInput = item.cpf.replace(/\D/g, "");
        const list = FileDatabase.get("motoristas");
        const duplicate = list.find(m => m.id !== current.id && m.cpf.replace(/\D/g, "") === cleanCpfInput);
        if (duplicate) {
          return handleApiError(res, {
            tableName: "motoristas",
            operation: "UPDATE",
            errorField: "cpf",
            message: "Campo cpf duplicado.",
            dbMessage: `duplicate key value violates unique constraint "motoristas_cpf_key" (Key cpf=${item.cpf} already exists)`,
            status: 400
          });
        }
      }

      if (user.perfil !== "admin_master") {
        item.unidadeId = user.unidadeId;
      }

      const merged = { ...current, ...item };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cnhDate = merged.cnhVencimento ? new Date(merged.cnhVencimento) : null;
      const asoDate = merged.asoVencimento ? new Date(merged.asoVencimento) : null;

      const isCnhExpired = cnhDate && cnhDate < today;
      const isAsoExpired = asoDate && asoDate < today;

      const allFeito =
        merged.integracao === "Feito" &&
        merged.pesquisa === "Feito" &&
        merged.aso === "Feito" &&
        merged.fichaEpi === "Feito";

      const hasPendente =
        merged.integracao === "Pendente" ||
        merged.pesquisa === "Pendente" ||
        merged.aso === "Pendente" ||
        merged.fichaEpi === "Pendente";

      if (isCnhExpired || isAsoExpired) {
        item.statusFinal = "BLOQUEADO";
      } else if (allFeito) {
        item.statusFinal = "LIBERADO";
      } else if (hasPendente) {
        item.statusFinal = "PENDENTE";
      } else {
        item.statusFinal = "BLOQUEADO";
      }

      const updated = FileDatabase.update("motoristas", req.params.id, item, operator);
      res.json(updated);
    } catch (err: any) {
      return handleApiError(res, {
        tableName: "motoristas",
        operation: "UPDATE",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });

  app.delete("/api/motoristas/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "DELETE",
          errorField: "x-user-email",
          message: "Usuário sem permissão de DELETE.",
          dbMessage: "Unauthorized: Request user credentials not found.",
          status: 401
        });
      }

      const current = FileDatabase.get("motoristas").find(x => x.id === req.params.id);
      if (!current) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "DELETE",
          errorField: "id",
          message: "Registro não encontrado.",
          dbMessage: `Record with id '${req.params.id}' was not found in table 'motoristas'.`,
          status: 404
        });
      }

      if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "DELETE",
          errorField: "unidadeId",
          message: "Usuário sem permissão de DELETE.",
          dbMessage: "Access denied. Action requires appropriate unit context.",
          status: 403
        });
      }

      const operator = user.email;
      FileDatabase.delete("motoristas", req.params.id, operator);
      res.json({ success: true });
    } catch (err: any) {
      return handleApiError(res, {
        tableName: "motoristas",
        operation: "DELETE",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });

  // ----------------------------------------------------
  // VEICULOS API
  // ----------------------------------------------------
  app.get(["/api/veiculos", "/veiculos"], (req, res) => {
    const user = getRequestUser(req);
    res.setHeader("Content-Type", "application/json");
    if (!user) return res.status(401).json({ error: "Não autorizado", message: "Não autorizado" });
    const list = FileDatabase.get("veiculos");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter(v => v.unidadeId === activeUnit));
  });

  app.get(["/api/veiculos/:id", "/veiculos/:id"], (req, res) => {
    try {
      const user = getRequestUser(req);
      res.setHeader("Content-Type", "application/json");
      if (!user) return res.status(401).json({ success: false, message: "Não autorizado" });
      const current = FileDatabase.get("veiculos").find(x => x.id === req.params.id || (x.placa && x.placa === req.params.id));
      if (!current) {
        return res.status(404).json({ success: false, message: "Veículo não encontrado." });
      }
      if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
        return res.status(403).json({ success: false, message: "Usuário sem permissão." });
      }
      res.json(current);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "Erro interno" });
    }
  });

  app.post(["/api/veiculos", "/veiculos"], (req, res) => {
    console.log("VEICULO_SAVE_START");
    console.log("[BACKEND LOG] Dados recebidos no POST /api/veiculos:", JSON.stringify(req.body, null, 2));
    try {
      const user = getRequestUser(req);
      if (!user) {
        console.error("VEICULO_SAVE_ERROR - Usuário não autorizado ou nulo.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "x-user-email",
          message: "Usuário sem permissão de INSERT.",
          dbMessage: "Unauthorized: Session user credentials missing.",
          status: 401
        });
      }

      // Simulate vehicle table check to support unit tests/specifications
      const tableExists = "veiculos" in FileDatabase.getFull();
      if (!tableExists) {
        console.error("VEICULO_SAVE_ERROR - Tabela de veículos não encontrada.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "N/A",
          message: "Tabela veiculos não encontrada.",
          dbMessage: "Table 'veiculos' does not exist in DatabaseSchema context.",
          status: 500
        });
      }

      const item = req.body as Partial<Veiculo>;
      const operator = user.email;

      // Required fields checks for vehicles
      if (!item.placa || !item.placa.trim()) {
        console.error("VEICULO_SAVE_ERROR - Campo placa obrigatório.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "placa",
          message: "Campo placa obrigatório.",
          dbMessage: "Column 'placa' cannot be null.",
          status: 400
        });
      }
      if (!item.modelo || !item.modelo.trim()) {
        console.error("VEICULO_SAVE_ERROR - Campo modelo obrigatório.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "modelo",
          message: "Campo modelo obrigatório.",
          dbMessage: "Column 'modelo' cannot be null.",
          status: 400
        });
      }
      if (!item.perfil || !item.perfil.trim()) {
        console.error("VEICULO_SAVE_ERROR - Campo perfil obrigatório.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "perfil",
          message: "Campo perfil do veículo obrigatório.",
          dbMessage: "Column 'perfil' cannot be null.",
          status: 400
        });
      }
      if (!item.tipo || !item.tipo.trim()) {
        console.error("VEICULO_SAVE_ERROR - Campo tipo de frota obrigatório.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "tipo",
          message: "Campo tipo de frota obrigatório.",
          dbMessage: "Column 'tipo' cannot be null.",
          status: 400
        });
      }

      const finalUnidadeId = item.unidadeId || (user.perfil !== "admin_master" && user.unidadeId !== "Todas" ? user.unidadeId : null);
      if (!finalUnidadeId) {
        console.error("VEICULO_SAVE_ERROR - Campo unidadeId obrigatório.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "unidadeId",
          message: "Campo unidadeId obrigatório.",
          dbMessage: "Constraint failure: Column 'unidadeId' is foreign key and cannot be null.",
          status: 400
        });
      }

      // Standardize plate as the ID and uppercase plate representation
      const plateUpper = item.placa.toUpperCase().replace(/\s+/g, "").trim();
      item.placa = plateUpper;
      item.id = plateUpper;

      // Reject plate duplicates
      const list = FileDatabase.get("veiculos");
      const duplicate = list.find(v => v.placa.toUpperCase() === plateUpper || v.id.toUpperCase() === plateUpper);
      if (duplicate) {
        console.error("VEICULO_SAVE_ERROR - Campo placa duplicado.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "placa",
          message: "Campo placa duplicado.",
          dbMessage: `duplicate key value violates unique constraint "veiculos_placa_key" (Key placa=${plateUpper} already exists)`,
          status: 400
        });
      }

      if (user.perfil !== "admin_master" && user.unidadeId !== "Todas") {
        item.unidadeId = user.unidadeId;
      } else if (!item.unidadeId) {
        const firstUnitId = (FileDatabase.get("unidades") as any[])[0]?.id || "un-go";
        item.unidadeId = firstUnitId;
      }

      // Mandatory motorista vehicle check (backend side)
      if (item.motoristaId) {
        const driver = FileDatabase.get("motoristas").find(m => m.id === item.motoristaId);
        if (driver) {
          const conflicting = FileDatabase.get("veiculos").find(v => v.motoristaId === item.motoristaId);
          if (conflicting) {
            if (req.body.transferDriver || req.query.transferDriver === "true") {
              // Perform transfer - remove driver from old vehicle
              conflicting.motoristaId = "";
              FileDatabase.update("veiculos", conflicting.id, conflicting, operator);

              // Log transfer
              FileDatabase.logAudit(
                operator,
                "TRANSFERÊNCIA_MOTORISTA",
                `Transferiu: ${driver.nome} De: ${conflicting.placa} Para: ${item.placa || ""}`,
                item.unidadeId || conflicting.unidadeId || ""
              );
            } else {
              const conflictUnitObj = FileDatabase.get("unidades").find(u => u.id === conflicting.unidadeId);
              return res.status(400).json({
                success: false,
                conflict: true,
                message: "Motorista já vinculado",
                driverName: driver.nome,
                vehiclePlaca: conflicting.placa,
                vehiclePrefixo: conflicting.prefixo || `PR-${conflicting.placa.slice(-4)}`,
                vehicleModelo: conflicting.modelo,
                vehicleUnidade: conflictUnitObj ? conflictUnitObj.nome : `Filial ${conflicting.unidadeId}`,
                vehicleId: conflicting.id
              });
            }
          }
        }
      }

      if (item.status === "Bloqueado" && !item.motivoBloqueio) {
        item.motivoBloqueio = "Bloqueio operacional preventivo";
      } else if (item.status === "Liberado") {
        item.motivoBloqueio = "";
      }

      console.log("[BACKEND LOG] Enviando para o banco de dados (FileDatabase):", JSON.stringify(item, null, 2));
      const added = FileDatabase.add("veiculos", item, operator);
      
      console.log("VEICULO_SAVE_SUCCESS", JSON.stringify(added));
      res.setHeader("Content-Type", "application/json");
      res.json({
        success: true,
        message: "Veículo cadastrado com sucesso",
        data: added
      });
    } catch (err: any) {
      console.error("VEICULO_SAVE_ERROR - Erro imprevisto no backend:", err);
      return handleApiError(res, {
        tableName: "veiculos",
        operation: "INSERT",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });

  app.put(["/api/veiculos/:id", "/veiculos/:id"], (req, res) => {
    console.log("VEICULO_EDIT_START");
    console.log("ID recebido:", req.params.id);
    console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
    console.log("Endpoint utilizado: PUT /veiculos/:id ou /api/veiculos/:id");
    try {
      const user = getRequestUser(req);
      if (!user) {
        console.error("VEICULO_EDIT_ERROR - Usuário não autorizado.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "UPDATE",
          errorField: "x-user-email",
          message: "Usuário sem permissão.",
          dbMessage: "Unauthorized: Active session credentials missing.",
          status: 401
        });
      }

      const item = req.body;
      const operator = user.email;

      const current = FileDatabase.get("veiculos").find(x => x.id === req.params.id || (x.placa && x.placa === req.params.id));
      if (!current) {
        console.error(`VEICULO_EDIT_ERROR - Veículo com id ${req.params.id} não encontrado.`);
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "UPDATE",
          errorField: "id",
          message: "Veículo não encontrado.",
          dbMessage: `Record with id '${req.params.id}' was not found in table 'veiculos'.`,
          status: 404
        });
      }

      if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
        console.error("VEICULO_EDIT_ERROR - Permissão de UPDATE negada por unidade.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "UPDATE",
          errorField: "unidadeId",
          message: "Usuário sem permissão.",
          dbMessage: "Access denied. Operation requires administrative rights or matching unit.",
          status: 403
        });
      }

      if (item.placa !== undefined && (!item.placa || !item.placa.trim())) {
        console.error("VEICULO_EDIT_ERROR - Placa vazia.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "UPDATE",
          errorField: "placa",
          message: "ID inválido. Campo placa obrigatório.",
          dbMessage: "Column 'placa' cannot be null.",
          status: 400
        });
      }
      if (item.modelo !== undefined && (!item.modelo || !item.modelo.trim())) {
        console.error("VEICULO_EDIT_ERROR - Modelo vazio.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "UPDATE",
          errorField: "modelo",
          message: "Campo modelo obrigatório.",
          dbMessage: "Column 'modelo' cannot be null.",
          status: 400
        });
      }

      // Check plate duplicate if plaque was updated
      if (item.placa !== undefined) {
        const plateUpper = item.placa.toUpperCase().replace(/\s+/g, "").trim();
        if (plateUpper !== current.placa.toUpperCase()) {
          const list = FileDatabase.get("veiculos");
          const duplicate = list.find(v => v.id !== current.id && (v.placa.toUpperCase() === plateUpper || v.id.toUpperCase() === plateUpper));
          if (duplicate) {
            console.error("VEICULO_EDIT_ERROR - Placa duplicada.");
            return handleApiError(res, {
              tableName: "veiculos",
              operation: "UPDATE",
              errorField: "placa",
              message: "Campo placa duplicado.",
              dbMessage: `duplicate key value violates unique constraint "veiculos_placa_key" (Key placa=${plateUpper} already exists)`,
              status: 400
            });
          }
        }
      }

      if (user.perfil !== "admin_master") {
        item.unidadeId = user.unidadeId;
      } else if (!item.unidadeId) {
        item.unidadeId = current.unidadeId || "un-go";
      }

      // Mandatory motorista vehicle check (backend side)
      if (item.motoristaId) {
        const driver = FileDatabase.get("motoristas").find(m => m.id === item.motoristaId);
        if (driver) {
          const conflicting = FileDatabase.get("veiculos").find(v => v.motoristaId === item.motoristaId && v.id !== current.id);
          if (conflicting) {
            if (req.body.transferDriver || req.query.transferDriver === "true") {
              // Perform transfer - remove driver from old vehicle
              conflicting.motoristaId = "";
              FileDatabase.update("veiculos", conflicting.id, conflicting, operator);

              // Log transfer
              FileDatabase.logAudit(
                operator,
                "TRANSFERÊNCIA_MOTORISTA",
                `Transferiu: ${driver.nome} De: ${conflicting.placa} Para: ${item.placa || current.placa}`,
                item.unidadeId || current.unidadeId || conflicting.unidadeId || ""
              );
            } else {
              const conflictUnitObj = FileDatabase.get("unidades").find(u => u.id === conflicting.unidadeId);
              return res.status(400).json({
                success: false,
                conflict: true,
                message: "Motorista já vinculado",
                driverName: driver.nome,
                vehiclePlaca: conflicting.placa,
                vehiclePrefixo: conflicting.prefixo || `PR-${conflicting.placa.slice(-4)}`,
                vehicleModelo: conflicting.modelo,
                vehicleUnidade: conflictUnitObj ? conflictUnitObj.nome : `Filial ${conflicting.unidadeId}`,
                vehicleId: conflicting.id
              });
            }
          }
        }
      }

      if (item.status === "Liberado") {
        item.motivoBloqueio = "";
      }

      console.log("[BACKEND LOG] Enviando atualização de veículo para o banco:", JSON.stringify(item, null, 2));
      const updated = FileDatabase.update("veiculos", current.id, item, operator);
      
      console.log("VEICULO_EDIT_SUCCESS");
      console.log("Resultado da operação:", JSON.stringify(updated));
      res.setHeader("Content-Type", "application/json");
      res.json({
        success: true,
        message: "Veículo updated com sucesso",
        data: updated
      });
    } catch (err: any) {
      console.error("VEICULO_EDIT_ERROR - Falha imprevista no UPDATE:", err);
      return handleApiError(res, {
        tableName: "veiculos",
        operation: "UPDATE",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });

  app.post(["/api/veiculos/:id/remover-motorista", "/veiculos/:id/remover-motorista"], (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) {
        return res.status(401).json({ success: false, error: "Não autorizado" });
      }
      
      const current = FileDatabase.get("veiculos").find(v => v.id === req.params.id);
      if (!current) {
        return res.status(404).json({ success: false, error: "Veículo não encontrado" });
      }
      
      const motoristaId = current.motoristaId;
      let motoristaNome = "Motorista";
      if (motoristaId) {
        const motorista = FileDatabase.get("motoristas").find(m => m.id === motoristaId);
        if (motorista) motoristaNome = motorista.nome;
      }
      
      const oldPlaca = current.placa;
      current.motoristaId = ""; // Remover motorista
      
      const updated = FileDatabase.update("veiculos", current.id, current, user.email);
      
      FileDatabase.logAudit(
        user.email,
        "VÍNCULO_REMOVIDO",
        `Motorista ${motoristaNome} removido do veículo ${oldPlaca}`,
        current.unidadeId || ""
      );
      
      res.json({
        success: true,
        message: "Motorista removido do veículo com sucesso",
        data: updated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete(["/api/veiculos/:id", "/veiculos/:id"], (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) {
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "DELETE",
          errorField: "x-user-email",
          message: "Usuário sem permissão de DELETE.",
          dbMessage: "Unauthorized: Request credentials missing.",
          status: 401
        });
      }

      const current = FileDatabase.get("veiculos").find(x => x.id === req.params.id);
      if (!current) {
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "DELETE",
          errorField: "id",
          message: "Registro não encontrado.",
          dbMessage: `Record with plate ID '${req.params.id}' was not found in table 'veiculos'.`,
          status: 404
        });
      }

      if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "DELETE",
          errorField: "unidadeId",
          message: "Usuário sem permissão de DELETE.",
          dbMessage: "Access denied. Operation requires administrative privileges or matching unit.",
          status: 403
        });
      }

      const operator = user.email;
      FileDatabase.delete("veiculos", req.params.id, operator);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true, message: "Veículo removido com sucesso" });
    } catch (err: any) {
      return handleApiError(res, {
        tableName: "veiculos",
        operation: "DELETE",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });

  // ----------------------------------------------------
  // DISPONIBILIDADE API
  // ----------------------------------------------------
  app.get("/api/disponibilidade", (req, res) => {
    const { data, date, periodo, startDate, endDate, unidadeId, veiculoId, motoristaId } = req.query as any;
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const list = FileDatabase.get("disponibilidade_diaria") as any[];
    const rotas = FileDatabase.get("rotas");

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
    
    // Evaluate status dynamically in real-time
    let mappedList = list.map((item) => {
      const formDate = item.data_disponibilidade || item.data;
      const vehicleId = item.veiculo_id || item.veiculoId;
      const isRoteirizado = rotas.some(r => r.veiculoId === vehicleId && r.data === formDate);
      const uid = item.unidade_id || item.unidadeId || item.unidade || "un-go";
      return {
        id: item.id,
        data: formDate,
        data_disponibilidade: formDate,
        unidadeId: uid,
        unidade: uid,
        veiculoId: vehicleId,
        veiculo_id: vehicleId,
        motoristaId: item.motorista_id || item.motoristaId,
        motorista_id: item.motorista_id || item.motoristaId,
        prioridade: item.prioridade || "Média",
        roteirizado: isRoteirizado,
        status_disponibilidade: isRoteirizado ? "ROTEIRIZADO" : "NÃO ROTEIRIZADO",
        created_at: item.created_at || new Date().toISOString(),
        motivoOciosidade: item.motivoOciosidade || item.motivo_ociosidade || ""
      };
    }) as any[];

    // Unit filter (restricted according to privilege unless Master)
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit !== "Todas") {
      mappedList = mappedList.filter(d => d.unidade === activeUnit);
    } else if (unidadeId && unidadeId !== "Todas") {
      mappedList = mappedList.filter(d => d.unidade === unidadeId);
    }

    let refDate = date || data || "2026-06-12";
    if (refDate.includes("/")) {
      const pts = refDate.split("/");
      if (pts.length === 3) {
        refDate = `${pts[2]}-${pts[1]}-${pts[0]}`;
      } else if (pts.length === 2) {
        refDate = `${pts[1]}-${pts[0]}-01`;
      }
    }

    // Filter by Period
    if (periodo && periodo !== "Todas" && periodo !== "Personalizado" && periodo !== "Customizada") {
      if (periodo === "Dia") {
        mappedList = mappedList.filter(x => x.data === refDate || x.data_disponibilidade === refDate);
      } else if (periodo === "Semana") {
        const range = getWeekRange(refDate);
        mappedList = mappedList.filter(x => {
          const dVal = x.data_disponibilidade || x.data;
          return dVal >= range.start && dVal <= range.end;
        });
      } else if (periodo === "Mês") {
        const monthPrefix = refDate.slice(0, 7); // e.g. "2026-06"
        mappedList = mappedList.filter(x => {
          const dVal = x.data_disponibilidade || x.data;
          return dVal.startsWith(monthPrefix);
        });
      } else if (periodo === "Ano") {
        const yearPrefix = refDate.slice(0, 4); // YYYY eg "2026"
        mappedList = mappedList.filter(x => {
          const dVal = x.data_disponibilidade || x.data;
          return dVal.startsWith(yearPrefix);
        });
      }
    } else if (startDate && endDate) {
      mappedList = mappedList.filter(x => {
        const dVal = x.data_disponibilidade || x.data;
        return dVal >= startDate && dVal <= endDate;
      });
    } else if (date || data) {
      const checkDate = refDate;
      if (checkDate.length === 10) {
        mappedList = mappedList.filter(x => x.data === checkDate || x.data_disponibilidade === checkDate);
      } else if (checkDate.length === 7) {
        mappedList = mappedList.filter(x => x.data.startsWith(checkDate) || (x.data_disponibilidade && x.data_disponibilidade.startsWith(checkDate)));
      } else {
        mappedList = mappedList.filter(x => x.data.startsWith(checkDate) || (x.data_disponibilidade && x.data_disponibilidade.startsWith(checkDate)));
      }
    }

    // Filter by Vehicle ID
    if (veiculoId && veiculoId !== "Todos" && veiculoId !== "") {
      mappedList = mappedList.filter(x => x.veiculoId === veiculoId);
    }

    // Filter by Driver ID
    if (motoristaId && motoristaId !== "Todos" && motoristaId !== "") {
      mappedList = mappedList.filter(x => x.motoristaId === motoristaId);
    }

    res.json(mappedList);
  });

  app.post("/api/disponibilidade", (req, res) => {
    const disps = req.body as Array<any>;
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const operator = user.email;

    if (!Array.isArray(disps)) {
      return res.status(400).json({ error: "Payload deve ser uma lista" });
    }

    let current = (FileDatabase.get("disponibilidade") || []) as any[];
    let currentDiaria = (FileDatabase.get("disponibilidade_diaria") || []) as any[];
    const rotas = FileDatabase.get("rotas") || [];

    // Clean up previous declarations of that exact unit + date if matching, to handle checks cleanly
    const targetDate = disps[0]?.data || disps[0]?.data_disponibilidade;
    if (targetDate) {
      // Clean up for list of target units parsed dynamically to handle other units correctly
      const targetUnits = Array.from(new Set(disps.map(item => {
        return user.perfil !== "admin_master" ? user.unidadeId : (item.unidadeId || item.unidade_id || item.unidade || ((FileDatabase.get("unidades") as any[])[0]?.id || "un-go"));
      })));

      current = current.filter(x => !(x.data === targetDate && targetUnits.includes(x.unidadeId || x.unidade)));
      currentDiaria = currentDiaria.filter(x => !((x.data_disponibilidade === targetDate || x.data === targetDate) && targetUnits.includes(x.unidade_id)));
    }

    disps.forEach((item) => {
      const uId = user.perfil !== "admin_master" ? user.unidadeId : (item.unidadeId || item.unidade_id || item.unidade || ((FileDatabase.get("unidades") as any[])[0]?.id || "un-go"));
      const formDate = item.data || item.data_disponibilidade;
      const isRoteirizado = rotas.some(r => r.veiculoId === item.veiculoId && r.data === formDate);

      const dbRecord = {
        id: item.id || `disp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        data: formDate,
        data_disponibilidade: formDate,
        unidadeId: uId,
        unidade: uId,
        veiculoId: item.veiculoId || item.veiculo_id,
        veiculo_id: item.veiculoId || item.veiculo_id,
        motoristaId: item.motoristaId || item.motorista_id,
        motorista_id: item.motoristaId || item.motorista_id,
        prioridade: item.prioridade || "Média",
        roteirizado: isRoteirizado,
        status_disponibilidade: isRoteirizado ? "ROTEIRIZADO" : "NÃO ROTEIRIZADO",
        created_at: item.created_at || new Date().toISOString(),
        motivoOciosidade: item.motivoOciosidade || ""
      };

      const dbDiariaRecord = {
        id: dbRecord.id,
        data_disponibilidade: formDate,
        unidade_id: uId,
        veiculo_id: dbRecord.veiculoId,
        motorista_id: dbRecord.motoristaId,
        prioridade: dbRecord.prioridade,
        created_at: dbRecord.created_at,
        updated_at: new Date().toISOString(),
        motivoOciosidade: dbRecord.motivoOciosidade || ""
      };

      current.push(dbRecord);
      currentDiaria.push(dbDiariaRecord);
    });

    FileDatabase.set("disponibilidade", current);
    FileDatabase.set("disponibilidade_diaria", currentDiaria);

    logApiAction(operator, "DISPONIBILIDADE_SALVOS", `Controle de disponibilidade gravado (${disps.length} veículos).`);
    res.json({ success: true });
  });

  app.put("/api/disponibilidade/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const { id } = req.params;
    const fields = req.body; 

    // Sync snake_case too if applicable
    if (fields.motivoOciosidade !== undefined) {
      fields.motivo_ociosidade = fields.motivoOciosidade;
    }

    const updated = FileDatabase.update("disponibilidade", id, fields, user.email);
    if (updated) {
      // Sync to duplicate in daily schema if present
      const fieldsDiaria: any = {};
      if (fields.prioridade) fieldsDiaria.prioridade = fields.prioridade;
      if (fields.motoristaId || fields.motorista_id) fieldsDiaria.motorista_id = fields.motoristaId || fields.motorista_id;
      fieldsDiaria.updated_at = new Date().toISOString();
      FileDatabase.update("disponibilidade_diaria", id, fieldsDiaria, user.email);
      res.json({ success: true, item: updated });
    } else {
      res.status(404).json({ error: "Disponibilidade não encontrada" });
    }
  });

  // ----------------------------------------------------
  // ROTAS / MONITORAMENTO API
  // ----------------------------------------------------
  app.get("/api/rotas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const list = FileDatabase.get("rotas");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter(r => r.unidadeId === activeUnit));
  });

  app.post("/api/rotas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body as Rota;
    const operator = user.email;

    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }

    const allRoutes = FileDatabase.get("rotas") || [];
    const allOffs = FileDatabase.get("entregas_off") || [];
    const isRepeated = allRoutes.some((r: any) => r.dt === item.dt) || allOffs.some((e: any) => e.dt === item.dt);

    if (isRepeated && item.tipo !== "Reentrega") {
      return res.status(400).json({ error: "❌ DT EM DUPLICIDADE\nNão é possível salvar. Esta DT já está cadastrada no sistema." });
    }

    if (!item.status_viagem) {
      item.status_viagem = "Aguardando Carregamento";
    }

    // Sync status field for backwards compatibility
    const sv = item.status_viagem.trim().toLowerCase();
    if (sv === "aguardando carregamento" || sv === "ag. carregamento" || sv === "aguardando carga") {
      item.status = "Aguardando carregamento";
    } else if (sv === "em carregamento") {
      item.status = "Em carregamento";
    } else if (sv === "em rota" || sv === "em rota (entregando)") {
      item.status = "Em rota";
    } else if (sv === "aguardando descarga" || sv === "ag. descarga" || sv === "ag.descarga" || sv === "em descarga") {
      item.status = "Em descarga";
    } else if (sv === "finalizada") {
      item.status = "Finalizada";
    }

    // Setup history of travel status alterations
    const nowObj = new Date();
    const dStr = nowObj.toISOString().split("T")[0];
    const tStr = nowObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    item.historico_status = [
      {
        data: dStr,
        hora: tStr,
        status: item.status_viagem,
        usuario: operator
      }
    ];

    item.id = `DT-${item.dt}`;
    const added = FileDatabase.add("rotas", item, operator);

    // Auto update driver/vehicle routing state in availability
    const disps = FileDatabase.get("disponibilidade");
    const dIdx = disps.findIndex(d => d.veiculoId === item.veiculoId && d.data === item.data);
    if (dIdx !== -1) {
      disps[dIdx].roteirizado = true;
      FileDatabase.set("disponibilidade", disps);
    }

    res.json(added);
  });

  app.put("/api/rotas/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body;
    const operator = user.email;

    const current = FileDatabase.get("rotas").find(x => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "Rota não localizada" });

    if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Acesso negado para alteração de rotas." });
    }

    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }

    // Capture change logs for auditing
    const logAlteracoes = current.log_alteracoes || [];
    const changedFields: any[] = [];
    const dStr = new Date().toLocaleDateString("pt-BR");
    const tStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const getDriverName = (id: string) => {
      const dbDrivers = FileDatabase.get("motoristas") || [];
      const m = dbDrivers.find((x: any) => x.id === id);
      return m ? m.nome : (id || "N/D");
    };

    const getVehiclePlate = (id: string) => {
      const dbVehicles = FileDatabase.get("veiculos") || [];
      const v = dbVehicles.find((x: any) => x.id === id);
      return v ? v.placa : (id || "N/D");
    };

    const recordChange = (campo: string, antes: any, depois: any) => {
      if (antes !== depois && depois !== undefined) {
        changedFields.push({
          data: dStr,
          hora: tStr,
          usuario: user.nome || user.email,
          campo,
          antes: String(antes),
          depois: String(depois)
        });
      }
    };

    if (item.motoristaId !== undefined) {
      recordChange("Motorista", getDriverName(current.motoristaId), getDriverName(item.motoristaId));
    }
    if (item.veiculoId !== undefined) {
      recordChange("Veículo", getVehiclePlate(current.veiculoId), getVehiclePlate(item.veiculoId));
    }
    if (item.data !== undefined) {
      recordChange("Data de Saída", current.data || "", item.data);
    }
    if (item.dataPrevista !== undefined) {
      recordChange("Data Prevista", current.dataPrevista || "N/A", item.dataPrevista || "N/A");
    }
    if (item.status_viagem !== undefined) {
      recordChange("Status da Viagem", current.status_viagem || current.status || "", item.status_viagem);
    }
    if (item.totalEntregas !== undefined) {
      recordChange("Quantidade Prevista", current.totalEntregas ?? 0, item.totalEntregas ?? 0);
    }
    if (item.entregues !== undefined) {
      recordChange("Quantidade Entregue", current.entregues ?? 0, item.entregues ?? 0);
    }
    if (item.recusadas !== undefined) {
      recordChange("Quantidade Recusada", current.recusadas ?? 0, item.recusadas ?? 0);
    }
    if (item.devolucoes !== undefined) {
      recordChange("Quantidade Devolvida", current.devolucoes ?? 0, item.devolucoes ?? 0);
    }
    if (item.observacoes_operacionais !== undefined) {
      recordChange("Observações Operacionais", current.observacoes_operacionais || "Nenhuma", item.observacoes_operacionais || "Nenhuma");
    }

    if (changedFields.length > 0) {
      item.log_alteracoes = [...changedFields, ...logAlteracoes];
    }

    // Detect status_viagem alteration and append to historical log
    const newStatusViagem = item.status_viagem || (item.status ? item.status : undefined);
    if (newStatusViagem && newStatusViagem !== current.status_viagem) {
      item.status_viagem = newStatusViagem;

      // Sync status field for backwards compatibility
      const sv = newStatusViagem.trim().toLowerCase();
      if (sv === "aguardando carregamento" || sv === "ag. carregamento" || sv === "aguardando carga") {
        item.status = "Aguardando carregamento";
      } else if (sv === "em carregamento") {
        item.status = "Em carregamento";
      } else if (sv === "em rota" || sv === "em rota (entregando)") {
        item.status = "Em rota";
      } else if (sv === "aguardando descarga" || sv === "ag. descarga" || sv === "ag.descarga" || sv === "em descarga") {
        item.status = "Em descarga";
      } else if (sv === "finalizada") {
        item.status = "Finalizada";
      }

      const nowObj = new Date();
      const h_dStr = nowObj.toISOString().split("T")[0];
      const h_tStr = nowObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const currentHistory = current.historico_status || [];
      const updatedHistory = [...currentHistory, {
        data: h_dStr,
        hora: h_tStr,
        status: item.status_viagem,
        usuario: operator
      }];
      item.historico_status = updatedHistory;
    }

    const updated = FileDatabase.update("rotas", req.params.id, item, operator);
    res.json(updated);
  });

  app.post("/api/rotas/:id/ocorrencias", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const current = FileDatabase.get("rotas").find(x => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "DT não encontrada" });

    const { tipo, descricao, data, hora } = req.body;
    if (!tipo || !descricao) {
      return res.status(400).json({ error: "Tipo e descrição são obrigatórios." });
    }

    const nowObj = new Date();
    const dStr = data || nowObj.toLocaleDateString("pt-BR");
    const tStr = hora || nowObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const occItem = {
      id: "occ-" + Math.random().toString(36).substring(2, 9),
      tipo,
      descricao,
      data: dStr,
      hora: tStr,
      usuario: user.nome || user.email
    };

    const occList = current.ocorrencias || [];
    const updatedRoute = {
      ocorrencias: [occItem, ...occList]
    } as any;

    // Track as a change log
    const logAlteracoes = current.log_alteracoes || [];
    updatedRoute.log_alteracoes = [{
      data: dStr,
      hora: tStr,
      usuario: user.nome || user.email,
      campo: "Nova Ocorrência",
      antes: "-",
      depois: `[${tipo}] ${descricao}`
    }, ...logAlteracoes];

    const updated = FileDatabase.update("rotas", req.params.id, updatedRoute, user.email);
    res.json({ success: true, updated, occItem });
  });

  app.delete("/api/rotas/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const current = FileDatabase.get("rotas").find(x => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "Não encontrado" });

    if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const operator = user.email;
    FileDatabase.delete("rotas", req.params.id, operator);
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // NOTAS FISCAIS API
  // ----------------------------------------------------
  app.get("/api/notas-fiscais", (req, res) => {
    const { dtId } = req.query as { dtId?: string };
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const list = FileDatabase.get("notas_fiscais");
    const activeUnit = getRequestUnitContext(req, user);
    const filteredNfs = list.filter(nf => {
      if (activeUnit === "Todas") return true;
      const associatedRoute = FileDatabase.get("rotas").find(r => r.id === nf.dtId);
      return associatedRoute ? associatedRoute.unidadeId === activeUnit : false;
    });

    if (dtId) {
      return res.json(filteredNfs.filter((nf) => nf.dtId === dtId));
    }
    res.json(filteredNfs);
  });

  app.post("/api/notas-fiscais", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body;
    const operator = user.email;
    
    // Check if the route is valid for this user
    if (user.perfil !== "admin_master") {
      const associatedRoute = FileDatabase.get("rotas").find(r => r.id === item.dtId);
      if (associatedRoute && associatedRoute.unidadeId !== user.unidadeId) {
        return res.status(403).json({ error: "Não autorizado" });
      }
    }

    const added = FileDatabase.add("notas_fiscais", item, operator);
    res.json(added);
  });

  app.put("/api/notas-fiscais/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body;
    const operator = user.email;

    const current = FileDatabase.get("notas_fiscais").find(x => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "Não encontrado" });

    if (user.perfil !== "admin_master") {
      const associatedRoute = FileDatabase.get("rotas").find(r => r.id === current.dtId);
      if (associatedRoute && associatedRoute.unidadeId !== user.unidadeId) {
        return res.status(403).json({ error: "Não autorizado" });
      }
    }

    const updated = FileDatabase.update("notas_fiscais", req.params.id, item, operator);
    res.json(updated);
  });

  app.delete("/api/notas-fiscais/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const current = FileDatabase.get("notas_fiscais").find(x => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "Não encontrado" });

    if (user.perfil !== "admin_master") {
      const associatedRoute = FileDatabase.get("rotas").find(r => r.id === current.dtId);
      if (associatedRoute && associatedRoute.unidadeId !== user.unidadeId) {
        return res.status(403).json({ error: "Não autorizado" });
      }
    }

    const operator = user.email;
    FileDatabase.delete("notas_fiscais", req.params.id, operator);
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // ENTREGAS OFF API
  // ----------------------------------------------------
  app.get("/api/entregas-off", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    
    const list = FileDatabase.get("entregas_off") || [];
    const nfsList = FileDatabase.get("entregas_off_nfs" as any) || [];
    
    // Join Nfs to each EntregaOff
    const joined = list.map((e: any) => {
      const eNfs = nfsList.filter((nf: any) => nf.entrega_off_id === e.id);
      return {
        ...e,
        nfs: eNfs
      };
    });

    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(joined);
    res.json(joined.filter(e => e.unidadeId === activeUnit));
  });

  app.post("/api/entregas-off", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body;
    const operator = user.email;

    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    } else if (!item.unidadeId) {
      const firstUnitId = (FileDatabase.get("unidades") as any[])[0]?.id || "un-go";
      item.unidadeId = firstUnitId;
    }

    // DT duplication check
    const allRoutes = FileDatabase.get("rotas") || [];
    const allOffs = FileDatabase.get("entregas_off") || [];
    const isRepeated = allRoutes.some((r: any) => r.dt === item.dt) || allOffs.some((e: any) => e.dt === item.dt);
    const isReentrega = (item.tipo_operacao || "").toLowerCase().includes("reentrega");

    if (isRepeated && !isReentrega) {
      return res.status(400).json({ error: "❌ DT EM DUPLICIDADE\nNão é possível salvar. Esta DT já está cadastrada no sistema." });
    }

    // Isolate the Nfs array from the item
    const nfsToSave = item.nfs || [];
    delete item.nfs;

    // Save the main record
    const added = FileDatabase.add("entregas_off", item, operator);

    // Save Nfs individually in the database
    if (Array.isArray(nfsToSave) && nfsToSave.length > 0) {
      const currentNfs = FileDatabase.get("entregas_off_nfs" as any) || [];
      nfsToSave.forEach((nf: any) => {
        const nfItem = {
          id: `nf-off-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          entrega_off_id: added.id,
          numero_nf: nf.numero_nf,
          valor_nf: Number(nf.valor_nf)
        };
        currentNfs.push(nfItem);
      });
      FileDatabase.set("entregas_off_nfs" as any, currentNfs);
    }

    // Return the response with Joined Nfs
    const finalAdded = {
      ...added,
      nfs: FileDatabase.get("entregas_off_nfs" as any).filter((nf: any) => nf.entrega_off_id === added.id)
    };

    res.json(finalAdded);
  });

  app.delete("/api/entregas-off/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const operator = user.email;

    // Remove Nfs individually
    const nfsList = FileDatabase.get("entregas_off_nfs" as any) || [];
    const filteredNfs = nfsList.filter((nf: any) => nf.entrega_off_id !== req.params.id);
    FileDatabase.set("entregas_off_nfs" as any, filteredNfs);

    // Remove main record
    const deleted = FileDatabase.delete("entregas_off", req.params.id, operator);
    res.json({ success: deleted });
  });

  app.put("/api/entregas-off/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body;
    const operator = user.email;

    const current = FileDatabase.get("entregas_off").find(x => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "Entrega Off-Route não localizada" });

    if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Acesso negado para alteração de entregas off-route." });
    }

    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }

    // Capture change logs for auditing
    const logAlteracoes = current.log_alteracoes || [];
    const changedFields: any[] = [];
    const dStr = new Date().toLocaleDateString("pt-BR");
    const tStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const getDriverName = (id: string) => {
      const dbDrivers = FileDatabase.get("motoristas") || [];
      const m = dbDrivers.find((x: any) => x.id === id);
      return m ? m.nome : (id || "N/D");
    };

    const getVehiclePlate = (id: string) => {
      const dbVehicles = FileDatabase.get("veiculos") || [];
      const v = dbVehicles.find((x: any) => x.id === id);
      return v ? v.placa : (id || "N/D");
    };

    const getUnidadeName = (id: string) => {
      const dbUnidades = FileDatabase.get("unidades") || [];
      const u = dbUnidades.find((x: any) => x.id === id);
      return u ? u.nome : (id || "N/D");
    };

    const recordChange = (campo: string, antes: any, depois: any) => {
      if (antes !== depois && depois !== undefined) {
        changedFields.push({
          data: dStr,
          hora: tStr,
          usuario: user.nome || user.email,
          campo,
          antes: String(antes ?? "-"),
          depois: String(depois ?? "-")
        });
      }
    };

    if (item.motoristaId !== undefined) {
      recordChange("Motorista", getDriverName(current.motoristaId), getDriverName(item.motoristaId));
    }
    if (item.veiculoId !== undefined) {
      recordChange("Veículo", getVehiclePlate(current.veiculoId), getVehiclePlate(item.veiculoId));
    }
    if (item.placa !== undefined) {
      recordChange("Placa", current.placa || "N/D", item.placa || "N/D");
    }
    if (item.unidadeId !== undefined) {
      recordChange("Unidade", getUnidadeName(current.unidadeId), getUnidadeName(item.unidadeId));
    }
    if (item.cliente !== undefined) {
      recordChange("Cliente", current.cliente || "", item.cliente);
    }
    if (item.cidade !== undefined) {
      recordChange("Cidade", current.cidade || "", item.cidade);
    }
    if (item.endereco !== undefined) {
      recordChange("Endereço", current.endereco || "", item.endereco);
    }
    if (item.data !== undefined) {
      recordChange("Data da Entrega", current.data || "", item.data);
    }
    if (item.horario !== undefined) {
      recordChange("Horário", current.horario || "", item.horario);
    }
    if (item.observacoes !== undefined) {
      recordChange("Observações", current.observacoes || "", item.observacoes);
    }
    if (item.qtd_volumes !== undefined) {
      recordChange("Quantidade de Volumes", current.qtd_volumes ?? 0, item.qtd_volumes ?? 0);
    }
    if (item.qtd_entregues !== undefined) {
      recordChange("Quantidade Entregue", current.qtd_entregues ?? 0, item.qtd_entregues ?? 0);
    }
    if (item.qtd_pendente !== undefined) {
      recordChange("Quantidade Pendente", current.qtd_pendente ?? 0, item.qtd_pendente ?? 0);
    }
    if (item.qtd_recusada !== undefined) {
      recordChange("Quantidade Recusada", current.qtd_recusada ?? 0, item.qtd_recusada ?? 0);
    }
    if (item.qtd_devolvida !== undefined) {
      recordChange("Quantidade Devolvida", current.qtd_devolvida ?? 0, item.qtd_devolvida ?? 0);
    }
    if (item.status_entrega !== undefined) {
      recordChange("Status", current.status_entrega || "", item.status_entrega);
    }

    if (changedFields.length > 0) {
      item.log_alteracoes = [...changedFields, ...logAlteracoes];
    }

    // Handle NFs update if sent
    if (Array.isArray(item.nfs)) {
      const currentNfs = FileDatabase.get("entregas_off_nfs" as any) || [];
      const filteredNfs = currentNfs.filter((nf: any) => nf.entrega_off_id !== req.params.id);
      item.nfs.forEach((nf: any) => {
        filteredNfs.push({
          id: nf.id || `nf-off-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          entrega_off_id: req.params.id,
          numero_nf: nf.numero_nf,
          valor_nf: Number(nf.valor_nf)
        });
      });
      FileDatabase.set("entregas_off_nfs" as any, filteredNfs);
      delete item.nfs;
    }

    const updated = FileDatabase.update("entregas_off", req.params.id, item, operator);
    const nfsList = FileDatabase.get("entregas_off_nfs" as any) || [];
    const finalUpdated = {
      ...updated,
      nfs: nfsList.filter((nf: any) => nf.entrega_off_id === req.params.id)
    };

    res.json(finalUpdated);
  });

  app.post("/api/entregas-off/:id/ocorrencias", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const current = FileDatabase.get("entregas_off").find(x => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "Entrega Off-Route não encontrada" });

    const { tipo, descricao, data, hora } = req.body;
    if (!tipo || !descricao) {
      return res.status(400).json({ error: "Tipo e descrição são obrigatórios." });
    }

    const nowObj = new Date();
    const dStr = data || nowObj.toLocaleDateString("pt-BR");
    const tStr = hora || nowObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const occItem = {
      id: "occ-" + Math.random().toString(36).substring(2, 9),
      tipo,
      descricao,
      data: dStr,
      hora: tStr,
      usuario: user.nome || user.email
    };

    const occList = current.ocorrencias || [];
    const updatedOff = {
      ocorrencias: [occItem, ...occList]
    } as any;

    // Track as a change log
    const logAlteracoes = current.log_alteracoes || [];
    updatedOff.log_alteracoes = [{
      data: dStr,
      hora: tStr,
      usuario: user.nome || user.email,
      campo: "Nova Ocorrência",
      antes: "-",
      depois: `[${tipo}] ${descricao}`
    }, ...logAlteracoes];

    const updated = FileDatabase.update("entregas_off", req.params.id, updatedOff, user.email);
    const nfsList = FileDatabase.get("entregas_off_nfs" as any) || [];
    const finalUpdated = {
      ...updated,
      nfs: nfsList.filter((nf: any) => nf.entrega_off_id === req.params.id)
    };
    res.json({ success: true, updated: finalUpdated, occItem });
  });

  app.post("/api/entregas-off/:id/anexos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const current = FileDatabase.get("entregas_off").find(x => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "Entrega Off-Route não encontrada" });

    const { url, nome, tipo } = req.body;
    if (!url || !nome || !tipo) {
      return res.status(400).json({ error: "Nome, tipo e URL do anexo são obrigatórios." });
    }

    const nowObj = new Date();
    const dStr = nowObj.toLocaleDateString("pt-BR");
    const tStr = nowObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const anexoItem = {
      id: "anx-" + Math.random().toString(36).substring(2, 9),
      nome,
      tipo,
      url,
      data: dStr
    };

    const anexolList = current.anexos || [];
    const updatedOff = {
      anexos: [...anexolList, anexoItem]
    } as any;

    // Track as a change log
    const logAlteracoes = current.log_alteracoes || [];
    updatedOff.log_alteracoes = [{
      data: dStr,
      hora: tStr,
      usuario: user.nome || user.email,
      campo: "Novo Anexo",
      antes: "-",
      depois: `${tipo}: ${nome}`
    }, ...logAlteracoes];

    const updated = FileDatabase.update("entregas_off", req.params.id, updatedOff, user.email);
    const nfsList = FileDatabase.get("entregas_off_nfs" as any) || [];
    const finalUpdated = {
      ...updated,
      nfs: nfsList.filter((nf: any) => nf.entrega_off_id === req.params.id)
    };
    res.json({ success: true, updated: finalUpdated, anexoItem });
  });

  // ----------------------------------------------------
  // CONTROLES DE DESCARGA API
  // ----------------------------------------------------
  app.get("/api/descargas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const list = FileDatabase.get("descargas");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter(d => d.unidadeId === activeUnit));
  });

  app.post("/api/descargas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body;
    const operator = user.email;

    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }

    const added = FileDatabase.add("descargas", item, operator);
    res.json(added);
  });

  app.put("/api/descargas/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    if (user.perfil !== "admin_master" && user.perfil !== "admin_unidade") {
      return res.status(403).json({ error: "Você não tem permissão para editar recibos de descarga." });
    }

    const currentList = FileDatabase.get("descargas");
    const found = currentList.find(x => x.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Recibo de descarga não encontrado." });
    }

    if (user.perfil !== "admin_master" && found.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Você não tem permissão para editar recibos de outra unidade." });
    }

    const item = req.body;
    const operator = user.email;

    if (user.perfil !== "admin_master") {
      item.unidadeId = found.unidadeId;
    }

    const updated = FileDatabase.update("descargas", req.params.id, item, operator);
    res.json(updated);
  });

  app.delete("/api/descargas/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    if (user.perfil !== "admin_master" && user.perfil !== "admin_unidade") {
      return res.status(403).json({ error: "Você não tem permissão para excluir recibos de descarga." });
    }

    const currentList = FileDatabase.get("descargas");
    const found = currentList.find(x => x.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Recibo de descarga não encontrado." });
    }

    if (user.perfil !== "admin_master" && found.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Você não tem permissão para excluir recibos de outra unidade." });
    }

    const motivo = req.body.motivo || req.query.motivo || "Exclusão solicitada pelo usuário";
    const operator = user.email;

    // Delete from DB (FileDatabase.delete will automatically trigger an audit with details, 
    // but we can log a rich audit with custom structure as requested by the user)
    FileDatabase.delete("descargas", req.params.id, operator);

    const auditDetail = `Recibo Excluído - Nº do Recibo: ${found.id} | DT Associada: ${found.dt} | Valor: R$ ${found.valorDescarga} | Motivo: ${motivo}`;
    FileDatabase.logAudit(
      user.email,
      "EXCLUSAO_DESCARGA_RICH",
      auditDetail,
      user.unidadeId || found.unidadeId || ""
    );

    res.json({ success: true, message: "Recibo de descarga excluído com sucesso." });
  });

  // ----------------------------------------------------
  // MANUTENCAO API
  // ----------------------------------------------------
  app.get("/api/manutencao", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const list = FileDatabase.get("manutencoes");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter(m => m.unidadeId === activeUnit));
  });

  app.post("/api/manutencao", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body as Manutencao;
    const operator = user.email;

    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }

    const added = FileDatabase.add("manutencoes", item, operator);
    res.json(added);
  });

  app.put("/api/manutencao/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    // Validate permission
    if (user.perfil !== "admin_master" && user.perfil !== "admin_unidade") {
      return res.status(403).json({ error: "Você não tem permissão para editar manutenções." });
    }

    const currentList = FileDatabase.get("manutencoes");
    const found = currentList.find(x => x.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Manutenção não encontrada." });
    }

    // If not admin_master, verify unit
    if (user.perfil !== "admin_master" && found.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Você não tem permissão para editar manutenção de outra unidade." });
    }

    const item = req.body;
    const operator = user.email || user.nome || "Lucas";

    // Track detailed field history
    const historyLogs: string[] = [];
    const fieldsToTrack = [
      { key: "veiculoId", label: "Veículo" },
      { key: "placa", label: "Placa" },
      { key: "tipo", label: "Tipo de Manutenção" },
      { key: "categoria", label: "Categoria" },
      { key: "data", label: "Data da Manutenção" },
      { key: "proximaManutencao", label: "Data da Próxima Manutenção" },
      { key: "quilometragemAtual", label: "Quilometragem Atual" },
      { key: "proximaQuilometragem", label: "Quilometragem da Próxima Revisão" },
      { key: "valorManutencao", label: "Valor da Manutenção" },
      { key: "oficina", label: "Oficina" },
      { key: "fornecedor", label: "Fornecedor" },
      { key: "responsavel", label: "Responsável" },
      { key: "observacao", label: "Observações" }
    ];

    const todayStr = new Date().toLocaleDateString("pt-BR");

    fieldsToTrack.forEach(field => {
      const oldVal = (found as any)[field.key] !== undefined ? (found as any)[field.key] : "";
      const newVal = item[field.key] !== undefined ? item[field.key] : "";
      if (String(oldVal) !== String(newVal)) {
        historyLogs.push(`Campo: ${field.label} | Antes: ${oldVal} | Depois: ${newVal}`);
      }
    });

    // Also compare checklist if changed
    if (item.checklist && found.checklist) {
      const checklistFields = ["oleo", "filtro", "freios", "pneus", "rodas", "suspensao", "amortecedores", "etiquetas", "eletrica", "motor", "lanternas"];
      checklistFields.forEach(chk => {
        const oldVal = (found.checklist as any)[chk] ? "Ativado" : "Desativado";
        const newVal = item.checklist[chk] ? "Ativado" : "Desativado";
        if (oldVal !== newVal) {
          historyLogs.push(`Campo: Checklist - ${chk.toUpperCase()} | Antes: ${oldVal} | Depois: ${newVal}`);
        }
      });
    }

    if (user.perfil !== "admin_master") {
      item.unidadeId = found.unidadeId;
    }

    // Save actual update
    const updated = FileDatabase.update("manutencoes", req.params.id, item, operator);

    // Recalculate alerts
    FileDatabase.getFull(); // This triggers recalculateAlerts internally
    
    // Log rich audit history logs
    const auditDetail = `Manutenção Editada - Veículo: ${found.veiculoId} (Placa: ${item.placa || found.placa || ""}) | Usuário: ${user.nome || user.email}\n` + 
                         (historyLogs.length > 0 ? historyLogs.join("\n") : "Nenhum campo com alteração detectado.");
    
    FileDatabase.logAudit(
      user.email,
      "MANUTENCAO_EDITADA",
      auditDetail,
      user.unidadeId || found.unidadeId || ""
    );

    res.json(updated);
  });

  app.delete("/api/manutencao/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    if (user.perfil !== "admin_master" && user.perfil !== "admin_unidade") {
      return res.status(403).json({ error: "Você não tem permissão para excluir manutenções." });
    }

    const currentList = FileDatabase.get("manutencoes");
    const found = currentList.find(x => x.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Manutenção não encontrada." });
    }

    if (user.perfil !== "admin_master" && found.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Você não tem permissão para excluir manutenção de outra unidade." });
    }

    const operator = user.email;
    FileDatabase.delete("manutencoes", req.params.id, operator);

    // Recalculate alerts
    FileDatabase.getFull();

    const auditDetail = `Manutenção Excluída - ID: ${found.id} | Veículo: ${found.veiculoId} | Placa: ${found.placa || found.veiculoId} | Tipo: ${found.tipo} | Data: ${found.data} | Valor: R$ ${found.valorManutencao || 0}`;
    FileDatabase.logAudit(
      user.email,
      "MANUTENCAO_EXCLUIDA",
      auditDetail,
      user.unidadeId || found.unidadeId || ""
    );

    res.json({ success: true, message: "Manutenção excluída com sucesso." });
  });

  // ----------------------------------------------------
  // ESTOQUE E MOVIMENTACAO EPI API
  // ----------------------------------------------------
  app.get("/api/epi-estoque", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const list = FileDatabase.get("estoque_epi");
    
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter(s => s.unidadeId === activeUnit));
  });

  app.post("/api/epi-estoque", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body;
    const operator = user.email;

    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    } else if (!item.unidadeId) {
      item.unidadeId = "un-go";
    }

    if (!item.id) {
      item.id = "epi-" + Math.random().toString(36).substring(2, 9);
    }

    // Set starting stock balance to Quantity Initial
    item.saldo = Number(item.quantidadeInicial || 0);

    const added = FileDatabase.add("estoque_epi", item, operator);
    logAudit(req, user.nome || "Sistema", "CADASTRO_EPI", `Cadastrou epi: ${item.nome}, Cód: ${item.codigo}, Qtd: ${item.quantidadeInicial}`, item.unidadeId);

    res.json({ success: true, added });
  });

  app.get("/api/epi-movimentacoes", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const list = FileDatabase.get("movimentacao_epi");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter(m => m.unidadeId === activeUnit));
  });

  app.post("/api/epi-movimentacoes", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body;
    const operator = user.email;

    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    } else if (!item.unidadeId) {
      item.unidadeId = "un-go";
    }

    if (!item.hora) {
      item.hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    if (!item.usuario) {
      item.usuario = user.nome || user.email;
    }

    // Update stock according to operation type: Entrada, Saída, Devolução, Perda, Ajuste
    const stock = FileDatabase.get("estoque_epi");
    const stockItem = stock.find((s) => s.id === item.itemEpi);
    if (stockItem) {
      const tipoNorm = (item.tipo || "Saída").trim();
      const qtyNum = Number(item.quantidade || 0);

      if (tipoNorm === "Saída" || tipoNorm === "Perda") {
        stockItem.saldo = Math.max(0, stockItem.saldo - qtyNum);
      } else if (tipoNorm === "Entrada" || tipoNorm === "Devolução") {
        stockItem.saldo = stockItem.saldo + qtyNum;
      } else if (tipoNorm === "Ajuste") {
        stockItem.saldo = qtyNum;
      }
      FileDatabase.set("estoque_epi", stock);
    }

    const added = FileDatabase.add("movimentacao_epi", item, operator);
    res.json({ success: true, added });
  });

  // ----------------------------------------------------
  // CENTRAL DE PROCESSOS APIs
  // ----------------------------------------------------
  
  // Notification helper
  const notifyUser = (usuarioId: string, titulo: string, mensagem: string, processoId: string) => {
    const notifyItem = {
      id: `not-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      usuarioId,
      titulo,
      mensagem,
      processoId,
      lida: false,
      data: new Date().toISOString()
    };
    FileDatabase.add("processo_notificacoes", notifyItem, "Sistema");
  };

  // Log process history helper
  const logProcessHistory = (processoId: string, usuario: string, acao: string, detalhes: string) => {
    const histItem = {
      id: `hpr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      processoId,
      usuario,
      acao,
      detalhes,
      data: new Date().toISOString()
    };
    FileDatabase.add("processo_historico", histItem, "Sistema");
  };

  app.get("/api/processos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const list = FileDatabase.get("processos") || [];
    
    // Auto-overdue checking
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let updatedAny = false;
    
    list.forEach(p => {
      // Check if limit surpassed and status not concluded/cancelled, and notify if not already flagged in history
      if (p.dataLimite && p.dataLimite < todayStr && p.status !== "concluido" && p.status !== "cancelado") {
        // If not already noted as delayed in comments or tags/notes, we can trigger warnings
        // Overdue status can be monitored in real time on the UI, but let's notify once
        // Let's find if a previous notification exists for this processId as "Processo Atrasado"
        const notifications = FileDatabase.get("processo_notificacoes") || [];
        const alreadyNotified = notifications.some(n => n.processoId === p.id && n.titulo.includes("atrasado"));
        
        if (!alreadyNotified) {
          const warnMsg = `O processo "${p.titulo}" ultrapassou a data limite (${p.dataLimite}) e encontra-se pendente de conclusão.`;
          
          // Notify primary responsible
          if (p.responsavel) notifyUser(p.responsavel, "⚠️ Processo Atrasado", warnMsg, p.id);
          
          // Notify participants
          if (p.participantes && p.participantes.length > 0) {
            p.participantes.forEach(pt => {
              if (pt !== p.responsavel) {
                notifyUser(pt, "⚠️ Processo Atrasado", warnMsg, p.id);
              }
            });
          }
          
          // Notify supervisors & Masters
          const usersList = FileDatabase.get("usuarios") || [];
          usersList.forEach(u => {
            if (u.perfil === "admin_master") {
              notifyUser(u.email, "⚠️ Processo Atrasado (Alerta Master)", warnMsg, p.id);
            }
          });

          // Log in process history
          logProcessHistory(p.id, "Sistema", "Atraso Detectado", `Processo ultrapassou o prazo limite de ${p.dataLimite}`);
          updatedAny = true;
        }
      }
    });

    if (updatedAny) {
      FileDatabase.set("processos", list);
    }

    // Filter list based on units / roles / shares / participants / masters
    const filtered = list.filter(p => checkUserHasAccess(user, p));

    res.json(filtered);
  });

  app.post("/api/processos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body;
    const operator = user.email;

    // ----------------------------------------------------
    // STRICT BACKEND VALIDATION (RULE: VALIDAÇÃO DE CORRELAÇÃO)
    // ----------------------------------------------------
    const users = FileDatabase.get("usuarios") || [];
    const units = FileDatabase.get("unidades") || [];

    // 1. Validate Responsável Principal (must exist as a user)
    const validResponsavel = users.some(u => u.email.toLowerCase() === item.responsavel?.toLowerCase());
    if (!validResponsavel) {
      return res.status(400).json({ error: `Validação do Processo: O Responsável Principal "${item.responsavel}" não existe ou não está cadastrado no banco de dados.` });
    }

    // 2. Validate Participantes (everyone must exist as a user)
    if (item.participantes && item.participantes.length > 0) {
      for (const pEmail of item.participantes) {
        const exists = users.some(u => u.email.toLowerCase() === pEmail.toLowerCase());
        if (!exists) {
          return res.status(400).json({ error: `Validação do Processo: O participante com o e-mail "${pEmail}" não existe no banco de dados.` });
        }
      }
    }

    // 3. Validate Source Unit (must exist in units)
    const validSourceUnit = units.some(u => u.id === item.unidadeId);
    if (!validSourceUnit) {
      return res.status(400).json({ error: `Validação do Processo: A Unidade Origem "${item.unidadeId}" não é uma unidade cadastrada.` });
    }

    // 4. Validate Shared Units (all except "Todas" must exist in units)
    if (item.unidadesCompartilhadas && item.unidadesCompartilhadas.length > 0) {
      for (const uId of item.unidadesCompartilhadas) {
        if (uId === "Todas") continue;
        const exists = units.some(u => u.id === uId);
        if (!exists) {
          return res.status(400).json({ error: `Validação do Processo: A unidade de compartilhamento "${uId}" não foi encontrada no banco de dados.` });
        }
      }
    }

    item.id = `prc-${Date.now()}`;
    item.criadoPor = user.email;
    item.criadoEm = new Date().toISOString();
    item.atualizadoEm = new Date().toISOString();
    if (!item.anexos) item.anexos = [];
    if (!item.participantes) item.participantes = [];
    if (!item.unidadesCompartilhadas) item.unidadesCompartilhadas = [];
    if (!item.tags) item.tags = [];

    // Save
    const added = FileDatabase.add("processos", item, operator);

    // Initial history logging
    logProcessHistory(added.id, user.nome || user.email, "Criação", `Processo "${added.titulo}" aberto sob prioridade ${added.prioridade}.`);

    // Notify primary responsible if it's someone else
    if (added.responsavel && added.responsavel.toLowerCase() !== user.email.toLowerCase()) {
      notifyUser(added.responsavel, "📋 Processo Atribuído", `Você foi designado como responsável principal do processo: "${added.titulo}".`, added.id);
    }

    // Notify participants
    if (added.participantes && added.participantes.length > 0) {
      added.participantes.forEach((pt: string) => {
        if (pt.toLowerCase() !== user.email.toLowerCase()) {
          notifyUser(pt, "👥 Convidado para Processo", `Você foi adicionado ao processo ${added.titulo}.`, added.id);
        }
      });
    }

    // Log corporate audit
    const auditDetail = `Processo Expandido Criado - ID: ${added.id} | Título: ${added.titulo} | Categoria: ${added.categoria} | Resp: ${added.responsavel} | Unidade: ${added.unidadeId}`;
    FileDatabase.logAudit(
      user.email,
      "PROCESSO_CRIADO",
      auditDetail,
      added.unidadeId || user.unidadeId || ""
    );

    res.json(added);
  });

  app.put("/api/processos/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const currentList = FileDatabase.get("processos") || [];
    const foundIdx = currentList.findIndex(p => p.id === req.params.id);
    if (foundIdx === -1) {
      return res.status(404).json({ error: "Processo não encontrado." });
    }

    const found = currentList[foundIdx];

    // Permissions check
    const userRole = getProcessUserRole(found, user);
    if (userRole === "visualizador") {
      return res.status(403).json({ error: "Sua permissão de Visualizador não permite editar este processo." });
    }

    const updatedData = req.body;

    // If active user is only EDITOR of the card, prevent editing metadata parameters
    if (userRole !== "administrador") {
      const adminKeys = ["titulo", "categoria", "prioridade", "dataLimite", "responsavel", "unidadeId", "participantes", "unidadesCompartilhadas", "participanteRoles"];
      const modifiedAdminKeys = adminKeys.filter(k => updatedData[k] !== undefined && JSON.stringify(updatedData[k]) !== JSON.stringify((found as any)[k]));
      if (modifiedAdminKeys.length > 0) {
        return res.status(403).json({ error: `Sua permissão de Editor não permite alterar as propriedades administrativas: ${modifiedAdminKeys.join(", ")}.` });
      }

      // Concluding/cancelling is restricted to Process Administrators
      if (updatedData.status && (updatedData.status === "concluido" || updatedData.status === "cancelado") && found.status !== updatedData.status) {
        return res.status(403).json({ error: "Somente administradores de processo ou MASTER podem encerrar ou cancelar o processo." });
      }
    }

    updatedData.atualizadoEm = new Date().toISOString();

    // ----------------------------------------------------
    // STRICT BACKEND VALIDATION (RULE: VALIDAÇÃO DE CORRELAÇÃO - PUT)
    // ----------------------------------------------------
    const users = FileDatabase.get("usuarios") || [];
    const units = FileDatabase.get("unidades") || [];

    // 1. Validate Responsável Principal (if supplied)
    if (updatedData.responsavel) {
      const validResponsavel = users.some(u => u.email.toLowerCase() === updatedData.responsavel.toLowerCase());
      if (!validResponsavel) {
        return res.status(400).json({ error: `Validação do Processo: O Responsável Principal "${updatedData.responsavel}" não é um usuário cadastrado no sistema.` });
      }
    }

    // 2. Validate Participantes (if supplied)
    if (updatedData.participantes && Array.isArray(updatedData.participantes)) {
      for (const pEmail of updatedData.participantes) {
        const exists = users.some(u => u.email.toLowerCase() === pEmail.toLowerCase());
        if (!exists) {
          return res.status(400).json({ error: `Validação do Processo: O participante com o e-mail "${pEmail}" não é um usuário cadastrado no sistema.` });
        }
      }
    }

    // 3. Validate Source Unit (if supplied)
    if (updatedData.unidadeId) {
      const validSourceUnit = units.some(u => u.id === updatedData.unidadeId);
      if (!validSourceUnit) {
        return res.status(400).json({ error: `Validação do Processo: A Unidade Origem "${updatedData.unidadeId}" não é uma unidade cadastrada.` });
      }
    }

    // 4. Validate Shared Units (if supplied, all except "Todas" must exist in units)
    if (updatedData.unidadesCompartilhadas && Array.isArray(updatedData.unidadesCompartilhadas)) {
      for (const uId of updatedData.unidadesCompartilhadas) {
        if (uId === "Todas") continue;
        const exists = units.some(u => u.id === uId);
        if (!exists) {
          return res.status(400).json({ error: `Validação do Processo: A unidade de compartilhamento "${uId}" não foi encontrada no banco de dados.` });
        }
      }
    }

    // Notify newly added participants
    if (updatedData.participantes && Array.isArray(updatedData.participantes)) {
      const oldParts = found.participantes || [];
      const newParts = updatedData.participantes.filter((p: string) => !oldParts.includes(p));
      newParts.forEach((pt: string) => {
        if (pt.toLowerCase() !== user.email.toLowerCase()) {
          notifyUser(pt, "👥 Convidado para Processo", `Você foi adicionado ao processo ${updatedData.titulo || found.titulo}.`, found.id);
        }
      });
    }

    // Compare changes for beautiful visual history logs!
    const trackChanges: string[] = [];
    const keys = ["titulo", "categoria", "descricao", "prioridade", "dataLimite", "responsavel", "status", "observacoes"];
    keys.forEach(k => {
      const oldVal = (found as any)[k];
      const newVal = updatedData[k];
      if (oldVal !== undefined && newVal !== undefined && String(oldVal) !== String(newVal)) {
        trackChanges.push(`"${k}" alterado de "${oldVal}" para "${newVal}"`);
      }
    });

    // Check status change notifications
    if (updatedData.status && updatedData.status !== found.status) {
      // Send alerts
      const msg = `Status do processo "${found.titulo}" mudou para: "${updatedData.status}".`;
      // Notify responsible
      if (found.responsavel) notifyUser(found.responsavel, "🔄 Atualização de Status", msg, found.id);
      // Notify participants
      found.participantes?.forEach(pt => {
        if (pt !== user.email) notifyUser(pt, "🔄 Atualização de Status", msg, found.id);
      });
    }

    // Save updates
    const updated = FileDatabase.update("processos", req.params.id, updatedData, user.email);

    // Save history
    if (trackChanges.length > 0) {
      logProcessHistory(req.params.id, user.nome || user.email, "Edição", trackChanges.join("; "));
    }

    res.json(updated);
  });

  // Fast drag & drop route
  app.put("/api/processos/:id/status", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const currentList = FileDatabase.get("processos") || [];
    const found = currentList.find(p => p.id === req.params.id);
    if (!found) return res.status(404).json({ error: "Processo não encontrado." });

    const userRole = getProcessUserRole(found, user);
    if (userRole === "visualizador") {
      return res.status(403).json({ error: "Sua permissão de Visualizador não permite alterar o status deste processo." });
    }

    const { status } = req.body;
    if ((status === "concluido" || status === "cancelado") && userRole !== "administrador") {
      return res.status(403).json({ error: "Somente administradores de processo ou MASTER podem encerrar ou cancelar o processo." });
    }

    const oldStatus = found.status;
    found.status = status;
    found.atualizadoEm = new Date().toISOString();

    FileDatabase.update("processos", req.params.id, { status, atualizadoEm: found.atualizadoEm }, user.email);

    logProcessHistory(found.id, user.nome || user.email, "Movimentação Kanban", `Cartão movido de "${oldStatus}" para "${status}".`);

    // Notify others
    const alertMsg = `O processo "${found.titulo}" foi movido para o status: ${status}.`;
    if (found.responsavel && found.responsavel !== user.email) {
      notifyUser(found.responsavel, "🔄 Status Kanban Alterado", alertMsg, found.id);
    }
    found.participantes?.forEach(pt => {
      if (pt !== user.email) {
        notifyUser(pt, "🔄 Status Kanban Alterado", alertMsg, found.id);
      }
    });

    res.json({ success: true, status });
  });

  app.delete("/api/processos/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const currentList = FileDatabase.get("processos") || [];
    const found = currentList.find(p => p.id === req.params.id);
    if (!found) return res.status(404).json({ error: "Processo não encontrado." });

    // Permissions check
    const userRole = getProcessUserRole(found, user);
    if (userRole !== "administrador") {
      return res.status(403).json({ error: "Você não possui nível de permissão suficiente para excluir processos." });
    }

    FileDatabase.delete("processos", req.params.id, user.email);

    const auditDetail = `Processo Excluído - ID: ${found.id} | Título: ${found.titulo} | Categoria: ${found.categoria}`;
    FileDatabase.logAudit(
      user.email,
      "PROCESSO_EXCLUIDO",
      auditDetail,
      found.unidadeId || ""
    );

    res.json({ success: true, message: "Processo excluído permanentemente." });
  });

  // Comments endpoints
  app.get("/api/processos/:id/comentarios", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const coms = FileDatabase.get("processo_comentarios") || [];
    const filtered = coms.filter(c => c.processoId === req.params.id);
    res.json(filtered);
  });

  app.post("/api/processos/:id/comentarios", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const { texto, mencoes } = req.body;
    const processId = req.params.id;

    const currentList = FileDatabase.get("processos") || [];
    const proc = currentList.find(p => p.id === processId);
    if (!proc) return res.status(404).json({ error: "Processo não encontrado." });

    const comItem = {
      id: `com-${Date.now()}`,
      processoId: processId,
      usuario: user.email,
      usuarioNome: user.nome || user.email,
      texto,
      data: new Date().toISOString(),
      mencoes: mencoes || []
    };

    FileDatabase.add("processo_comentarios", comItem, user.email);

    // Save technical history log
    logProcessHistory(processId, user.nome || user.email, "Novo Comentário", `Adicionou comentário no processo.`);

    // Trigger notification to mentioned users
    if (mencoes && mencoes.length > 0) {
      const systemUsers = FileDatabase.get("usuarios") || [];
      mencoes.forEach((mEmail: string) => {
        const targetUser = systemUsers.find((u: any) => u.email.toLowerCase() === mEmail.toLowerCase());
        if (targetUser && checkUserHasAccess(targetUser, proc)) {
          notifyUser(
            mEmail, 
            "💬 Você foi mencionado", 
            `${user.nome || user.email} mencionou você no processo: "${texto.substring(0, 60)}..."`, 
            processId
          );
        }
      });
    }

    // Also alert primary responsible if someone else commented
    if (proc.responsavel && proc.responsavel.toLowerCase() !== user.email.toLowerCase()) {
      notifyUser(
        proc.responsavel,
         "💬 Novo Comentário de Equipe", 
         `Novo comentário sobre o processo "${proc.titulo}" por ${user.nome || user.email}`,
         processId
      );
    }

    res.json(comItem);
  });

  // Attachments endpoints
  app.post("/api/processos/:id/anexos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const { nome, url, tipo } = req.body;
    const currentList = FileDatabase.get("processos") || [];
    const procIdx = currentList.findIndex(p => p.id === req.params.id);
    if (procIdx === -1) return res.status(404).json({ error: "Processo não encontrado" });

    const proc = currentList[procIdx];
    const anexoItem = {
      id: `anx-${Date.now()}`,
      nome: nome || "Documento Anexo",
      url: url || "",
      tipo: tipo || "PDF",
      data: new Date().toISOString(),
      usuario: user.email
    };

    if (!proc.anexos) proc.anexos = [];
    proc.anexos.push(anexoItem);
    proc.atualizadoEm = new Date().toISOString();

    FileDatabase.update("processos", req.params.id, { anexos: proc.anexos, atualizadoEm: proc.atualizadoEm }, user.email);

    logProcessHistory(req.params.id, user.nome || user.email, "Novo Anexo", `Arquivo anexado: "${anexoItem.nome}".`);

    res.json(anexoItem);
  });

  // History endpoints
  app.get("/api/processos/:id/historico", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const hist = FileDatabase.get("processo_historico") || [];
    const filtered = hist.filter(h => h.processoId === req.params.id);
    // Sort descending
    filtered.sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    res.json(filtered);
  });

  // Custom Category customization
  app.get("/api/processo-categorias", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    res.json(FileDatabase.get("processo_categorias") || []);
  });

  app.post("/api/processo-categorias", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    // Only masters can create customized categories
    if (user.perfil !== "admin_master") {
      return res.status(403).json({ error: "Apenas administradores corporativos master podem adicionar novas categorias." });
    }

    const { nome } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: "Nome da categoria obrigatório." });
    }

    const catItem = {
      id: `cat-${Date.now()}`,
      nome: nome.trim(),
      criadoPor: user.email,
      criadoEm: new Date().toISOString()
    };

    const added = FileDatabase.add("processo_categorias", catItem, user.email);
    res.json(added);
  });

  // Custom Columns customization
  app.get("/api/processo-colunas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    res.json(FileDatabase.get("processo_colunas") || []);
  });

  app.post("/api/processo-colunas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    // Only masters can customize Columns
    if (user.perfil !== "admin_master") {
      return res.status(403).json({ error: "Apenas administradores master podem gerenciar colunas do Kanban." });
    }

    const { id, nome, ordem } = req.body;
    if (!id || !nome) {
      return res.status(400).json({ error: "ID e Nome da coluna são obrigatórios." });
    }

    const colItem = { id: id.trim(), nome: nome.trim(), ordem: Number(ordem || 1) };
    const added = FileDatabase.add("processo_colunas", colItem, user.email);
    res.json(added);
  });

  // Notifications
  app.get("/api/processo-notificacoes", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const list = FileDatabase.get("processo_notificacoes") || [];
    const processos = FileDatabase.get("processos") || [];
    const filtered = list.filter(n => {
      if (n.usuarioId?.toLowerCase() !== (user.email || "").toLowerCase()) {
        return false;
      }
      if (n.processoId) {
        const proc = processos.find(p => p.id === n.processoId);
        if (!proc) return false;
        return checkUserHasAccess(user, proc);
      }
      return true;
    });
    // Sort descending
    filtered.sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    res.json(filtered);
  });

  app.put("/api/processo-notificacoes/lida", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const { id, all } = req.body;
    const list = FileDatabase.get("processo_notificacoes") || [];

    if (all) {
      list.forEach(n => {
        if (n.usuarioId?.toLowerCase() === (user.email || "").toLowerCase()) {
          n.lida = true;
        }
      });
    } else if (id) {
      const idx = list.findIndex(n => n.id === id);
      if (idx !== -1 && list[idx].usuarioId?.toLowerCase() === (user.email || "").toLowerCase()) {
        list[idx].lida = true;
      }
    }

    FileDatabase.set("processo_notificacoes", list);
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // ALERTAS E AUDITORIA APIs
  // ----------------------------------------------------
  app.get("/api/alertas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const alerts = FileDatabase.get("alertas");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(alerts);
    
    // Filter alerts by looking at driver or vehicle's unit
    const filteredAlerts = alerts.filter(alert => {
      if (alert.tipo === "CNH" || alert.tipo === "ASO") {
        const mot = FileDatabase.get("motoristas").find(m => m.id === alert.refId);
        return mot ? mot.unidadeId === activeUnit : false;
      }
      const veic = FileDatabase.get("veiculos").find(v => v.id === alert.refId);
      return veic ? veic.unidadeId === activeUnit : false;
    });
    res.json(filteredAlerts);
  });

  // ====================================================
  // FECHAMENTO DE DT & CONTROLE DE VALES ENDPOINTS
  // ====================================================

  app.get("/api/fechamentos_dt", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });
      
      const closures = FileDatabase.get("fechamentos_dt") || [];
      const activeUnit = getRequestUnitContext(req, user);
      
      if (activeUnit === "Todas") {
        return res.json(closures);
      }
      return res.json(closures.filter((c: any) => c.unidadeId === activeUnit));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fechamentos_dt", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const { 
        dt, 
        motoristaId, 
        veiculoId, 
        unidadeId, 
        observacoes, 
        ocorrencias = [],
        houveDevolucao,
        houveAvaria,
        houveFalta,
        devolucaoQtd,
        devolucaoMotivo,
        devolucaoObs,
        faltaProduto,
        faltaQuantidade,
        faltaValorUnit,
        faltaValorTotal,
        faltaObservacao,
        statusFechamento
      } = req.body;

      if (!dt) {
        return res.status(400).json({ error: "Número da DT é obrigatório." });
      }

      // Check if already closed
      const existing = (FileDatabase.get("fechamentos_dt") || []).find((c: any) => c.dt === dt);
      if (existing) {
        return res.status(400).json({ error: `A DT ${dt} já se encontra fechada operacionalmente.` });
      }

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0];

      // Synthesize occurrences based on questionnaire fields if needed
      let resolvedOcorrencias = [...(ocorrencias || [])];
      
      if ((houveFalta === "Sim" || houveFalta === true) && faltaProduto) {
        // Only push if not already in occurrences
        if (!resolvedOcorrencias.some(o => o.tipo === "Falta de Mercadoria" && o.produto === faltaProduto)) {
          resolvedOcorrencias.push({
            id: `occ-auto-${Date.now()}`,
            tipo: "Falta de Mercadoria",
            produto: faltaProduto,
            quantidade: Number(faltaQuantidade || 0),
            valorUnitario: Number(faltaValorUnit || 0),
            valorTotal: Number(faltaValorTotal || 0),
            observacao: faltaObservacao || ""
          });
        }
      }

      if ((houveDevolucao === "Sim" || houveDevolucao === true)) {
        if (!resolvedOcorrencias.some(o => o.tipo === "Devolução")) {
          resolvedOcorrencias.push({
            id: `occ-auto-dev-${Date.now()}`,
            tipo: "Devolução",
            produto: "Devolução de Mercadoria",
            quantidade: Number(devolucaoQtd || 0),
            valorUnitario: 0,
            valorTotal: 0,
            observacao: `Motivo: ${devolucaoMotivo || "Retorno normal"} • ${devolucaoObs || ""}`
          });
        }
      }

      if ((houveAvaria === "Sim" || houveAvaria === true)) {
        if (!resolvedOcorrencias.some(o => o.tipo === "Avaria")) {
          resolvedOcorrencias.push({
            id: `occ-auto-av-${Date.now()}`,
            tipo: "Avaria",
            produto: "Avaria de Produto / Danificado",
            quantidade: 1,
            valorUnitario: 0,
            valorTotal: 0,
            observacao: "Constatada avaria no encerramento"
          });
        }
      }

      // Auto-determine statusFechamento
      let resolvedStatus = statusFechamento;
      if (!resolvedStatus) {
        if (houveFalta === "Sim" || houveFalta === true) {
          resolvedStatus = "Fechada Com Vale";
        } else if (houveAvaria === "Sim" || houveAvaria === true) {
          resolvedStatus = "Fechada Com Ocorrência";
        } else if (houveDevolucao === "Sim" || houveDevolucao === true) {
          resolvedStatus = "Fechada Com Devolução";
        } else {
          resolvedStatus = "Fechada Sem Vale";
        }
      }

      const newClosure = {
        id: `cl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        dt,
        dataFechamento: dateStr,
        horaFechamento: timeStr,
        usuarioResponsavel: user.email,
        motoristaId,
        veiculoId,
        unidadeId,
        observacoes: observacoes || "",
        ocorrencias: resolvedOcorrencias,
        houveDevolucao: houveDevolucao || "Não",
        houveAvaria: houveAvaria || "Não",
        houveFalta: houveFalta || "Não",
        devolucaoQtd: Number(devolucaoQtd || 0),
        devolucaoMotivo: devolucaoMotivo || "",
        devolucaoObs: devolucaoObs || "",
        faltaProduto: faltaProduto || "",
        faltaQuantidade: Number(faltaQuantidade || 0),
        faltaValorUnit: Number(faltaValorUnit || 0),
        faltaValorTotal: Number(faltaValorTotal || 0),
        faltaObservacao: faltaObservacao || "",
        statusFechamento: resolvedStatus,
        criadoEm: now.toISOString()
      };

      // Add closure
      FileDatabase.add("fechamentos_dt", newClosure, user.email);

      // Audit DT closure
      FileDatabase.logAudit(
        user.email,
        "FECHAMENTO_DT_CRIADO",
        `Fechamento residencial efetuado para a DT ${dt} com status: ${resolvedStatus}.`,
        unidadeId || ""
      );

      // Update Rota status to "Finalizada"
      const foundRota = (FileDatabase.get("rotas") || []).find((r: any) => r.dt === dt);
      if (foundRota) {
        FileDatabase.update("rotas", foundRota.id, {
          status: "Finalizada",
          status_viagem: resolvedStatus // Let routes reflect this specific closure status too!
        }, user.email);
        
        FileDatabase.logAudit(
          user.email,
          "ROTA_STATUS_AUTO_FINALIZADA",
          `Status da DT ${dt} automaticamente alterado para Finalizada devido ao fechamento de DT.`,
          unidadeId || ""
        );
      }

      // Process "Falta de Mercadoria" to generate vales automatically
      const falhas = resolvedOcorrencias.filter((o: any) => o.tipo === "Falta de Mercadoria");
      let generatedValesCount = 0;
      
      const allVales = FileDatabase.get("vales") || [];
      let nextIndex = allVales.length + 1;

      for (const occ of falhas) {
        const valeNum = `VALE-${now.getFullYear()}-${String(nextIndex).padStart(4, "0")}`;
        nextIndex++;

        const newVale = {
          id: `vale-${Date.now()}-${Math.floor(Math.random() * 1000)}-${generatedValesCount}`,
          numeroVale: valeNum,
          dt,
          motoristaId,
          veiculoId,
          unidadeId,
          produto: occ.produto || "Produto Não Identificado",
          quantidade: Number(occ.quantidade || 0),
          valor: Number(occ.valorTotal || 0),
          data: dateStr,
          responsavel: user.email,
          status: "Aguardando Análise",
          valorCobrado: null,
          dataCobrança: null,
          formaDeCobrança: null,
          statusCobrança: null,
          criadoEm: now.toISOString()
        };

        FileDatabase.add("vales", newVale, user.email);
        generatedValesCount++;

        // Audit the generated Vale
        FileDatabase.logAudit(
          user.email,
          "VALE_GERADO_AUTOMATICO",
          `Vale ${valeNum} gerado automaticamente para DT ${dt} (Falta do produto ${newVale.produto}, valor R$ ${newVale.valor.toFixed(2)}).`,
          unidadeId || ""
        );
      }

      res.json({
        success: true,
        closure: newClosure,
        generatedVales: generatedValesCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/vales", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });
      
      const vales = FileDatabase.get("vales") || [];
      const activeUnit = getRequestUnitContext(req, user);
      
      if (activeUnit === "Todas") {
        return res.json(vales);
      }
      return res.json(vales.filter((v: any) => v.unidadeId === activeUnit));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/vales/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const { id } = req.params;
      const current = (FileDatabase.get("vales") || []).find((v: any) => v.id === id);
      if (!current) {
        return res.status(404).json({ error: "Vale não encontrado." });
      }

      const updated = FileDatabase.update("vales", id, req.body, user.email);
      
      // Log audit details, especially status changes
      if (req.body.status && req.body.status !== current.status) {
        FileDatabase.logAudit(
          user.email,
          "VALE_STATUS_ALTERADO",
          `Status do Vale ${current.numeroVale} alterado de '${current.status}' para '${req.body.status}'.`,
          current.unidadeId || ""
        );
      } else {
        FileDatabase.logAudit(
          user.email,
          "VALE_ATUALIZADO",
          `Vale ${current.numeroVale} atualizado pelo usuário.`,
          current.unidadeId || ""
        );
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/vales/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const { id } = req.params;
      const current = (FileDatabase.get("vales") || []).find((v: any) => v.id === id);
      if (!current) {
        return res.status(404).json({ error: "Vale não encontrado." });
      }

      FileDatabase.delete("vales", id, user.email);

      FileDatabase.logAudit(
        user.email,
        "VALE_EXCLUIDO",
        `Vale corporativo ${current.numeroVale} excluído de forma manual e auditada do banco real.`,
        current.unidadeId || ""
      );

      res.json({ success: true, message: "Vale excluído com sucesso." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // NO SHOW API ROUTES
  // ----------------------------------------------------
  app.get("/api/noshows", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });
      const noshows = FileDatabase.get("noshows" as any) || [];
      const activeUnit = getRequestUnitContext(req, user);
      if (activeUnit === "Todas") {
        return res.json(noshows);
      }
      return res.json(noshows.filter((n: any) => n.unidadeId === activeUnit));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/noshows", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const {
        dt,
        motoristaId,
        veiculoId,
        placa,
        unidadeId,
        transportador,
        statusNoShow,
        data,
        motoristaSubstituto,
        veiculoSubstituto,
        transportadorSubstituto,
        observacoes,
      } = req.body;

      const newNoShow = {
        id: "ns-" + Date.now().toString(),
        dt,
        motoristaId,
        veiculoId,
        placa,
        unidadeId,
        transportador,
        statusNoShow: statusNoShow || "Aberto",
        motoristaSubstituto: motoristaSubstituto || "",
        veiculoSubstituto: veiculoSubstituto || "",
        transportadorSubstituto: transportadorSubstituto || "",
        observacoes: observacoes || "",
        data: data || new Date().toISOString().split("T")[0],
        usuarioResponsavel: user.email,
        createdAt: new Date().toISOString(),
      };

      const noshows = FileDatabase.get("noshows" as any) || [];
      noshows.push(newNoShow);
      FileDatabase.set("noshows" as any, noshows);

      FileDatabase.logAudit(
        user.email,
        "NOSHOW_REGISTRADO",
        `Registro de No Show cadastrado para a DT ${dt} com status: ${newNoShow.statusNoShow}.`,
        unidadeId || ""
      );

      res.status(201).json(newNoShow);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/noshows/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const { id } = req.params;
      const dbList = FileDatabase.get("noshows" as any) || [];
      const itemIdx = dbList.findIndex((n: any) => n.id === id);

      if (itemIdx === -1) {
        return res.status(404).json({ error: "Registro de no show não localizado." });
      }

      const existing = dbList[itemIdx];
      const updated = {
        ...existing,
        ...req.body,
        updatedAt: new Date().toISOString(),
      };

      dbList[itemIdx] = updated;
      FileDatabase.set("noshows" as any, dbList);

      FileDatabase.logAudit(
        user.email,
        "NOSHOW_ATUALIZADO",
        `No Show da DT ${existing.dt} atualizado para status: ${updated.statusNoShow}.`,
        existing.unidadeId || ""
      );

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/noshows/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const { id } = req.params;
      const dbList = FileDatabase.get("noshows" as any) || [];
      const existing = dbList.find((n: any) => n.id === id);

      if (!existing) {
        return res.status(404).json({ error: "No Show não localizado." });
      }

      const filtered = dbList.filter((n: any) => n.id !== id);
      FileDatabase.set("noshows" as any, filtered);

      FileDatabase.logAudit(
        user.email,
        "NOSHOW_EXCLUIDO",
        `Registro de No Show para a DT ${existing.dt} excluído.`,
        existing.unidadeId || ""
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auditoria", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const logs = FileDatabase.get("auditoria");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(logs);

    res.json(logs.filter(log => {
      const op = log.usuario ? log.usuario.toLowerCase() : "";
      return op.includes(user.email.toLowerCase()) || op.includes(user.id.toLowerCase()) || log.detalhes.toLowerCase().includes(activeUnit.toLowerCase());
    }));
  });

  // ----------------------------------------------------
  // MOCK FILE UPLOAD TO ENHANCE REAL-WORLD FEEL
  // ----------------------------------------------------
  app.post("/api/upload-document", (req, res) => {
    const { base64Data, filename, filetype } = req.body;
    // Returns a beautiful permanent mockup URL or localized Base64 reference
    // Since we want standard previews, we'll store the object and synthesize an active download link
    const simulatedUrl = base64Data || `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1500&auto=format&fit=crop`;
    res.json({
      success: true,
      url: simulatedUrl,
      filename,
      metadata: { uploadedAt: new Date().toISOString(), size: "2.4 MB" }
    });
  });

  // ----------------------------------------------------
  // Vite server Setup context
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TMS Server] Operational express logistics backend running on port http://localhost:${PORT}`);
  });
}

startServer();
