import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { FileDatabase, Usuario, Motorista, Veiculo, Rota, NotaFiscal, Manutencao, UsuarioUnidadePermissao, Unidade, MovimentacaoFinanceira } from "./server/database";

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

    // Intelligent suggestion system (Fase 4 metrics)
    const activeRangeDts = filteredRotasUnit.filter(r => r.data >= currentRange.start && r.data <= currentRange.end);
    const totalDtsWithSuggestions = activeRangeDts.filter(r => r.equipeSugeridaIds && r.equipeSugeridaIds.length > 0).length;
    const totalAcceptedSuggestions = activeRangeDts.filter(r => {
      if (!r.equipeSugeridaIds || r.equipeSugeridaIds.length === 0) return false;
      const sug = [...r.equipeSugeridaIds].sort().join(",");
      const uti = [...(r.ajudantesIds || [])].sort().join(",");
      return sug === uti;
    }).length;
    const adherenceRate = totalDtsWithSuggestions > 0 
      ? Math.round((totalAcceptedSuggestions / totalDtsWithSuggestions) * 100) 
      : 100;

    // Calculate Fleet Financial Metrics
    const currentMonthStr = currentRange.start.substring(0, 7); // e.g. "2026-06"
    let totalCreditosMes = 0;
    let totalDebitosMes = 0;
    const dbInstance = FileDatabase.getFull();
    const allVeiculos = dbInstance.veiculos || [];
    let maxSaldoNome = "Nenhum";
    let maxSaldoVal = 0;
    let maxDevedorNome = "Nenhum";
    let maxDevedorVal = 0;
    let totalBalancesCombined = 0;
    
    const processedVeiculos = allVeiculos.filter(filterUnit).map(v => {
      const movements = getMovementsForVehicle(dbInstance, v.id);
      
      movements.forEach(m => {
        if (m.data && m.data.startsWith(currentMonthStr)) {
          if (m.tipo === "Crédito") {
            totalCreditosMes += Number(m.valor || 0);
          } else {
            totalDebitosMes += Number(m.valor || 0);
          }
        }
      });
      
      const credTotal = movements.filter(m => m.tipo === "Crédito" && !m.faturado).reduce((acc, m) => acc + Number(m.valor || 0), 0);
      const debTotal = movements.filter(m => m.tipo === "Débito" && !m.faturado).reduce((acc, m) => acc + Number(m.valor || 0), 0);
      const balance = credTotal - debTotal;
      totalBalancesCombined += balance;
      
      const label = `${v.modelo} (${v.placa})`;
      if (balance > maxSaldoVal) {
        maxSaldoVal = balance;
        maxSaldoNome = label;
      }
      if (balance < maxDevedorVal) {
        maxDevedorVal = balance;
        maxDevedorNome = label;
      }
      return balance;
    });
    
    const totalMovimentadoMes = totalCreditosMes + totalDebitosMes;
    const mediaPorColaborador = processedVeiculos.length > 0 
      ? Math.round(totalBalancesCombined / processedVeiculos.length) 
      : 0;

    res.json({
      cards: {
        dtsWithSuggestionsCount: totalDtsWithSuggestions,
        acceptedSuggestionsCount: totalAcceptedSuggestions,
        adherenceRateSuggestions: adherenceRate,
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
      },
      financeiroKpis: {
        totalMovimentadoMes,
        creditosMes: totalCreditosMes,
        debitosMes: totalDebitosMes,
        maiorSaldo: maxSaldoVal,
        maiorSaldoNome: maxSaldoNome,
        maiorDevedor: Math.abs(maxDevedorVal),
        maiorDevedorNome: maxDevedorNome,
        mediaPorColaborador
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
    
    if (!isMaster) {
      // Get all unit IDs current user is authorized to access
      const allowedUnits = [
        user.unidadeId,
        user.unidade_id,
        ...permissoes.filter(p => p.usuario_id === user.id && p.ativo).map(p => p.unidade_id)
      ].filter(Boolean);
      
      const filteredUsers = usuarios.filter(u => {
        const uUnit = u.unidadeId || u.unidade_id;
        return uUnit && allowedUnits.includes(uUnit);
      });
      const mapped = filteredUsers.map(u => {
        const activePerms = permissoes
          .filter(p => p.usuario_id === u.id && p.ativo)
          .map(p => p.unidade_id);
        return {
          ...u,
          unidadesPermitidas: activePerms
        };
      });
      return res.json(mapped);
    }
    
    const mapped = usuarios.map(u => {
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

      item.statusFinal = FileDatabase.computeDriverStatus(item as Motorista);

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
      item.statusFinal = FileDatabase.computeDriverStatus(merged);
      item.statusConformidade = merged.statusConformidade;
      item.motivoBloqueio = merged.motivoBloqueio;

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
    const isRepeated = allRoutes.some((r: any) => r.dt === item.dt);

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

    // Intelligent Team Selection Auditor
    if (item.motoristaId) {
      const dbDrivers = FileDatabase.get("motoristas") || [];
      const mName = dbDrivers.find((x: any) => x.id === item.motoristaId)?.nome || item.motoristaId;
      const sugNames = (item.equipeSugeridaIds || []).map((id: string) => dbDrivers.find((x: any) => x.id === id)?.nome || id).join(", ") || "Nenhum";
      const utilNames = (item.ajudantesIds || []).map((id: string) => dbDrivers.find((x: any) => x.id === id)?.nome || id).join(", ") || "Nenhum";
      
      FileDatabase.logAudit(
        operator,
        "Formação de Equipe",
        `DT #${item.dt} - Motorista: ${mName} | Sugerido: [${sugNames}] | Utilizado: [${utilNames}]`
      );
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

    // Intelligent Team Selection Auditor for Edit
    if (item.motoristaId) {
      const dbDrivers = FileDatabase.get("motoristas") || [];
      const mName = dbDrivers.find((x: any) => x.id === item.motoristaId)?.nome || item.motoristaId;
      const sugNames = (item.equipeSugeridaIds || []).map((id: string) => dbDrivers.find((x: any) => x.id === id)?.nome || id).join(", ") || "Nenhum";
      const utilNames = (item.ajudantesIds || []).map((id: string) => dbDrivers.find((x: any) => x.id === id)?.nome || id).join(", ") || "Nenhum";
      
      FileDatabase.logAudit(
        operator,
        "Formação de Equipe (Edição)",
        `DT #${item.dt || current.dt} - Motorista: ${mName} | Sugerido: [${sugNames}] | Utilizado: [${utilNames}]`
      );
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
  // CONTAS A RECEBER / CENTRO DE RECEBIMENTOS API
  // ----------------------------------------------------
  app.get("/api/recebimentos", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const list = FileDatabase.get("contas_a_receber" as any) || [];
      const activeUnit = getRequestUnitContext(req, user);

      let filtered = [...list];
      if (activeUnit !== "Todas") {
        filtered = filtered.filter((r: any) => r.unidadeId === activeUnit);
      }

      // If contas_a_receber is completely empty, let's auto-generate some realistic ones from existing closed DTs!
      if (list.length === 0) {
        const fechamentos = FileDatabase.get("fechamentos_dt") || [];
        const nfs = FileDatabase.get("notas_fiscais") || [];
        const rotas = FileDatabase.get("rotas") || [];
        const motoristas = FileDatabase.get("motoristas") || [];
        const veiculos = FileDatabase.get("veiculos") || [];

        const clients = ["Heineken", "Ambev", "Coca-Cola Femsa", "Nestlé", "Kabin", "Pepsico", "Unilever"];
        const generated: any[] = [];

        fechamentos.forEach((f: any, idx: number) => {
          const associatedRoute = rotas.find((r: any) => r.dt === f.dt);
          const associatedNf = nfs.find((nf: any) => nf.dtId === f.id || nf.dtId === `DT-${f.dt}` || nf.dtId === f.dt);
          
          let clientName = associatedNf?.cliente || clients[idx % clients.length];
          const driverObj = motoristas.find((m: any) => m.id === f.motoristaId);
          const vehicleObj = veiculos.find((v: any) => v.id === f.veiculoId);

          const frete = f.freteValor !== undefined ? Number(f.freteValor) : 1850.00;
          const ped = f.pedagios !== undefined ? Number(f.pedagios) : 120.00;
          const diar = f.diariasBonificacoes !== undefined ? Number(f.diariasBonificacoes) : 0;
          const acresc = f.outrosCreditos !== undefined ? Number(f.outrosCreditos) : 0;
          const tot = frete + ped + diar + acresc;

          const deliveryDate = f.dataFechamento || "2026-06-19";
          const dParts = deliveryDate.split("-");
          let dueDate = deliveryDate;
          if (dParts.length === 3) {
            const d = new Date(Number(dParts[0]), Number(dParts[1]) - 1, Number(dParts[2]));
            d.setDate(d.getDate() + 30);
            dueDate = d.toISOString().split("T")[0];
          }

          let st: "A Receber" | "Recebido" | "Parcial" | "Vencido" | "Cancelado" | "Em Contestação" = "A Receber";
          if (idx % 3 === 0) {
            st = "Recebido";
          } else if (idx % 4 === 0) {
            st = "Parcial";
          } else {
            const todayStr = "2026-06-27";
            if (dueDate < todayStr) {
              st = "Vencido";
            }
          }

          const newTitle = {
            id: `REC-${f.dt || Math.floor(100000 + Math.random() * 900000)}`,
            dt: f.dt,
            cliente: clientName,
            veiculoId: f.veiculoId || (vehicleObj?.placa || "AAA-0000"),
            motoristaId: driverObj?.nome || f.motoristaId || "Motorista não identificado",
            origem: "Goiânia - Matriz",
            destino: "Anápolis - DF",
            valorFrete: frete,
            valorPedagiosReembolsaveis: ped,
            valorDiarias: diar,
            outrosAcrescimos: acresc,
            valorTotal: tot,
            dataEntrega: deliveryDate,
            dataVencimento: dueDate,
            status: st,
            responsavel: f.usuarioResponsavel || "Sistema",
            observacoes: `Gerado automaticamente a partir do faturamento da DT ${f.dt}`,
            unidadeId: f.unidadeId || "un-go",
            dataRecebimento: st === "Recebido" ? dueDate : (st === "Parcial" ? dueDate : undefined),
            valorRecebido: st === "Recebido" ? tot : (st === "Parcial" ? Math.round(tot * 0.4) : undefined),
            formaRecebimento: st === "Recebido" || st === "Parcial" ? "PIX" : undefined,
            observacaoBaixa: st === "Recebido" || st === "Parcial" ? "Baixa automática de teste" : undefined,
            historicoBaixas: st === "Recebido" ? [
              {
                data: dueDate,
                valor: tot,
                forma: "PIX",
                observacao: "Baixa automática integral",
                usuario: "financeiro@ampla.com"
              }
            ] : (st === "Parcial" ? [
              {
                data: dueDate,
                valor: Math.round(tot * 0.4),
                forma: "PIX",
                observacao: "Baixa parcial de 40%",
                usuario: "financeiro@ampla.com"
              }
            ] : [])
          };
          generated.push(newTitle);
        });

        if (generated.length > 0) {
          FileDatabase.set("contas_a_receber" as any, generated);
          filtered = activeUnit === "Todas" ? generated : generated.filter((r: any) => r.unidadeId === activeUnit);
        }
      }

      const fechamentos = FileDatabase.get("fechamentos_dt") || [];
      const enriched = filtered.map((r: any) => {
        const f = fechamentos.find((cl: any) => cl.dt === r.dt);
        
        // Receitas
        const valorFrete = r.valorFrete !== undefined ? Number(r.valorFrete) : (f?.freteValor !== undefined ? Number(f.freteValor) : 1850.00);
        const valorDisponibilidade = r.valorDisponibilidade !== undefined ? Number(r.valorDisponibilidade) : (f?.disponibilidadeValor !== undefined ? Number(f.disponibilidadeValor) : 0);
        const valorDescarga = r.valorDescarga !== undefined ? Number(r.valorDescarga) : (f?.houveReciboDescarga === "Sim" ? Number(f?.descargaValor || 0) : 0);
        const valorReentrega = r.valorReentrega !== undefined ? Number(r.valorReentrega) : (f?.reentregaValor !== undefined ? Number(f.reentregaValor) : 0);
        const outrasReceitas = r.outrasReceitas !== undefined ? Number(r.outrasReceitas) : (f?.outrosCreditos !== undefined ? Number(f.outrosCreditos) : 0);
        
        // Custos
        const valorVale = r.valorVale !== undefined ? Number(r.valorVale) : (f?.ocorrencias ? f.ocorrencias.filter((o: any) => o.tipo === "Falta de Mercadoria").reduce((sum: number, o: any) => sum + Number(o.valorTotal || 0), 0) : 0);
        const valorPedagio = r.valorPedagio !== undefined ? Number(r.valorPedagio) : (f?.pedagios !== undefined ? Number(f.pedagios) : 0);
        const valorAbastecimento = r.valorAbastecimento !== undefined ? Number(r.valorAbastecimento) : (f?.abastecimentoValor !== undefined ? Number(f.abastecimentoValor) : 0);
        const valorDescontos = r.valorDescontos !== undefined ? Number(r.valorDescontos) : (f?.multasDescontos !== undefined ? Number(f.multasDescontos) : 0);
        const valorChapas = r.valorChapas !== undefined ? Number(r.valorChapas) : (f?.descargaChapa !== undefined ? Number(f.descargaChapa) : 0);
        const outrosCustos = r.outrosCustos !== undefined ? Number(r.outrosCustos) : ((f?.lavagensHospedagens || 0) + (f?.alimentacao || 0) + (f?.manutencaoOutros || 0));

        const receitaTotal = valorFrete + valorDisponibilidade + valorDescarga + valorReentrega + outrasReceitas;
        const custoTotal = valorVale + valorPedagio + valorAbastecimento + valorDescontos + valorChapas + outrosCustos;
        const resultadoOperacional = receitaTotal - custoTotal;

        return {
          ...r,
          valorFrete,
          valorDisponibilidade,
          valorDescarga,
          valorReentrega,
          outrasReceitas,
          valorVale,
          valorPedagio,
          valorAbastecimento,
          valorDescontos,
          valorChapas,
          outrosCustos,
          receitaTotal,
          custoTotal,
          resultadoOperacional,
          valorTotal: receitaTotal
        };
      });

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/recebimentos", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR") {
        return res.status(403).json({ error: "Você não possui nível de permissão suficiente para realizar lançamentos." });
      }

      const item = req.body;
      const operator = user.email;

      if (!item.dt || !item.cliente || !item.valorTotal) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

      const list = FileDatabase.get("contas_a_receber" as any) || [];
      const newId = `REC-${item.dt}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newTitle = {
        id: newId,
        dt: item.dt,
        cliente: item.cliente,
        veiculoId: item.veiculoId || "AAA-0000",
        motoristaId: item.motoristaId || "Motorista",
        origem: item.origem || "Goiânia",
        destino: item.destino || "São Paulo",
        valorFrete: Number(item.valorFrete || 0),
        valorPedagiosReembolsaveis: Number(item.valorPedagiosReembolsaveis || 0),
        valorDiarias: Number(item.valorDiarias || 0),
        outrosAcrescimos: Number(item.outrosAcrescimos || 0),
        valorTotal: Number(item.valorTotal || 0),
        dataEntrega: item.dataEntrega || new Date().toISOString().split("T")[0],
        dataVencimento: item.dataVencimento || new Date().toISOString().split("T")[0],
        status: item.status || "A Receber",
        responsavel: operator,
        observacoes: item.observacoes || "",
        unidadeId: user.unidadeId !== "Todas" ? user.unidadeId : (item.unidadeId || "un-go"),
        historicoBaixas: []
      };

      list.push(newTitle);
      FileDatabase.set("contas_a_receber" as any, list);

      FileDatabase.logAudit(
        operator,
        "RECEBIMENTO_MANUAL_CRIADO",
        `Lançamento manual de faturamento criado para o cliente ${item.cliente}, DT: ${item.dt}, Valor: R$ ${item.valorTotal}.`,
        newTitle.unidadeId
      );

      res.json({ success: true, item: newTitle });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/recebimentos/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR") {
        return res.status(403).json({ error: "Você não possui nível de permissão suficiente para editar faturamentos." });
      }

      const list = FileDatabase.get("contas_a_receber" as any) || [];
      const idx = list.findIndex((x: any) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Título não localizado." });

      const current = list[idx];
      const updated = { ...current, ...req.body };
      list[idx] = updated;

      FileDatabase.set("contas_a_receber" as any, list);

      FileDatabase.logAudit(
        user.email,
        "RECEBIMENTO_ATUALIZADO",
        `Título faturado ${req.params.id} do cliente ${updated.cliente} foi alterado.`,
        updated.unidadeId
      );

      res.json({ success: true, item: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/recebimentos/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const profileType = user.tipo_usuario || "";
      if (profileType !== "MASTER" && user.perfil !== "admin_master") {
        return res.status(403).json({ error: "Apenas administradores MASTER podem expurgar faturamentos." });
      }

      const list = FileDatabase.get("contas_a_receber" as any) || [];
      const idx = list.findIndex((x: any) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Título não localizado." });

      const deleted = list.splice(idx, 1)[0];
      FileDatabase.set("contas_a_receber" as any, list);

      FileDatabase.logAudit(
        user.email,
        "RECEBIMENTO_EXPURGADO",
        `Título faturado ${req.params.id} do cliente ${deleted.cliente} foi expurgado sob segurança máxima.`,
        deleted.unidadeId
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/recebimentos/:id/receber", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR" || profileType === "SUPERVISOR") {
        return res.status(403).json({ error: "Nível de permissão insuficiente para efetuar baixas financeiras." });
      }

      const { data, valorRecebido, formaRecebimento, observacao } = req.body;
      if (!data || !valorRecebido || !formaRecebimento) {
        return res.status(400).json({ error: "Data, valor e forma de recebimento são obrigatórios." });
      }

      const list = FileDatabase.get("contas_a_receber" as any) || [];
      const idx = list.findIndex((x: any) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Título não localizado." });

      const current = list[idx];
      
      const previousPaid = (current.historicoBaixas || []).reduce((sum: number, b: any) => sum + Number(b.valor), 0);
      const remainingBalance = Number(current.valorTotal) - previousPaid;
      const newPaid = Number(valorRecebido);

      if (newPaid <= 0) {
        return res.status(400).json({ error: "O valor recebido deve ser maior que zero." });
      }

      if (newPaid > remainingBalance + 0.01) {
        return res.status(400).json({ error: `Valor recebido excede o saldo em aberto de R$ ${remainingBalance.toFixed(2)}.` });
      }

      const newBaixa = {
        data,
        valor: newPaid,
        forma: formaRecebimento,
        observacao: observacao || "",
        usuario: user.email
      };

      const newHistory = [...(current.historicoBaixas || []), newBaixa];
      const totalPaidUpdated = previousPaid + newPaid;
      
      let finalStatus: "Recebido" | "Parcial" = "Parcial";
      if (Math.abs(totalPaidUpdated - Number(current.valorTotal)) < 0.1) {
        finalStatus = "Recebido";
      }

      const updated = {
        ...current,
        status: finalStatus,
        dataRecebimento: data,
        valorRecebido: totalPaidUpdated,
        formaRecebimento: formaRecebimento,
        observacaoBaixa: observacao || "",
        historicoBaixas: newHistory
      };

      list[idx] = updated;
      FileDatabase.set("contas_a_receber" as any, list);

      FileDatabase.logAudit(
        user.email,
        "RECEBIMENTO_BAIXA",
        `Baixa ${finalStatus === "Recebido" ? "total" : "parcial"} efetuada no faturamento ${current.id} do cliente ${current.cliente}. Recebeu R$ ${newPaid}.`,
        current.unidadeId
      );

      const currentMovements = FileDatabase.get("movimentacoes_financeiras") || [];
      const newMovement = {
        id: `MOV-REC-${Date.now()}`,
        pessoaId: current.cliente,
        data: data,
        hora: new Date().toTimeString().split(" ")[0],
        tipo: "Crédito" as "Crédito",
        origem: "Recebimento Cliente" as string,
        valor: newPaid,
        observacao: `Recebimento Ref: ${current.id} • DT: ${current.dt} • Cliente: ${current.cliente}`,
        saldoAnterior: 0,
        saldoPosterior: 0,
        usuario: user.email,
        dtId: current.dt,
        criadoEm: new Date().toISOString()
      };
      currentMovements.push(newMovement);
      FileDatabase.set("movimentacoes_financeiras", currentMovements);

      res.json({ success: true, item: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // CONTAS A PAGAR / CENTRO DE PAGAMENTOS API
  // ----------------------------------------------------
  app.get("/api/pagamentos", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const list = FileDatabase.get("contas_a_pagar" as any) || [];
      const activeUnit = getRequestUnitContext(req, user);

      let filtered = [...list];
      if (activeUnit !== "Todas") {
        filtered = filtered.filter((r: any) => r.unidadeId === activeUnit);
      }

      // If contas_a_pagar is completely empty, auto-generate realistic ones from existing closed DTs (not Frota Própria)!
      if (list.length === 0) {
        const fechamentos = FileDatabase.get("fechamentos_dt") || [];
        const rotas = FileDatabase.get("rotas") || [];
        const motoristas = FileDatabase.get("motoristas") || [];
        const veiculos = FileDatabase.get("veiculos") || [];
        const generated: any[] = [];

        fechamentos.forEach((f: any, idx: number) => {
          const associatedRoute = rotas.find((r: any) => r.dt === f.dt);
          const associatedVeiculo = veiculos.find((v: any) => v.id === f.veiculoId || v.placa === f.veiculoId);
          
          // Only create for third-party or aggregated vehicles
          if (associatedVeiculo && associatedVeiculo.tipo === "Frota Própria") {
            return;
          }

          const driverObj = motoristas.find((m: any) => m.id === f.motoristaId);
          const driverName = driverObj?.nome || f.motoristaId || "Motorista";

          const fretePagar = f.freteValor !== undefined ? Number(f.freteValor) : 1850.00;
          const disp = f.disponibilidadeValor !== undefined ? Number(f.disponibilidadeValor) : 0.00;
          const diar = f.diariasBonificacoes !== undefined ? Number(f.diariasBonificacoes) : 0.00;
          const adiantamentosVal = f.adiantamentos !== undefined ? Number(f.adiantamentos) : 250.00;
          const valDescontos = f.multasDescontos !== undefined ? Number(f.multasDescontos) : 0.00;
          const payTotal = (fretePagar + disp + diar) - (adiantamentosVal + valDescontos);

          const dateStr = f.dataAcerto || new Date().toISOString().split("T")[0];
          let dueDate = dateStr;
          try {
            const d = new Date(dateStr + "T12:00:00");
            d.setDate(d.getDate() + 15);
            dueDate = d.toISOString().split("T")[0];
          } catch (e) {}

          const payableObj = {
            id: `PAG-${f.dt}-${1000 + idx}`,
            dt: f.dt,
            cliente: "Heineken",
            motoristaId: f.motoristaId || "mot-1",
            motoristaNome: driverName,
            veiculoId: f.veiculoId || "AAA-0000",
            unidadeId: f.unidadeId || "un-go",
            valorFrete: fretePagar,
            valorDisponibilidade: disp,
            valorDiarias: diar,
            adiantamentos: adiantamentosVal,
            multasDescontos: valDescontos,
            valorTotal: payTotal,
            status: "A Pagar",
            dataGeracao: dateStr,
            dataVencimento: dueDate,
            responsavel: "sistema@ampla.com.br",
            observacoes: `Gerado automaticamente a partir do acerto de viagem da DT ${f.dt}`,
            historicoBaixas: []
          };

          generated.push(payableObj);
        });

        if (generated.length > 0) {
          FileDatabase.set("contas_a_pagar" as any, generated);
          filtered = activeUnit !== "Todas" ? generated.filter((r: any) => r.unidadeId === activeUnit) : generated;
        }
      }

      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/pagamentos", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR") {
        return res.status(403).json({ error: "Você não possui nível de permissão suficiente para realizar lançamentos." });
      }

      const item = req.body;
      const operator = user.email;

      if (!item.dt || !item.motoristaNome || !item.valorTotal) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

      const list = FileDatabase.get("contas_a_pagar" as any) || [];
      const newId = `PAG-${item.dt}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newTitle = {
        id: newId,
        dt: item.dt,
        cliente: item.cliente || "Heineken",
        motoristaId: item.motoristaId || "manual",
        motoristaNome: item.motoristaNome,
        veiculoId: item.veiculoId || "AAA-0000",
        unidadeId: user.unidadeId !== "Todas" ? user.unidadeId : (item.unidadeId || "un-go"),
        valorFrete: Number(item.valorFrete || 0),
        valorDisponibilidade: Number(item.valorDisponibilidade || 0),
        valorDiarias: Number(item.valorDiarias || 0),
        adiantamentos: Number(item.adiantamentos || 0),
        multasDescontos: Number(item.multasDescontos || 0),
        valorTotal: Number(item.valorTotal || 0),
        status: item.status || "A Pagar",
        dataGeracao: item.dataGeracao || new Date().toISOString().split("T")[0],
        dataVencimento: item.dataVencimento || new Date().toISOString().split("T")[0],
        responsavel: operator,
        observacoes: item.observacoes || "",
        historicoBaixas: []
      };

      list.push(newTitle);
      FileDatabase.set("contas_a_pagar" as any, list);

      FileDatabase.logAudit(
        operator,
        "PAGAMENTO_MANUAL_CRIADO",
        `Lançamento manual de pagamento criado para o motorista ${item.motoristaNome}, DT: ${item.dt}, Valor: R$ ${item.valorTotal}.`,
        newTitle.unidadeId
      );

      res.json({ success: true, item: newTitle });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/pagamentos/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR") {
        return res.status(403).json({ error: "Você não possui nível de permissão suficiente para editar pagamentos." });
      }

      const list = FileDatabase.get("contas_a_pagar" as any) || [];
      const idx = list.findIndex((x: any) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Título não localizado." });

      const current = list[idx];
      const updated = { ...current, ...req.body };
      list[idx] = updated;

      FileDatabase.set("contas_a_pagar" as any, list);

      FileDatabase.logAudit(
        user.email,
        "PAGAMENTO_ATUALIZADO",
        `Título a pagar ${req.params.id} do motorista ${updated.motoristaNome} foi alterado.`,
        updated.unidadeId
      );

      res.json({ success: true, item: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/pagamentos/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const profileType = user.tipo_usuario || "";
      if (profileType !== "MASTER" && user.perfil !== "admin_master") {
        return res.status(403).json({ error: "Apenas administradores MASTER podem expurgar pagamentos." });
      }

      const list = FileDatabase.get("contas_a_pagar" as any) || [];
      const idx = list.findIndex((x: any) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Título não localizado." });

      const deleted = list.splice(idx, 1)[0];
      FileDatabase.set("contas_a_pagar" as any, list);

      FileDatabase.logAudit(
        user.email,
        "PAGAMENTO_EXPURGADO",
        `Título a pagar ${req.params.id} do motorista ${deleted.motoristaNome} foi expurgado sob segurança máxima.`,
        deleted.unidadeId
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/pagamentos/:id/pagar", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR" || profileType === "SUPERVISOR") {
        return res.status(403).json({ error: "Nível de permissão insuficiente para efetuar baixas financeiras." });
      }

      const { data, valorPago, formaPagamento, observacao } = req.body;
      if (!data || !valorPago || !formaPagamento) {
        return res.status(400).json({ error: "Data, valor e forma de pagamento são obrigatórios." });
      }

      const list = FileDatabase.get("contas_a_pagar" as any) || [];
      const idx = list.findIndex((x: any) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Título não localizado." });

      const current = list[idx];
      
      const previousPaid = (current.historicoBaixas || []).reduce((sum: number, b: any) => sum + Number(b.valor), 0);
      const remainingBalance = Number(current.valorTotal) - previousPaid;
      const newPaid = Number(valorPago);

      if (newPaid <= 0) {
        return res.status(400).json({ error: "O valor pago deve ser maior que zero." });
      }

      if (newPaid > remainingBalance + 0.01) {
        return res.status(400).json({ error: `Valor pago excede o saldo em aberto de R$ ${remainingBalance.toFixed(2)}.` });
      }

      const newBaixa = {
        data,
        valor: newPaid,
        forma: formaPagamento,
        observacao: observacao || "",
        usuario: user.email
      };

      const newHistory = [...(current.historicoBaixas || []), newBaixa];
      const totalPaidUpdated = previousPaid + newPaid;
      
      let finalStatus: "Pago" | "Parcial" = "Parcial";
      if (Math.abs(totalPaidUpdated - Number(current.valorTotal)) < 0.1) {
        finalStatus = "Pago";
      }

      const updated = {
        ...current,
        status: finalStatus,
        dataPagamento: data,
        valorPago: totalPaidUpdated,
        formaPagamento: formaPagamento,
        observacaoBaixa: observacao || "",
        historicoBaixas: newHistory
      };

      list[idx] = updated;
      FileDatabase.set("contas_a_pagar" as any, list);

      FileDatabase.logAudit(
        user.email,
        "PAGAMENTO_BAIXA",
        `Baixa ${finalStatus === "Pago" ? "total" : "parcial"} efetuada no pagamento ${current.id} do motorista ${current.motoristaNome}. Pagou R$ ${newPaid}.`,
        current.unidadeId
      );

      const currentMovements = FileDatabase.get("movimentacoes_financeiras") || [];
      const newMovement = {
        id: `MOV-PAG-${Date.now()}`,
        pessoaId: current.motoristaNome,
        data: data,
        hora: new Date().toTimeString().split(" ")[0],
        tipo: "Débito" as "Débito",
        origem: "Pagamento Motorista" as string,
        valor: newPaid,
        observacao: `Pagamento Ref: ${current.id} • DT: ${current.dt} • Motorista: ${current.motoristaNome}`,
        saldoAnterior: 0,
        saldoPosterior: 0,
        usuario: user.email,
        dtId: current.dt,
        criadoEm: new Date().toISOString()
      };
      currentMovements.push(newMovement);
      FileDatabase.set("movimentacoes_financeiras", currentMovements);

      res.json({ success: true, item: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
  // ABASTECIMENTOS API
  // ----------------------------------------------------
  app.get("/api/abastecimentos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const list = FileDatabase.get("abastecimentos") || [];
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter((a: any) => a.unidadeId === activeUnit));
  });

  app.post("/api/abastecimentos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const item = req.body;
    item.id = item.id || `abs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const operator = user.email;

    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }

    const added = FileDatabase.add("abastecimentos", item, operator);

    // Log to Audit
    const auditDetail = `Abastecimento Registrado - Veículo: ${item.placa} | Combustível: ${item.combustivel} | Litros: ${item.litros}L | Valor: R$ ${item.valor} | Posto: ${item.posto}`;
    FileDatabase.logAudit(
      user.email,
      "ABASTECIMENTO_CRIADO",
      auditDetail,
      user.unidadeId || item.unidadeId || ""
    );

    res.json(added);
  });

  app.delete("/api/abastecimentos/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });

    const currentList = FileDatabase.get("abastecimentos") || [];
    const found = currentList.find((x: any) => x.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Abastecimento não encontrado." });
    }

    if (user.perfil !== "admin_master" && found.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Você não tem permissão para excluir abastecimento de outra unidade." });
    }

    const operator = user.email;
    FileDatabase.delete("abastecimentos", req.params.id, operator);

    const auditDetail = `Abastecimento Excluído - ID: ${found.id} | Veículo: ${found.placa} | Combustível: ${found.combustivel} | Litros: ${found.litros}L | Valor: R$ ${found.valor}`;
    FileDatabase.logAudit(
      user.email,
      "ABASTECIMENTO_EXCLUIDO",
      auditDetail,
      user.unidadeId || found.unidadeId || ""
    );

    res.json({ success: true, message: "Abastecimento excluído com sucesso." });
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

  // ----------------------------------------------------
  // DOCUMENTOS CENTRAL APIs (v2.2)
  // ----------------------------------------------------
  app.get("/api/documentos/historico", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });
      const hist = FileDatabase.get("historico_documentos" as any) || [];
      res.json(hist);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/documentos/renovar", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const {
        pessoaId,
        documentoTipo,
        novaValidade,
        novoArquivo,
        motivo
      } = req.body;

      if (!pessoaId || !documentoTipo) {
        return res.status(400).json({ error: "Parâmetros pessoaId e documentoTipo são obrigatórios." });
      }

      const db = FileDatabase.getFull();
      const motorista = db.motoristas.find((m: any) => m.id === pessoaId);
      if (!motorista) {
        return res.status(404).json({ error: "Profissional não encontrado." });
      }

      // Identify property names
      let validadeProp = "";
      let urlProp = "";
      let statusProp = "";

      switch (documentoTipo) {
        case "CNH":
          validadeProp = "cnhVencimento";
          urlProp = "cnhDocumentoUrl";
          break;
        case "ASO":
          validadeProp = "asoVencimento";
          urlProp = "asoDocumentoUrl";
          statusProp = "aso";
          break;
        case "Integração":
          validadeProp = "integracaoVencimento";
          urlProp = "integracaoDocumentoUrl";
          statusProp = "integracao";
          break;
        case "Pesquisa GR":
          validadeProp = "pesquisaVencimento";
          urlProp = "pesquisaDocumentoUrl";
          statusProp = "pesquisa";
          break;
        case "MOPP":
          validadeProp = "moppVencimento";
          urlProp = "moppDocumentoUrl";
          statusProp = "mopp";
          break;
        case "Toxicológico":
          validadeProp = "toxicologicoVencimento";
          urlProp = "toxicologicoDocumentoUrl";
          statusProp = "toxicologico";
          break;
        case "Ficha EPI":
          validadeProp = "fichaEpiVencimento";
          urlProp = "fichaEpiDocumentoUrl";
          statusProp = "fichaEpi";
          break;
        case "Documento Pessoal":
          validadeProp = "documentoPessoalVencimento";
          urlProp = "documentoPessoalDocumentoUrl";
          statusProp = "documentoPessoal";
          break;
        case "Comprovante":
          validadeProp = "comprovanteVencimento";
          urlProp = "comprovanteDocumentoUrl";
          statusProp = "comprovante";
          break;
        case "Foto":
          validadeProp = "fotoVencimento";
          urlProp = "fotoDocumentoUrl";
          statusProp = "foto";
          break;
        default:
          return res.status(400).json({ error: "Tipo de documento inválido." });
      }

      const arquivoAntigo = motorista[urlProp] || "Nenhum";
      const validadeAnterior = motorista[validadeProp] || "Nenhuma";

      // Perform updates
      const updatedFields: any = {};
      if (urlProp) {
        updatedFields[urlProp] = novoArquivo || `${documentoTipo.toLowerCase()}_renovado.pdf`;
      }
      if (validadeProp && novaValidade) {
        updatedFields[validadeProp] = novaValidade;
      }
      if (statusProp) {
        updatedFields[statusProp] = "Feito";
      }

      // Update motorista
      FileDatabase.update("motoristas", pessoaId, updatedFields, user.email);

      // Create historical entry
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0];

      const histItem = {
        id: `hist-doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        pessoaId,
        pessoaNome: motorista.nome,
        documentoTipo,
        dataTroca: `${dateStr} ${timeStr}`,
        usuarioResponsavel: user.nome || user.email,
        arquivoAntigo,
        arquivoNovo: novoArquivo || `${documentoTipo.toLowerCase()}_renovado.pdf`,
        validadeAnterior,
        novaValidade: novaValidade || "Nenhuma",
        motivo: motivo || ""
      };

      if (!db.historico_documentos) {
        db.historico_documentos = [];
      }
      db.historico_documentos.push(histItem);
      FileDatabase.write(db);
      FileDatabase.asyncWriteToSupabase("historico_documentos" as any, db.historico_documentos);

      // Recalculate alerts & statuses
      FileDatabase.recalculateAlerts(db);
      FileDatabase.write(db);

      res.json({
        success: true,
        motorista: db.motoristas.find((m: any) => m.id === pessoaId),
        history: histItem
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
        statusFechamento,
        
        // New Recibo de Descarga (AMPLA v2.2 - Fase 11)
        houveReciboDescarga,
        descargaCliente,
        descargaCodigoCliente,
        descargaNumeroNF,
        descargaValor,
        descargaData,
        descargaObservacoes,
        descargaReciboFile,
        descargaResponsavel,

        // New financial inputs
        reentregaValor,
        abastecimentoValor
      } = req.body;

      if (!dt) {
        return res.status(400).json({ error: "Número da DT é obrigatório." });
      }

      // Protocol counter generator
      const getNextProtocol = (): string => {
        const closures = FileDatabase.get("fechamentos_dt") || [];
        let maxProtocolNum = 0;
        
        for (const c of closures) {
          if (c.protocoloFechamento) {
            const pNum = parseInt(c.protocoloFechamento, 10);
            if (!isNaN(pNum) && pNum > maxProtocolNum) {
              maxProtocolNum = pNum;
            }
          }
          if (c.historicoFechamentos) {
            for (const h of c.historicoFechamentos) {
              if (h.protocolo) {
                const pNum = parseInt(h.protocolo, 10);
                if (!isNaN(pNum) && pNum > maxProtocolNum) {
                  maxProtocolNum = pNum;
                }
              }
            }
          }
        }

        const counterFilePath = path.join(process.cwd(), "data", "protocol_counter.json");
        let fileCounter = 0;
        try {
          if (fs.existsSync(counterFilePath)) {
            const data = JSON.parse(fs.readFileSync(counterFilePath, "utf8"));
            if (typeof data.counter === "number") {
              fileCounter = data.counter;
            }
          }
        } catch (e) {
          console.error("Error reading protocol counter file:", e);
        }

        const nextNum = Math.max(maxProtocolNum, fileCounter, 10540) + 1;

        try {
          const dataDir = path.join(process.cwd(), "data");
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          fs.writeFileSync(counterFilePath, JSON.stringify({ counter: nextNum }), "utf8");
        } catch (e) {
          console.error("Error writing protocol counter file:", e);
        }

        return String(nextNum).padStart(5, "0");
      };

      // Check if already closed (unless it is in EM_ABERTO status)
      const existing = (FileDatabase.get("fechamentos_dt") || []).find((c: any) => c.dt === dt);
      if (existing && existing.statusFechamento !== "EM_ABERTO") {
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

      const nextProtocol = getNextProtocol();

      const newHistoryItem = {
        protocolo: nextProtocol,
        acao: "FECHAMENTO",
        usuario: user.email,
        data: dateStr,
        hora: timeStr,
        motivo: existing ? "Novo fechamento após reabertura." : "Primeiro fechamento.",
        snapshot: {
          freteValor: req.body.freteValor !== undefined ? Number(req.body.freteValor) : 0,
          adiantamentos: req.body.adiantamentos !== undefined ? Number(req.body.adiantamentos) : 0,
          vales: resolvedOcorrencias.filter((o: any) => o.tipo === "Falta de Mercadoria"),
          multasDescontos: req.body.multasDescontos !== undefined ? Number(req.body.multasDescontos) : 0,
          statusFechamento: resolvedStatus
        }
      };

      const history = existing ? [...(existing.historicoFechamentos || []), newHistoryItem] : [newHistoryItem];

      const closureData = {
        dataFechamento: dateStr,
        horaFechamento: timeStr,
        usuarioResponsavel: user.email,
        usuarioFechamento: user.email,
        protocoloFechamento: nextProtocol,
        historicoFechamentos: history,
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
        criadoEm: existing ? existing.criadoEm : now.toISOString(),
        atualizadoEm: now.toISOString(),
        
        // Phase 5 financial structure fields (Bloco 1 & Bloco 2)
        freteValor: req.body.freteValor !== undefined ? Number(req.body.freteValor) : undefined,
        valorFaturado: req.body.valorFaturado !== undefined ? Number(req.body.valorFaturado) : undefined,
        disponibilidadeValor: req.body.disponibilidadeValor !== undefined ? Number(req.body.disponibilidadeValor) : undefined,
        diariasBonificacoes: req.body.diariasBonificacoes !== undefined ? Number(req.body.diariasBonificacoes) : undefined,
        adiantamentos: req.body.adiantamentos !== undefined ? Number(req.body.adiantamentos) : undefined,
        outrosCreditos: req.body.outrosCreditos !== undefined ? Number(req.body.outrosCreditos) : undefined,
        multasDescontos: req.body.multasDescontos !== undefined ? Number(req.body.multasDescontos) : undefined,
        descargaChapa: req.body.descargaChapa !== undefined ? Number(req.body.descargaChapa) : undefined,
        pedagios: req.body.pedagios !== undefined ? Number(req.body.pedagios) : undefined,
        lavagensHospedagens: req.body.lavagensHospedagens !== undefined ? Number(req.body.lavagensHospedagens) : undefined,
        alimentacao: req.body.alimentacao !== undefined ? Number(req.body.alimentacao) : undefined,
        manutencaoOutros: req.body.manutencaoOutros !== undefined ? Number(req.body.manutencaoOutros) : undefined,

        // AMPLA v2.2 - Fase 11 - Descarga and financial enhancements
        houveReciboDescarga: req.body.houveReciboDescarga || "Não",
        descargaCliente: req.body.descargaCliente || "",
        descargaCodigoCliente: req.body.descargaCodigoCliente || "",
        descargaNumeroNF: req.body.descargaNumeroNF || "",
        descargaValor: req.body.descargaValor !== undefined ? Number(req.body.descargaValor) : 0,
        descargaData: req.body.descargaData || "",
        descargaObservacoes: req.body.descargaObservacoes || "",
        descargaReciboFile: req.body.descargaReciboFile || "",
        descargaResponsavel: req.body.descargaResponsavel || "",
        reentregaValor: req.body.reentregaValor !== undefined ? Number(req.body.reentregaValor) : 0,
        abastecimentoValor: req.body.abastecimentoValor !== undefined ? Number(req.body.abastecimentoValor) : 0
      };

      let finalClosure: any;
      if (existing) {
        finalClosure = { ...existing, ...closureData };
        FileDatabase.update("fechamentos_dt", existing.id, closureData, user.email);
      } else {
        finalClosure = {
          id: `cl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          dt,
          ...closureData
        };
        FileDatabase.add("fechamentos_dt", finalClosure, user.email);
      }

      // Audit DT closure
      FileDatabase.logAudit(
        user.email,
        "FECHAMENTO_DT_CRIADO",
        `Fechamento residencial efetuado para a DT ${dt} com protocolo ${nextProtocol} e status: ${resolvedStatus}.`,
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

      // FASE 7 & AMPLA v2.2 Fase 11 - Automatic accounts receivable creation/update
      try {
        const contas = FileDatabase.get("contas_a_receber" as any) || [];
        const existingReceivableIndex = contas.findIndex((c: any) => c.dt === dt);
        
        const nfs = FileDatabase.get("notas_fiscais") || [];
        const motoristas = FileDatabase.get("motoristas") || [];
        
        const associatedNf = nfs.find((nf: any) => nf.dtId === `DT-${dt}` || nf.dtId === dt);
        const clientName = associatedNf?.cliente || (houveReciboDescarga === "Sim" && descargaCliente ? descargaCliente : "Cliente Não Definido");
        
        const driverObj = motoristas.find((m: any) => m.id === motoristaId);
        const driverName = driverObj?.nome || motoristaId || "Motorista";

        // Separate Client's Billing (Receivable) and Driver's Freight (Payable)
        const valorFaturadoInput = req.body.valorFaturado !== undefined ? Number(req.body.valorFaturado) : undefined;
        const freteFaturado = valorFaturadoInput !== undefined ? valorFaturadoInput : (req.body.freteValor !== undefined ? Number(req.body.freteValor) : 1850.00);

        const fretePagar = req.body.freteValor !== undefined ? Number(req.body.freteValor) : 1850.00;
        const ped = req.body.pedagios !== undefined ? Number(req.body.pedagios) : 0.00;
        const diar = req.body.diariasBonificacoes !== undefined ? Number(req.body.diariasBonificacoes) : 0.00;
        const acresc = req.body.outrosCreditos !== undefined ? Number(req.body.outrosCreditos) : 0.00;
        const disp = req.body.disponibilidadeValor !== undefined ? Number(req.body.disponibilidadeValor) : 0.00;
        const desc = (houveReciboDescarga === "Sim" && descargaValor) ? Number(descargaValor) : 0.00;
        const reent = req.body.reentregaValor !== undefined ? Number(req.body.reentregaValor) : 0.00;

        // Custos
        const valVale = resolvedOcorrencias
          .filter((o: any) => o.tipo === "Falta de Mercadoria")
          .reduce((sum: number, o: any) => sum + Number(o.valorTotal || 0), 0);
        const valPedagio = ped;
        const valAbastecimento = req.body.abastecimentoValor !== undefined ? Number(req.body.abastecimentoValor) : 0.00;
        const valDescontos = req.body.multasDescontos !== undefined ? Number(req.body.multasDescontos) : 0.00;
        const valChapas = req.body.descargaChapa !== undefined ? Number(req.body.descargaChapa) : 0.00;
        const valOutrosCustos = Number(req.body.lavagensHospedagens || 0) + Number(req.body.alimentacao || 0) + Number(req.body.manutencaoOutros || 0);

        // Revenue is calculated based on the client's faturamento
        const recTotal = freteFaturado + disp + desc + reent + acresc;
        const cstTotal = valVale + valPedagio + valAbastecimento + valDescontos + valChapas + valOutrosCustos;
        const resOperacional = recTotal - cstTotal;

        const dParts = dateStr.split("-");
        let dueDate = dateStr;
        if (dParts.length === 3) {
          const d = new Date(Number(dParts[0]), Number(dParts[1]) - 1, Number(dParts[2]));
          d.setDate(d.getDate() + 30);
          dueDate = d.toISOString().split("T")[0];
        }

        // Heineken Specificities (AJUSTE 04)
        let finalClient = clientName;
        let finalEmpresa = "Ampla Logística";
        let finalOrigem = "Fechamento de DT";

        if (clientName && clientName.toLowerCase().includes("heineken")) {
          finalClient = "Heineken";
          finalEmpresa = "Heineken Brasil";
        }

        const receivableObj = {
          id: `REC-${dt}`,
          dt: dt,
          cliente: finalClient,
          empresa: finalEmpresa,
          veiculoId: veiculoId || "AAA-0000",
          motoristaId: driverName,
          origem: finalOrigem,
          destino: "São Paulo - Capital",
          
          // Detailed financial fields
          valorFrete: freteFaturado,
          valorPedagiosReembolsaveis: ped,
          valorDiarias: diar,
          outrosAcrescimos: acresc,
          valorDisponibilidade: disp,
          valorDescarga: desc,
          valorReentrega: reent,
          outrasReceitas: acresc,
          
          valorVale: valVale,
          valorPedagio: valPedagio,
          valorAbastecimento: valAbastecimento,
          valorDescontos: valDescontos,
          valorChapas: valChapas,
          outrosCustos: valOutrosCustos,
          
          receitaTotal: recTotal,
          custoTotal: cstTotal,
          resultadoOperacional: resOperacional,
          valorTotal: recTotal, // Total receivable is the total revenue

          dataEntrega: dateStr,
          dataVencimento: dueDate,
          responsavel: user.email,
          observacoes: `Gerado automaticamente a partir do faturamento da DT ${dt}`,
          unidadeId: unidadeId || "un-go"
        };

        if (existingReceivableIndex >= 0) {
          // Preserve status, historicoBaixas, etc.
          const old = contas[existingReceivableIndex];
          contas[existingReceivableIndex] = {
            ...old,
            ...receivableObj,
            status: old.status || "A Receber",
            historicoBaixas: old.historicoBaixas || [],
            dataRecebimento: old.dataRecebimento,
            valorRecebido: old.valorRecebido,
            formaRecebimento: old.formaRecebimento,
            observacaoBaixa: old.observacaoBaixa
          };
          FileDatabase.set("contas_a_receber" as any, contas);

          FileDatabase.logAudit(
            user.email,
            "RECEBIMENTO_ATUALIZADO_AUTOMATICO",
            `Título de Contas a Receber REC-${dt} atualizado automaticamente. Receita Total: R$ ${recTotal.toFixed(2)}, Custos: R$ ${cstTotal.toFixed(2)}, Resultado: R$ ${resOperacional.toFixed(2)}.`,
            unidadeId || ""
          );
        } else {
          const newReceivable = {
            ...receivableObj,
            status: "A Receber",
            historicoBaixas: []
          };
          contas.push(newReceivable);
          FileDatabase.set("contas_a_receber" as any, contas);

          FileDatabase.logAudit(
            user.email,
            "RECEBIMENTO_GERADO_AUTOMATICO",
            `Título de Contas a Receber REC-${dt} gerado automaticamente para o cliente ${finalClient}. Receita: R$ ${recTotal.toFixed(2)}, Custos: R$ ${cstTotal.toFixed(2)}.`,
            unidadeId || ""
          );
        }

        // Process Contas a Pagar (AJUSTE 03)
        const allVeiculos = FileDatabase.get("veiculos") || [];
        const matchedVeiculo = allVeiculos.find((v: any) => v.id === veiculoId || v.placa === veiculoId);
        const isFrotaPropria = matchedVeiculo?.tipo === "Frota Própria";

        const contasPagar = FileDatabase.get("contas_a_pagar" as any) || [];
        const existingPayableIndex = contasPagar.findIndex((c: any) => c.dt === dt);

        if (isFrotaPropria) {
          // If the vehicle is Frota Própria, do not register accounts payable.
          // Remove any old entry for this DT.
          if (existingPayableIndex >= 0) {
            contasPagar.splice(existingPayableIndex, 1);
            FileDatabase.set("contas_a_pagar" as any, contasPagar);
            FileDatabase.logAudit(
              user.email,
              "PAGAMENTO_DELETADO_FROTA_PROPRIA",
              `Título de Contas a Pagar para DT ${dt} foi removido pois o veículo é de Frota Própria.`,
              unidadeId || ""
            );
          }
        } else {
          // Calculate payTotal = (fretePagar + disp + diar) - (adiantamentos + multasDescontos)
          const adiantamentosVal = req.body.adiantamentos !== undefined ? Number(req.body.adiantamentos) : 0.00;
          const payTotal = (fretePagar + disp + diar) - (adiantamentosVal + valDescontos);

          const payableObj = {
            id: `PAG-${dt}`,
            dt: dt,
            cliente: finalClient,
            motoristaId: motoristaId,
            motoristaNome: driverName,
            veiculoId: veiculoId || "AAA-0000",
            unidadeId: unidadeId || "un-go",
            valorFrete: fretePagar,
            valorDisponibilidade: disp,
            valorDiarias: diar,
            adiantamentos: adiantamentosVal,
            multasDescontos: valDescontos,
            valorTotal: payTotal,
            status: "A Pagar",
            dataGeracao: dateStr,
            dataVencimento: dueDate,
            responsavel: user.email,
            observacoes: `Gerado automaticamente a partir do acerto de viagem da DT ${dt}`
          };

          if (existingPayableIndex >= 0) {
            const oldP = contasPagar[existingPayableIndex];
            contasPagar[existingPayableIndex] = {
              ...oldP,
              ...payableObj,
              status: oldP.status || "A Pagar"
            };
          } else {
            contasPagar.push(payableObj);
          }
          FileDatabase.set("contas_a_pagar" as any, contasPagar);

          FileDatabase.logAudit(
            user.email,
            "PAGAMENTO_GERADO_AUTOMATICO",
            `Título de Contas a Pagar PAG-${dt} gerado/atualizado automaticamente para o motorista ${driverName}. Valor Total a Pagar: R$ ${payTotal.toFixed(2)}.`,
            unidadeId || ""
          );
        }
      } catch (autoErr: any) {
        console.error("Erro ao gerar/atualizar conta a receber/pagar automática:", autoErr);
      }

      res.json({
        success: true,
        closure: finalClosure,
        generatedVales: generatedValesCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fechamentos_dt/reabrir", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const { dt, motivo, protocolo } = req.body;
      if (!dt) {
        return res.status(400).json({ error: "Número da DT é obrigatório." });
      }
      if (!motivo || !motivo.trim()) {
        return res.status(400).json({ error: "Motivo da reabertura é obrigatório." });
      }
      if (!protocolo || !protocolo.trim()) {
        return res.status(400).json({ error: "Protocolo de fechamento é obrigatório para reabertura." });
      }

      // Check closure existence
      const closures = FileDatabase.get("fechamentos_dt") || [];
      const existing = closures.find((c: any) => c.dt === dt);
      if (!existing) {
        return res.status(404).json({ error: "DT não localizada." });
      }

      const cleanProtocolInput = (protocolo || "").toString().trim();
      const savedProtocolVal = (existing.protocoloFechamento || "").toString().trim();

      let isProtocolValid = false;

      // 1. Direct exact comparison
      if (cleanProtocolInput === savedProtocolVal) {
        isProtocolValid = true;
      }
      
      // 2. Numeric comparison (e.g. "00001" vs "1" or "00010541" vs "10541")
      if (!isProtocolValid) {
        const intInput = parseInt(cleanProtocolInput, 10);
        const intSaved = parseInt(savedProtocolVal, 10);
        if (!isNaN(intInput) && !isNaN(intSaved) && intInput === intSaved) {
          isProtocolValid = true;
        }
      }

      // 3. Fallback comparison: if stored is "N/A" or empty, and user typed "10541" (the UI fallback)
      if (!isProtocolValid && (savedProtocolVal === "" || savedProtocolVal === "N/A")) {
        const intInput = parseInt(cleanProtocolInput, 10);
        if (cleanProtocolInput === "10541" || intInput === 10541) {
          isProtocolValid = true;
        }
      }

      if (!isProtocolValid) {
        return res.status(400).json({ error: "Protocolo inválido." });
      }

      if (existing.statusFechamento === "EM_ABERTO") {
        return res.status(400).json({ error: `A DT ${dt} já está em aberto.` });
      }

      // Permissions check:
      // MASTER: Can re-open any DT.
      const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";

      if (!isMaster) {
        return res.status(403).json({ error: "Apenas usuários MASTER podem reabrir DTs finalizadas." });
      }

      // Prepare reopening history item
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0];

      const reopeningEvent = {
        protocolo: existing.protocoloFechamento || "N/A",
        acao: "REABERTURA",
        usuario: user.email,
        data: dateStr,
        hora: timeStr,
        motivo: motivo
      };

      const history = [...(existing.historicoFechamentos || []), reopeningEvent];

      // Update closure record status to EM_ABERTO
      FileDatabase.update("fechamentos_dt", existing.id, {
        statusFechamento: "EM_ABERTO",
        historicoFechamentos: history,
        atualizadoEm: now.toISOString()
      }, user.email);

      // Change Rota status back to "Em rota" so it can be closed again
      const foundRota = (FileDatabase.get("rotas") || []).find((r: any) => r.dt === dt);
      if (foundRota) {
        FileDatabase.update("rotas", foundRota.id, {
          status: "Em rota",
          status_viagem: undefined
        }, user.email);
        
        FileDatabase.logAudit(
          user.email,
          "ROTA_REABERTA",
          `DT ${dt} reaberta operacionalmente. Status alterado de volta para 'Em rota'.`,
          existing.unidadeId || ""
        );
      }

      // Log audit
      FileDatabase.logAudit(
        user.email,
        "REABERTURA_DT",
        `DT: ${dt} | Protocolo: ${existing.protocoloFechamento || "N/A"} | Usuário: ${user.email} | Data/Hora: ${dateStr} ${timeStr} | Motivo: ${motivo}`,
        existing.unidadeId || ""
      );

      return res.json({ success: true, message: `DT ${dt} reaberta com sucesso.` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
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
  // CENTRO FINANCEIRO DA FROTA (CONTA CORRENTE OPERACIONAL) - v2.2 REFORMULADA
  // ----------------------------------------------------
  function getMovementsForVehicle(db: any, veiculoId: string) {
    const veiculo = (db.veiculos || []).find((v: any) => v.id === veiculoId);
    if (!veiculo) return [];

    const veiculoPlaca = veiculo.placa;
    const cleanPlaca = (p: string) => p ? p.replace(/\s|-/g, "").toLowerCase() : "";

    // 1. Receitas: Frete + Disponibilidade based on closed DTs (fechamentos_dt)
    const dts = (db.fechamentos_dt || []).filter((f: any) => f.veiculoId === veiculoId);
    
    const autoFretes: any[] = [];
    const autoDisps: any[] = [];

    const getStandardRates = (perfil: string) => {
      const p = (perfil || "").toLowerCase();
      if (p.includes("van") || p.includes("utilitário") || p.includes("utilitario")) {
        return { frete: 550.00, disp: 50.00 };
      }
      if (p.includes("vuc")) {
        return { frete: 750.00, disp: 70.00 };
      }
      if (p.includes("3/4") || p.includes("tres quartos")) {
        return { frete: 850.00, disp: 80.00 };
      }
      if (p.includes("toco")) {
        return { frete: 1100.00, disp: 100.00 };
      }
      if (p.includes("truck")) {
        return { frete: 1500.00, disp: 150.00 };
      }
      if (p.includes("carreta")) {
        return { frete: 2200.00, disp: 200.00 };
      }
      return { frete: 1200.00, disp: 100.00 };
    };

    const rates = getStandardRates(veiculo.perfil);

    dts.forEach((f: any) => {
      // Use custom freteValor if available, otherwise fallback to standard rates
      const freteVal = f.freteValor !== undefined && f.freteValor !== null ? Number(f.freteValor) : rates.frete;
      const dispVal = f.disponibilidadeValor !== undefined && f.disponibilidadeValor !== null ? Number(f.disponibilidadeValor) : rates.disp;

      // Frete Credit
      autoFretes.push({
        id: `auto-frete-${f.id || f.dt}`,
        veiculoId,
        data: f.dataFechamento || f.data || "2026-06-19",
        hora: f.horaFechamento || f.hora || "12:00:00",
        tipo: "Crédito" as const,
        origem: "Frete",
        valor: freteVal,
        observacao: `Frete DT ${f.dt || "N/A"}`,
        usuario: f.usuarioResponsavel || "Sistema",
        dtId: f.dt,
        criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:00:00.000Z`
      });

      // Disponibilidade Credit
      autoDisps.push({
        id: `auto-disp-${f.id || f.dt}`,
        veiculoId,
        data: f.dataFechamento || f.data || "2026-06-19",
        hora: f.horaFechamento || f.hora || "12:05:00",
        tipo: "Crédito" as const,
        origem: "Disponibilidade",
        valor: dispVal,
        observacao: `Disponibilidade DT ${f.dt || "N/A"}`,
        usuario: f.usuarioResponsavel || "Sistema",
        dtId: f.dt,
        criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:05:00.000Z`
      });

      // Diárias / Bonificações (Crédito)
      if (f.diariasBonificacoes !== undefined && f.diariasBonificacoes !== null && Number(f.diariasBonificacoes) > 0) {
        autoFretes.push({
          id: `auto-diarias-bonif-${f.id || f.dt}`,
          veiculoId,
          data: f.dataFechamento || f.data || "2026-06-19",
          hora: f.horaFechamento || f.hora || "12:06:00",
          tipo: "Crédito" as const,
          origem: "Bonificação",
          valor: Number(f.diariasBonificacoes),
          observacao: `Diárias / Bonificações DT ${f.dt || "N/A"}`,
          usuario: f.usuarioResponsavel || "Sistema",
          dtId: f.dt,
          criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:06:00.000Z`
        });
      }

      // Outros Créditos (Crédito)
      if (f.outrosCreditos !== undefined && f.outrosCreditos !== null && Number(f.outrosCreditos) > 0) {
        autoFretes.push({
          id: `auto-outros-cred-${f.id || f.dt}`,
          veiculoId,
          data: f.dataFechamento || f.data || "2026-06-19",
          hora: f.horaFechamento || f.hora || "12:07:00",
          tipo: "Crédito" as const,
          origem: "Outros Créditos",
          valor: Number(f.outrosCreditos),
          observacao: `Outros Créditos DT ${f.dt || "N/A"}`,
          usuario: f.usuarioResponsavel || "Sistema",
          dtId: f.dt,
          criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:07:00.000Z`
        });
      }

      // Adiantamentos (Débito)
      if (f.adiantamentos !== undefined && f.adiantamentos !== null && Number(f.adiantamentos) > 0) {
        autoFretes.push({
          id: `auto-adiantamentos-${f.id || f.dt}`,
          veiculoId,
          data: f.dataFechamento || f.data || "2026-06-19",
          hora: f.horaFechamento || f.hora || "12:08:00",
          tipo: "Débito" as const,
          origem: "Adiantamento",
          valor: Number(f.adiantamentos),
          observacao: `Adiantamento de viagem DT ${f.dt || "N/A"}`,
          usuario: f.usuarioResponsavel || "Sistema",
          dtId: f.dt,
          criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:08:00.000Z`
        });
      }

      // Multas / Descontos (Débito)
      if (f.multasDescontos !== undefined && f.multasDescontos !== null && Number(f.multasDescontos) > 0) {
        autoFretes.push({
          id: `auto-multas-desc-${f.id || f.dt}`,
          veiculoId,
          data: f.dataFechamento || f.data || "2026-06-19",
          hora: f.horaFechamento || f.hora || "12:09:00",
          tipo: "Débito" as const,
          origem: "Desconto",
          valor: Number(f.multasDescontos),
          observacao: `Multas / Descontos DT ${f.dt || "N/A"}`,
          usuario: f.usuarioResponsavel || "Sistema",
          dtId: f.dt,
          criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:09:00.000Z`
        });
      }
    });

    // 2. Vales (Débito)
    const autoVales = (db.vales || [])
      .filter((v: any) => v.veiculoId === veiculoId)
      .map((v: any) => ({
        id: `auto-vale-${v.id}`,
        veiculoId,
        data: v.data,
        hora: "12:10:00",
        tipo: "Débito" as const,
        origem: "Vale",
        valor: Number(v.valorCobrado || v.valor || 0),
        observacao: `Vale: ${v.produto || "Falta de mercadoria"} (DT ${v.dt || "N/A"})`,
        usuario: v.responsavel || "Sistema",
        valeId: v.id,
        dtId: v.dt,
        criadoEm: v.criadoEm || `${v.data}T12:10:00.000Z`
      }));

    // Filter by weekly closures that are "Pago" for this vehicle to mark as faturado
    const weeklyClosures = (db.fechamentos_semanais || []).filter((w: any) => w.veiculoId === veiculoId && w.status === "Pago");

    const payments = weeklyClosures.map((w: any) => ({
      id: `payment-${w.id}`,
      veiculoId,
      data: w.dataPagamento || w.dataFim,
      hora: "23:59:59", // Sort at the very end of the day
      tipo: "Débito" as const,
      origem: "Pagamento",
      valor: Number(w.saldoFinal || 0),
      observacao: `Pagamento: ${w.numeroFechamento}. Obs: ${w.observacoes || "Sem observações"}`,
      usuario: w.criadoPor || "Sistema",
      dtId: "",
      criadoEm: w.criadoEm || `${w.dataPagamento || "2026-06-19"}T23:59:59.000Z`,
      isPayment: true
    }));

    // Combine all movements (Decoupled completely from company operational costs such as Descargas and Manutencoes)
    const allMovements = [...autoFretes, ...autoDisps, ...autoVales, ...payments];

    // Sort chronologically
    allMovements.sort((a, b) => {
      const compDate = a.data.localeCompare(b.data);
      if (compDate !== 0) return compDate;
      const compTime = (a.hora || "").localeCompare(b.hora || "");
      if (compTime !== 0) return compTime;
      return (a.id || "").localeCompare(b.id || "");
    });

    // Sequential running balances
    let currentBalance = 0;
    return allMovements.map((mov) => {
      const mDate = mov.data ? mov.data.slice(0, 10) : "";
      const isFaturado = mov.isPayment ? true : weeklyClosures.some((w: any) => mDate >= w.dataInicio && mDate <= w.dataFim);

      const isCredit = mov.tipo === "Crédito";
      const val = Number(mov.valor || 0);
      const saldoAnterior = currentBalance;
      
      if (isCredit) {
        currentBalance += val;
      } else {
        currentBalance -= val;
      }
      
      const saldoPosterior = currentBalance;
      return {
        ...mov,
        saldoAnterior,
        saldoPosterior,
        faturado: isFaturado
      };
    });
  }

  // 1. GET ALL VEHICLE FINANCIAL ACCOUNTS
  app.get("/api/financeiro/pessoas", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });
      
      const db = FileDatabase.getFull();
      const veiculos = db.veiculos || [];
      const motoristas = db.motoristas || [];
      const activeUnit = getRequestUnitContext(req, user);
      
      let filtered = veiculos;
      if (activeUnit !== "Todas") {
        filtered = veiculos.filter((v: any) => v.unidadeId === activeUnit);
      }
      
      const result = filtered.map(v => {
        const movements = getMovementsForVehicle(db, v.id);
        
        // Only active/unfaturado movements count towards the current active balance period
        const activeMovements = movements.filter((m: any) => !m.faturado);
        const lastMov = movements[movements.length - 1];
        
        const creditos = activeMovements.filter(mov => mov.tipo === "Crédito").reduce((acc, mov) => acc + Number(mov.valor || 0), 0);
        const debitos = activeMovements.filter(mov => mov.tipo === "Débito").reduce((acc, mov) => acc + Number(mov.valor || 0), 0);
        const saldo = creditos - debitos;

        // Find current driver if any
        const motorista = motoristas.find((m: any) => m.id === v.motoristaId || m.id === v.motoristaPreferencialId);
        
        return {
          id: v.id,
          nome: `${v.modelo} (${v.placa})`,
          placa: v.placa,
          perfil: v.perfil || "Utilitário",
          modelo: v.modelo,
          marca: v.marca,
          unidadeId: v.unidadeId,
          motoristaNome: motorista ? motorista.nome : "Sem Motorista Vinculado",
          statusFinanceiro: v.statusFinanceiro || "Ativo",
          dataCriacaoContaFinanceira: v.dataCriacaoContaFinanceira || "2026-06-15",
          saldo,
          saldoDisponivel: v.statusFinanceiro === "Bloqueado" ? 0 : saldo,
          creditos,
          debitos,
          ultimaMovimentacao: lastMov ? {
            data: lastMov.data,
            tipo: lastMov.tipo,
            origem: lastMov.origem,
            valor: lastMov.valor,
            observacao: lastMov.observacao
          } : null
        };
      });
      
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1.5 GET ALL WEEKLY CLOSURES (HISTÓRICO GERAL DE PAGAMENTOS)
  app.get("/api/financeiro/fechamentos", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const isOperator = user.perfil === "operador" || user.tipo_usuario === "OPERADOR";
      if (isOperator) return res.status(403).json({ error: "Sem acesso" });

      const db = FileDatabase.getFull();
      const closures = db.fechamentos_semanais || [];
      
      const enriched = closures.map((c: any) => {
        const veiculo = db.veiculos.find((v: any) => v.id === c.veiculoId);
        const motorista = veiculo ? db.motoristas.find((m: any) => m.id === veiculo.motoristaId || m.id === veiculo.motoristaPreferencialId) : null;
        return {
          ...c,
          veiculoModelo: veiculo ? veiculo.modelo : "N/A",
          veiculoPlaca: veiculo ? veiculo.placa : c.placa || "N/A",
          motoristaNome: motorista ? motorista.nome : "Sem Motorista"
        };
      });

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. GET SINGLE VEHICLE FINANCIAL LEDGER
  app.get("/api/financeiro/pessoas/:id/extrato", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });
      
      const { id } = req.params;
      const db = FileDatabase.getFull();
      const veiculo = db.veiculos.find((v: any) => v.id === id);
      if (!veiculo) return res.status(404).json({ error: "Veículo não encontrado" });
      
      const movements = getMovementsForVehicle(db, id);
      const activeMovements = movements.filter((m: any) => !m.faturado);
      
      const creditos = activeMovements.filter(mov => mov.tipo === "Crédito").reduce((acc, mov) => acc + Number(mov.valor || 0), 0);
      const debitos = activeMovements.filter(mov => mov.tipo === "Débito").reduce((acc, mov) => acc + Number(mov.valor || 0), 0);
      const saldo = creditos - debitos;

      const motorista = db.motoristas.find((m: any) => m.id === veiculo.motoristaId || m.id === veiculo.motoristaPreferencialId);
      const weeklyClosures = (db.fechamentos_semanais || []).filter((w: any) => w.veiculoId === id);

      res.json({
        pessoa: {
          id: veiculo.id,
          nome: `${veiculo.modelo} (${veiculo.placa})`,
          placa: veiculo.placa,
          perfil: veiculo.perfil || "Utilitário",
          modelo: veiculo.modelo,
          marca: veiculo.marca,
          unidadeId: veiculo.unidadeId,
          motoristaNome: motorista ? motorista.nome : "Sem Motorista Vinculado",
          statusFinanceiro: veiculo.statusFinanceiro || "Ativo",
          dataCriacaoContaFinanceira: veiculo.dataCriacaoContaFinanceira || "2026-06-15",
          saldo,
          saldoDisponivel: veiculo.statusFinanceiro === "Bloqueado" ? 0 : saldo,
          creditos,
          debitos
        },
        extrato: movements,
        fechamentosSemanais: weeklyClosures
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. POST WEEKLY CLOSURE (FECHAR SEMANA)
  app.post("/api/financeiro/pessoas/:id/fechar-semana", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
      if (!isMaster) {
        return res.status(403).json({ error: "Apenas usuários MASTER podem fechar pagamentos." });
      }

      const { id } = req.params;
      const { 
        dataInicio, 
        dataFim, 
        receitasFretes, 
        receitasDisponibilidade, 
        receitasBonificacoes,
        receitasOutros,
        totalReceitas, 
        descontosVales, 
        descontosAdiantamentos,
        descontosGerais,
        descontosDescargas, 
        descontosManutencoes, 
        descontosOutros, 
        totalDescontos, 
        saldoFinal,
        formaPagamento,
        observacoes,
        dataPagamento,
        horaPagamento
      } = req.body;

      if (!dataInicio || !dataFim) {
        return res.status(400).json({ error: "Período (Início e Fim) é obrigatório." });
      }

      const db = FileDatabase.getFull();
      const veiculo = db.veiculos.find((v: any) => v.id === id);
      if (!veiculo) return res.status(404).json({ error: "Veículo não encontrado" });

      if (!db.fechamentos_semanais) {
        db.fechamentos_semanais = [];
      }

      // Check overlapping closures to block alterations in that period
      const overlaps = db.fechamentos_semanais.some((w: any) => {
        if (w.veiculoId !== id) return false;
        return (dataInicio <= w.dataFim) && (dataFim >= w.dataInicio);
      });

      if (overlaps) {
        return res.status(400).json({ error: "Este período de datas já possui um fechamento registrado (conflito de períodos)." });
      }

      const generatedNumber = `FC-${dataInicio.replace(/-/g, "")}-${dataFim.replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newClosure = {
        id: `fs-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        veiculoId: id,
        placa: veiculo.placa,
        dataInicio,
        dataFim,
        receitasFretes: Number(receitasFretes || 0),
        receitasDisponibilidade: Number(receitasDisponibilidade || 0),
        receitasBonificacoes: Number(receitasBonificacoes || 0),
        receitasOutros: Number(receitasOutros || 0),
        totalReceitas: Number(totalReceitas || 0),
        descontosVales: Number(descontosVales || 0),
        descontosAdiantamentos: Number(descontosAdiantamentos || 0),
        descontosGerais: Number(descontosGerais || 0),
        descontosDescargas: Number(descontosDescargas || 0),
        descontosManutencoes: Number(descontosManutencoes || 0),
        descontosOutros: Number(descontosOutros || 0),
        totalDescontos: Number(totalDescontos || 0),
        saldoFinal: Number(saldoFinal || 0),
        status: "Pago" as const,
        criadoEm: new Date().toISOString(),
        criadoPor: user.email,
        formaPagamento: formaPagamento || "PIX",
        observacoes: observacoes || "",
        numeroFechamento: generatedNumber,
        dataPagamento: dataPagamento || new Date().toISOString().split("T")[0],
        horaPagamento: horaPagamento || new Date().toTimeString().split(" ")[0],
        ipAddress: req.ip || "127.0.0.1"
      };

      db.fechamentos_semanais.push(newClosure);
      FileDatabase.write(db);
      FileDatabase.asyncWriteToSupabase("fechamentos_semanais" as any, db.fechamentos_semanais);

      FileDatabase.logAudit(
        user.email,
        "FIN_FECHAMENTO_SEMANAL",
        `Fechamento semanal realizado para o veículo ${veiculo.modelo} (${veiculo.placa}) do período ${dataInicio} até ${dataFim}. Saldo pago: R$ ${Number(saldoFinal).toFixed(2)}. N° Fechamento: ${generatedNumber}.`,
        veiculo.unidadeId || ""
      );

      res.json({ success: true, closure: newClosure });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE WEEKLY CLOSURE (EXCLUIR FECHAMENTO / REABRIR PERÍODO)
  app.delete("/api/financeiro/pessoas/:id/fechamentos/:closureId", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });

      const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
      if (!isMaster) {
        return res.status(403).json({ error: "Apenas usuários MASTER podem reabrir períodos ou excluir fechamentos." });
      }

      const { id, closureId } = req.params;
      const db = FileDatabase.getFull();
      
      const veiculo = db.veiculos.find((v: any) => v.id === id);
      if (!veiculo) return res.status(404).json({ error: "Veículo não encontrado" });

      if (!db.fechamentos_semanais) {
        db.fechamentos_semanais = [];
      }

      const closureIndex = db.fechamentos_semanais.findIndex((w: any) => w.id === closureId && w.veiculoId === id);
      if (closureIndex === -1) {
        return res.status(404).json({ error: "Fechamento não encontrado" });
      }

      const deletedClosure = db.fechamentos_semanais[closureIndex];
      db.fechamentos_semanais.splice(closureIndex, 1);
      FileDatabase.write(db);
      FileDatabase.asyncWriteToSupabase("fechamentos_semanais" as any, db.fechamentos_semanais);

      FileDatabase.logAudit(
        user.email,
        "FIN_EXCLUIR_FECHAMENTO_SEMANAL",
        `Exclusão de fechamento/reabertura de período para o veículo ${veiculo.modelo} (${veiculo.placa}) de ${deletedClosure.dataInicio} a ${deletedClosure.dataFim}. Valor estornado: R$ ${Number(deletedClosure.saldoFinal).toFixed(2)}.`,
        veiculo.unidadeId || ""
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. PUT UPDATE VEHICLE ACCOUNT STATUS
  app.put("/api/financeiro/pessoas/:id/status", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "Não autorizado" });
      
      const isOperator = user.perfil === "operador" || user.tipo_usuario === "OPERADOR";
      if (isOperator) return res.status(403).json({ error: "Sem permissão para alterar status financeiro" });
      
      const { id } = req.params;
      const { statusFinanceiro } = req.body;
      
      if (!statusFinanceiro) {
        return res.status(400).json({ error: "Status financeiro é obrigatório." });
      }
      
      const db = FileDatabase.getFull();
      const veiculo = db.veiculos.find((v: any) => v.id === id);
      if (!veiculo) return res.status(404).json({ error: "Veículo não encontrado" });
      
      veiculo.statusFinanceiro = statusFinanceiro;
      FileDatabase.write(db);
      FileDatabase.asyncWriteToSupabase("veiculos", db.veiculos);
      
      FileDatabase.logAudit(
        user.email,
        "FIN_STATUS_ALTERADO",
        `Status financeiro do veículo ${veiculo.modelo} (${veiculo.placa}) alterado para ${statusFinanceiro}.`,
        veiculo.unidadeId || ""
      );
      
      res.json({ success: true, statusFinanceiro });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
