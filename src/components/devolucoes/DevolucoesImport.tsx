import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Layers, Check, Clock, Users, UserCheck, CheckSquare, Tag, AlertTriangle, Edit3, Sparkles } from "lucide-react";

interface ImportProps {
  unidades: any[];
  onRefresh: () => void;
  currentUser: any;
}

export default function DevolucoesImport({ unidades, onRefresh, currentUser }: ImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [showMappingPanel, setShowMappingPanel] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [detectedMappings, setDetectedMappings] = useState<Record<string, string>>({});
  const [layoutLearnedMessage, setLayoutLearnedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  
  // Custom stats for automatic fills
  const [autoFillCounts, setAutoFillCounts] = useState({
    noNf: 0,
    noValor: 0,
    noClienteCode: 0,
    noData: 0
  });

  const [importSummary, setImportSummary] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modelos, setModelos] = useState<any[]>([]);
  const [layoutName, setLayoutName] = useState("");
  const [isNewLayout, setIsNewLayout] = useState(false);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);

  const fetchModelos = async () => {
    try {
      const res = await fetch("/api/devolucoes/modelos", {
        headers: {
          "x-user-email": currentUser?.email || ""
        }
      });
      if (res.ok) {
        const data = await res.json();
        setModelos(data);
        return data;
      }
    } catch (err) {
      console.error("Error fetching modelos", err);
    }
    return [];
  };

  useEffect(() => {
    fetchModelos();
  }, [currentUser]);

interface SystemField {
  key: string;
  label: string;
  group: string;
  required: boolean;
  synonyms: string[];
}

const SYSTEM_FIELDS: SystemField[] = [
  { key: "data", label: "Data do Ocorrido", group: "Devolução", required: true, synonyms: ["data", "emissao", "dt", "data devolucao", "data da devolucao", "data da ocorrencia", "data entrega", "data retorno", "data do ocorrido"] },
  { key: "clienteCodigo", label: "Código do Cliente", group: "Clientes", required: true, synonyms: ["cod cliente", "codigo cliente", "cod pdv", "codigo pdv", "pdv", "loja", "cliente sap", "codigo sap", "cliente erp", "codigo erp", "parceiro", "destinatario", "codigo destinatario", "cliente"] },
  { key: "valorNF", label: "Valor", group: "Devolução", required: true, synonyms: ["valor", "valor total", "total", "valor devolucao", "valor devolvida", "total devolvido", "valor produtos", "vlr nf", "vlr dev", "vlr", "valor_liquido"] },
  { key: "numeroNF", label: "Número da NF", group: "Devolução", required: false, synonyms: ["numero nf", "numero da nf", "nf", "nota", "numero", "documento"] },
  { key: "clienteRazaoSocial", label: "Razão Social", group: "Clientes", required: false, synonyms: ["razao social", "razao", "nome cliente", "nome razao", "razao social cliente", "nome razao social", "cliente nome"] },
  { key: "clienteNomeFantasia", label: "Nome Fantasia", group: "Clientes", required: false, synonyms: ["nome fantasia", "fantasia", "nome comercial", "apelido", "fantasia cliente", "nome pdv"] },
  { key: "canal", label: "Canal", group: "Clientes", required: false, synonyms: ["canal", "canal venda", "canal de venda", "canalvenda", "meio de venda", "segmento", "subcanal"] },
  { key: "endereco", label: "Endereço", group: "Clientes", required: false, synonyms: ["endereco", "logradouro", "rua", "av", "avenida", "endereco cliente", "endereco pdv"] },
  { key: "cidade", label: "Cidade", group: "Clientes", required: false, synonyms: ["cidade", "municipio", "localidade", "cidade cliente", "cidade pdv"] },
  { key: "uf", label: "UF", group: "Clientes", required: false, synonyms: ["uf", "estado", "est", "uf cliente", "uf pdv"] },
  { key: "telefone", label: "Telefone do Cliente", group: "Clientes", required: false, synonyms: ["telefone", "tel", "contato", "telefone cliente", "telefone pdv", "fone", "celular"] },
  { key: "cnpj", label: "CNPJ", group: "Clientes", required: false, synonyms: ["cnpj", "c n p j", "inscricao", "inscricao estadual", "ie", "cpf", "cpf cnpj"] },
  { key: "area", label: "Área", group: "Clientes", required: false, synonyms: ["area", "setor", "area responsavel", "regiao", "setor responsavel"] },
  { key: "status", label: "Status do Cliente", group: "Clientes", required: false, synonyms: ["status", "situacao", "situacao cliente", "status cliente", "ativo", "bloqueado"] },
  { key: "motoristaNome", label: "Nome do Motorista", group: "Motoristas", required: false, synonyms: ["motorista", "condutor", "entregador", "nome motorista", "nome condutor", "nome entregador"] },
  { key: "motoristaMatricula", label: "Matrícula do Motorista", group: "Motoristas", required: false, synonyms: ["matricula", "chapa", "re", "funcional", "codigo funcionario", "matricula motorista", "chapa motorista"] },
  { key: "motoristaTelefone", label: "Telefone do Motorista", group: "Motoristas", required: false, synonyms: ["telefone motorista", "tel motorista", "contato motorista", "fone motorista", "celular motorista"] },
  { key: "motoristaFuncao", label: "Função do Motorista", group: "Motoristas", required: false, synonyms: ["funcao", "cargo", "funcao motorista", "cargo motorista"] },
  { key: "motoristaStatus", label: "Status do Motorista", group: "Motoristas", required: false, synonyms: ["status motorista", "situacao motorista", "motorista status"] },
  { key: "motoristaUnidade", label: "Unidade do Motorista", group: "Motoristas", required: false, synonyms: ["unidade motorista", "filial motorista", "motorista unidade", "motorista filial"] },
  { key: "vendedor", label: "Vendedor RCA", group: "Hierarquia Comercial", required: false, synonyms: ["vendedor", "rca", "representante", "vend", "consultor", "promotor", "nome vendedor", "vendedor rca"] },
  { key: "supervisor", label: "Supervisor", group: "Hierarquia Comercial", required: false, synonyms: ["supervisor", "sup", "coordenador", "coordenador vendas", "supervisor vendas", "supervisor rca"] },
  { key: "gerente", label: "Gerente", group: "Hierarquia Comercial", required: false, synonyms: ["gerente", "ger", "gerencia", "gerente vendas", "gerente rca", "gerente canal"] },
  { key: "hierarquiaTelefone", label: "Telefone do Vendedor", group: "Hierarquia Comercial", required: false, synonyms: ["telefone vendedor", "tel vendedor", "telefone rca", "tel rca", "contato vendedor"] },
  { key: "hierarquiaEmail", label: "Email do Vendedor", group: "Hierarquia Comercial", required: false, synonyms: ["email", "e mail", "email vendedor", "email rca", "email supervisor", "email gerente"] },
  { key: "motivoCodigo", label: "Código do Motivo", group: "Motivo Heineken", required: false, synonyms: ["codigo motivo", "cod motivo", "motivo codigo", "motivo cod", "codigo do motivo", "cod do motivo"] },
  { key: "motivoDescricao", label: "Descrição do Motivo", group: "Motivo Heineken", required: false, synonyms: ["motivo", "motivo devolucao", "motivo heineken", "descricao motivo", "descricao do motivo", "ocorrencia", "ocorrencia", "descricao", "historico", "motivo desc"] },
  { key: "observacao", label: "Observação", group: "Geral", required: false, synonyms: ["observacao", "obs", "comentario", "comentarios", "obs devolucao", "observacoes"] },
];

  const autoDetectColumns = (rawHeaders: string[], fetchedModels?: any[]) => {
    const cleanStr = (s: string) => 
      String(s || "").toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, " ")     // replace special chars with space
        .trim();

    const detected: Record<string, string> = {};
    SYSTEM_FIELDS.forEach(sf => {
      detected[sf.key] = "";
    });

    let layoutMatched = false;
    let matchedName = "";
    let matchedId = null;

    // 1. Try database models from server first
    const activeModels = fetchedModels || modelos;
    if (activeModels && activeModels.length > 0) {
      for (const layout of activeModels) {
        if (Array.isArray(layout.headers)) {
          const commonHeaders = layout.headers.filter((h: string) => rawHeaders.includes(h));
          const matchRatio = commonHeaders.length / Math.max(layout.headers.length, 1);
          if (matchRatio >= 0.75) {
            Object.keys(layout.mappings).forEach(key => {
              const colName = layout.mappings[key];
              if (colName && rawHeaders.includes(colName)) {
                detected[key] = colName;
              }
            });
            layoutMatched = true;
            matchedName = layout.nome;
            matchedId = layout.id;
            setLayoutLearnedMessage(`Layout "${layout.nome}" reconhecido automaticamente da Base Ampla!`);
            break;
          }
        }
      }
    }

    // 2. Fall back to localStorage learned layouts
    if (!layoutMatched) {
      try {
        const storedLayoutsStr = localStorage.getItem("ampla_devolucoes_learned_layouts");
        if (storedLayoutsStr) {
          const storedLayouts = JSON.parse(storedLayoutsStr);
          for (const layout of storedLayouts) {
            if (Array.isArray(layout.headers)) {
              const commonHeaders = layout.headers.filter((h: string) => rawHeaders.includes(h));
              const matchRatio = commonHeaders.length / Math.max(layout.headers.length, 1);
              if (matchRatio >= 0.75) {
                Object.keys(layout.mappings).forEach(key => {
                  const colName = layout.mappings[key];
                  if (colName && rawHeaders.includes(colName)) {
                    detected[key] = colName;
                  }
                });
                layoutMatched = true;
                matchedName = layout.nome || "Histórico Local";
                setLayoutLearnedMessage("Layout reconhecido automaticamente com base no histórico local!");
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error("Error reading learned layouts", e);
      }
    }

    if (!layoutMatched) {
      setLayoutLearnedMessage("");
      setIsNewLayout(true);
      setActiveModelId(null);
      setLayoutName("");
      const cleanHeaders = rawHeaders.map(h => ({ original: h, clean: cleanStr(h) }));
      const usedHeaders = new Set<string>();

      const findMatchForField = (field: SystemField): string => {
        const cleanSyns = field.synonyms.map(s => cleanStr(s));
        
        // 1st pass: exact matches
        for (const h of cleanHeaders) {
          if (usedHeaders.has(h.original)) continue;
          if (cleanSyns.includes(h.clean)) {
            usedHeaders.add(h.original);
            return h.original;
          }
        }

        // 2nd pass: substring matches
        for (const h of cleanHeaders) {
          if (usedHeaders.has(h.original)) continue;
          for (const syn of cleanSyns) {
            if (h.clean.includes(syn) || syn.includes(h.clean)) {
              usedHeaders.add(h.original);
              return h.original;
            }
          }
        }
        return "";
      };

      SYSTEM_FIELDS.forEach(sf => {
        detected[sf.key] = findMatchForField(sf);
      });
    } else {
      setIsNewLayout(false);
      setLayoutName(matchedName);
      setActiveModelId(matchedId);
    }

    return detected;
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile) return;
    
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      setStatus({ type: "error", msg: "Por favor, envie apenas arquivos Excel (.xlsx, .xls) ou .csv" });
      return;
    }

    setFile(selectedFile);
    setIsLoading(true);
    setStatus({ type: null, msg: "" });
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length === 0 || (json.length === 1 && json[0].length === 0)) {
          throw new Error("A planilha está vazia.");
        }

        const rawHeaders = json[0].map((h: any) => String(h || "").trim()).filter(Boolean);
        if (rawHeaders.length === 0) {
          throw new Error("A planilha não possui cabeçalhos válidos na primeira linha.");
        }

        setHeaders(rawHeaders);

        // Map data rows
        const rows = json.slice(1).map((row: any[]) => {
          const obj: Record<string, any> = {};
          rawHeaders.forEach((header: string, index: number) => {
            obj[header] = row[index] !== undefined ? row[index] : "";
          });
          return obj;
        }).filter((row: any) => {
          // Keep only rows that are not entirely blank
          return Object.values(row).some(v => String(v).trim() !== "");
        });

        if (rows.length === 0) {
          throw new Error("Nenhuma linha de dados válida foi encontrada na planilha.");
        }

        setParsedData(rows);

        // Auto detect mappings based on synonyms
        const mappings = autoDetectColumns(rawHeaders);
        setDetectedMappings(mappings);

        setStatus({ type: "success", msg: `${rows.length} linhas carregadas com sucesso! Verifique ou corrija os mapeamentos de coluna abaixo.` });
      } catch (err: any) {
        setStatus({ type: "error", msg: err.message || "Erro ao processar planilha" });
        setFile(null);
        setParsedData([]);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setStatus({ type: "error", msg: "Erro ao ler o arquivo. Verifique se o arquivo não está corrompido." });
      setIsLoading(false);
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleMappingChange = (key: string, val: string) => {
    setDetectedMappings(prev => ({
      ...prev,
      [key]: val
    }));
  };

  useEffect(() => {
    if (parsedData.length === 0) return;
    
    let noNfCount = 0;
    let noValorCount = 0;
    let noClienteCodeCount = 0;
    let noDataCount = 0;

    const getRowVal = (row: any, key: string) => {
      const colName = detectedMappings[key];
      if (!colName) return "";
      return row[colName] !== undefined ? row[colName] : "";
    };

    parsedData.forEach(row => {
      // Check client code
      let cliCode = String(getRowVal(row, "clienteCodigo") || "").trim();
      if (!cliCode) {
        // Check other potential SAP/ERP/PDV fallback columns manually in row keys
        const fallbackKeys = ["codigo sap", "codigo erp", "codigo pdv", "numero da loja", "codigo destinatario", "sap", "erp", "loja", "destinatario"];
        let foundFallback = "";
        for (const header of Object.keys(row)) {
          const cleanedHeader = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (fallbackKeys.some(fk => cleanedHeader.includes(fk))) {
            foundFallback = String(row[header] || "").trim();
            if (foundFallback) break;
          }
        }
        if (!foundFallback) {
          noClienteCodeCount++;
        }
      }

      // Check NF
      const nf = String(getRowVal(row, "numeroNF") || "").trim();
      if (!nf || nf.toUpperCase() === "SEM-NF") noNfCount++;

      // Check Value
      const val = getRowVal(row, "valorNF");
      if (val === "" || val === undefined || val === null || parseFloat(String(val).replace(/[^\d,.-]/g, "").replace(",", ".")) === 0) {
        noValorCount++;
      }

      // Check Data
      const dt = getRowVal(row, "data");
      if (!dt) noDataCount++;
    });

    setAutoFillCounts({
      noNf: noNfCount,
      noValor: noValorCount,
      noClienteCode: noClienteCodeCount,
      noData: noDataCount
    });
  }, [detectedMappings, parsedData]);

  const executeImport = async () => {
    if (parsedData.length === 0) return;
    setIsLoading(true);
    setStatus({ type: null, msg: "" });
    setImportSummary(null);

    const getRowVal = (row: any, key: string) => {
      const colName = detectedMappings[key];
      if (!colName) return "";
      return row[colName] !== undefined ? row[colName] : "";
    };

    try {
      const defaultUnit = currentUser.unidadeId !== "Todas" ? currentUser.unidadeId : (unidades[0]?.id || "un-go");
      
      const BATCH_SIZE = 2500;
      const numBatches = Math.ceil(parsedData.length / BATCH_SIZE);
      let totalIgnored = 0;
      let generatedCliCodes = 0;
      const startTime = Date.now();

      const aggregatedSummary = {
        clientes: { created: 0, updated: 0, total: 0 },
        motoristas: { created: 0, updated: 0, total: 0 },
        hierarquia: { created: 0, updated: 0, total: 0 },
        motivos: { created: 0, updated: 0, total: 0 },
        historico: { created: 0, updated: 0, total: 0 }
      };

      // Sequential counter for autogenerated client codes in this run
      let nextCliNum = 1;
      const mappedCols = Object.values(detectedMappings).filter(Boolean);

      for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
        setImportProgress({ current: batchIndex, total: numBatches });

        const chunk = parsedData.slice(i, i + BATCH_SIZE);
        const clientes: any[] = [];
        const motoristas: any[] = [];
        const hierarquia: any[] = [];
        const motivos: any[] = [];
        const historico: any[] = [];

        chunk.forEach((row) => {
          // Identify client code or fallbacks
          let clienteCodigo = String(getRowVal(row, "clienteCodigo") || "").trim();
          
          if (!clienteCodigo) {
            // Check other potential SAP/ERP/PDV fallback columns manually in raw headers
            const fallbackKeys = ["codigo sap", "codigo erp", "codigo pdv", "numero da loja", "codigo destinatario", "sap", "erp", "loja", "destinatario"];
            let foundFallback = "";
            for (const header of Object.keys(row)) {
              const cleanedHeader = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              if (fallbackKeys.some(fk => cleanedHeader.includes(fk))) {
                foundFallback = String(row[header] || "").trim();
                if (foundFallback) break;
              }
            }

            if (foundFallback) {
              clienteCodigo = foundFallback;
            } else {
              // Auto-generate code
              clienteCodigo = `CLI-${String(nextCliNum++).padStart(6, "0")}`;
              generatedCliCodes++;
            }
          }

          // Parse Data
          const dataVal = getRowVal(row, "data");
          let rowDate = "";
          if (dataVal instanceof Date) {
            rowDate = dataVal.toISOString().split("T")[0];
          } else if (dataVal) {
            const cleanVal = String(dataVal).trim();
            if (cleanVal.includes("/")) {
              const parts = cleanVal.split("/");
              if (parts.length === 3) {
                rowDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
              }
            } else {
              rowDate = cleanVal;
            }
          }
          if (!rowDate) {
            rowDate = new Date().toISOString().split("T")[0];
          }

          const clienteRazaoSocial = String(getRowVal(row, "clienteRazaoSocial") || "").trim();
          const clienteNomeFantasia = String(getRowVal(row, "clienteNomeFantasia") || "").trim() || clienteRazaoSocial || "";
          const canal = String(getRowVal(row, "canal") || "").trim();
          const endereco = String(getRowVal(row, "endereco") || "").trim();
          const cidade = String(getRowVal(row, "cidade") || "").trim();
          const uf = String(getRowVal(row, "uf") || "").trim();
          const telefone = String(getRowVal(row, "telefone") || "").trim();
          const cnpj = String(getRowVal(row, "cnpj") || "").trim();
          const area = String(getRowVal(row, "area") || "").trim();
          const status = String(getRowVal(row, "status") || "").trim() || "Ativo";

          const motoristaNome = String(getRowVal(row, "motoristaNome") || "").trim();
          const motoristaMatricula = String(getRowVal(row, "motoristaMatricula") || "").trim();
          const motoristaTelefone = String(getRowVal(row, "motoristaTelefone") || "").trim();
          const motoristaFuncao = String(getRowVal(row, "motoristaFuncao") || "").trim();
          const motoristaStatus = String(getRowVal(row, "motoristaStatus") || "").trim() || "Ativo";

          const vendedor = String(getRowVal(row, "vendedor") || "").trim();
          const supervisor = String(getRowVal(row, "supervisor") || "").trim();
          const gerente = String(getRowVal(row, "gerente") || "").trim();
          const hierarquiaTelefone = String(getRowVal(row, "hierarquiaTelefone") || "").trim();
          const hierarquiaEmail = String(getRowVal(row, "hierarquiaEmail") || "").trim();

          const motivoCodigo = String(getRowVal(row, "motivoCodigo") || "").trim();
          const motivoDescricao = String(getRowVal(row, "motivoDescricao") || "").trim();
          const observacao = String(getRowVal(row, "observacao") || "").trim();

          let rowUnitId = defaultUnit;
          const rowUnidadeVal = getRowVal(row, "motoristaUnidade") || getRowVal(row, "unidadeId");
          if (rowUnidadeVal) {
            const mappedUnitName = String(rowUnidadeVal).toUpperCase();
            const matchedUnit = unidades.find(u => 
              (u.nome && u.nome.toUpperCase().includes(mappedUnitName)) || 
              (u.id && u.id.toUpperCase() === mappedUnitName)
            );
            if (matchedUnit) {
              rowUnitId = matchedUnit.id;
            }
          }

          let numeroNF = String(getRowVal(row, "numeroNF") || "").trim();
          if (!numeroNF) {
            numeroNF = ""; // let backend generate sequence NF-xxxxxx
          }

          // Parse Value
          const rawValor = getRowVal(row, "valorNF");
          let valorNF = 0;
          if (rawValor !== undefined && rawValor !== null && rawValor !== "") {
            if (typeof rawValor === "number") {
              valorNF = rawValor;
            } else {
              valorNF = parseFloat(String(rawValor).replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
            }
          }

          // Extract unmapped / additional columns as Campos Extras
          const camposExtras: Record<string, any> = {};
          headers.forEach((h) => {
            if (!mappedCols.includes(h)) {
              camposExtras[h] = row[h] !== undefined ? row[h] : "";
            }
          });

          // Clientes collection
          clientes.push({
            codigo: clienteCodigo,
            razaoSocial: clienteRazaoSocial || clienteNomeFantasia,
            nomeFantasia: clienteNomeFantasia,
            cnpj,
            cidade,
            uf,
            telefone,
            canalVenda: canal,
            vendedor,
            supervisor,
            gerente,
            areaResponsavel: area,
            situacao: status,
            unidadeId: rowUnitId
          });

          // Motoristas collection
          if (motoristaMatricula || motoristaNome) {
            motoristas.push({
              matricula: motoristaMatricula || `MOT-${Math.floor(Math.random() * 100000)}`,
              nome: motoristaNome || "",
              telefone: motoristaTelefone,
              funcao: motoristaFuncao,
              unidadeId: rowUnitId,
              status: motoristaStatus
            });
          }

          // Hierarquia collection
          if (vendedor) {
            hierarquia.push({
              vendedor,
              supervisor,
              gerente,
              area,
              canal,
              telefone: hierarquiaTelefone,
              email: hierarquiaEmail,
              status: "Ativo",
              unidadeId: rowUnitId
            });
          }

          // Motivos collection
          if (motivoCodigo || motivoDescricao) {
            motivos.push({
              codigo: motivoCodigo,
              descricao: motivoDescricao || ""
            });
          }

          // Historico collection
          historico.push({
            data: rowDate,
            motoristaMatricula: motoristaMatricula || "",
            motoristaNome: motoristaNome || "",
            motoristaTelefone,
            clienteCodigo,
            clienteRazaoSocial: clienteRazaoSocial || clienteNomeFantasia,
            clienteNomeFantasia,
            vendedor,
            supervisor,
            gerente,
            areaResponsavel: area,
            canal,
            telefone,
            endereco,
            numeroNF,
            valorNF,
            motivoCodigo,
            motivoDescricao,
            observacao,
            unidadeId: rowUnitId,
            status: "Pendente",
            camposExtras
          });
        });

        // Deduplicate batches internally
        const uniqueClients = Array.from(new Map(clientes.map(item => [item.codigo, item])).values());
        const uniqueDrivers = Array.from(new Map(motoristas.map(item => [item.matricula, item])).values());
        const uniqueHierarchy = Array.from(new Map(hierarquia.map(item => [item.vendedor + "_" + item.unidadeId, item])).values());
        const uniqueReasons = Array.from(new Map(motivos.map(item => [item.codigo || item.descricao, item])).values());

        const payload = {
          clientes: uniqueClients,
          motoristas: uniqueDrivers,
          hierarquia: uniqueHierarchy,
          motivos: uniqueReasons,
          historico
        };

        const res = await fetch("/api/devolucoes/import-sheet", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-user-email": currentUser?.email || "",
            "x-selected-unit": currentUser?.unidadeId || "Todas"
          },
          body: JSON.stringify({ data: payload })
        });

        let resposta: any;
        try {
          resposta = await res.json();
        } catch (e) {
          resposta = {};
        }

        if (!res.ok) {
          throw new Error(
              resposta.error ||
              `HTTP ${res.status}`
          );
        }

        const reply = resposta;
        if (reply.success) {
          const s = reply.summary;
          aggregatedSummary.clientes.created += s.clientes?.created || 0;
          aggregatedSummary.clientes.updated += s.clientes?.updated || 0;
          aggregatedSummary.clientes.total += s.clientes?.total || 0;

          aggregatedSummary.motoristas.created += s.motoristas?.created || 0;
          aggregatedSummary.motoristas.updated += s.motoristas?.updated || 0;
          aggregatedSummary.motoristas.total += s.motoristas?.total || 0;

          aggregatedSummary.hierarquia.created += s.hierarquia?.created || 0;
          aggregatedSummary.hierarquia.updated += s.hierarquia?.updated || 0;
          aggregatedSummary.hierarquia.total += s.hierarquia?.total || 0;

          aggregatedSummary.motivos.created += s.motivos?.created || 0;
          aggregatedSummary.motivos.updated += s.motivos?.updated || 0;
          aggregatedSummary.motivos.total += s.motivos?.total || 0;

          aggregatedSummary.historico.created += s.historico?.created || 0;
          aggregatedSummary.historico.updated += s.historico?.updated || 0;
          aggregatedSummary.historico.total += s.historico?.total || 0;
        } else {
          throw new Error(reply.error || `Erro de processamento no lote ${batchIndex}`);
        }
      }

      const durationSecs = ((Date.now() - startTime) / 1000).toFixed(1);

      setImportSummary({
        ...aggregatedSummary,
        ignoredRows: totalIgnored,
        generatedCliCodes,
        duration: durationSecs
      });

      // Layout Memorization Engine (Learn past layout mappings)
      try {
        const modelName = layoutName.trim() || "Modelo " + (file?.name ? file.name.replace(/\.[^/.]+$/, "") : "Planilha");
        
        const storedLayoutsStr = localStorage.getItem("ampla_devolucoes_learned_layouts") || "[]";
        let storedLayouts = [];
        try {
          storedLayouts = JSON.parse(storedLayoutsStr);
          if (!Array.isArray(storedLayouts)) {
            storedLayouts = [];
          }
        } catch (e) {
          storedLayouts = [];
        }
        
        const updatedLayouts = [
          { headers, mappings: detectedMappings, nome: modelName },
          ...storedLayouts.filter((l: any) => l && JSON.stringify(l.headers) !== JSON.stringify(headers))
        ].slice(0, 10);
        
        localStorage.setItem("ampla_devolucoes_learned_layouts", JSON.stringify(updatedLayouts));

        // Save layout to server
        await fetch("/api/devolucoes/modelos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": currentUser?.email || ""
          },
          body: JSON.stringify({
            nome: modelName,
            headers,
            mappings: detectedMappings
          })
        });

        fetchModelos();
      } catch (e) {
        console.error("Error saving learned layout", e);
      }

      setStatus({ type: "success", msg: "Importação realizada com sucesso! Os dados foram processados de forma inteligente." });
      onRefresh();

      // Clear source states
      setFile(null);
      setParsedData([]);
      setHeaders([]);
      setImportProgress(null);
    } catch (err: any) {
      setStatus({ type: "error", msg: `Falha na importação: ${err.message}` });
      setImportProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const recognizedCount = SYSTEM_FIELDS.filter(sf => detectedMappings[sf.key]).length;
  const unmappedCount = SYSTEM_FIELDS.filter(sf => !detectedMappings[sf.key]).length;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" /> Centro de Importação Inteligente Heineken
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Carregue sua planilha Heineken (Excel/XLSX/CSV) para popular o banco de dados. O Ampla mapeará as colunas de forma 100% autônoma.
          </p>
        </div>
      </div>

      {status.msg && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border ${
          status.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />}
          <div className="text-xs font-mono">{status.msg}</div>
        </div>
      )}

      {importSummary && (
        <div className="bg-slate-950/80 border border-emerald-500/30 p-6 rounded-xl space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-sans">Importação Concluída com Sucesso!</h3>
              <p className="text-xs text-slate-400 mt-0.5">O algoritmo Ampla detectou e mapeou todas as colunas de forma autônoma.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-sky-400 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Clientes</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Importados:</span>
                  <span className="font-bold text-slate-100">{importSummary.clientes.created}</span>
                </div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>Atualizados:</span>
                  <span className="font-semibold">{importSummary.clientes.updated}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-violet-400 mb-2">
                <UserCheck className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Motoristas</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Importados:</span>
                  <span className="font-bold text-slate-100">{importSummary.motoristas.created}</span>
                </div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>Atualizados:</span>
                  <span className="font-semibold">{importSummary.motoristas.updated}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-rose-400 mb-2">
                <Users className="w-4 h-4 text-rose-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Hierarquia</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Importados:</span>
                  <span className="font-bold text-slate-100">{importSummary.hierarquia?.created || 0}</span>
                </div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>Atualizados:</span>
                  <span className="font-semibold">{importSummary.hierarquia?.updated || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <Tag className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Motivos</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Importados:</span>
                  <span className="font-bold text-slate-100">{importSummary.motivos.created}</span>
                </div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>Atualizados:</span>
                  <span className="font-semibold">{importSummary.motivos.updated || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <CheckSquare className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Histórico DEV</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Importados:</span>
                  <span className="font-bold text-slate-100">{importSummary.historico.created}</span>
                </div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>Atualizados:</span>
                  <span className="font-semibold">{importSummary.historico.updated}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Automatic Fills Report (Item 8) */}
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-850 space-y-3 font-mono text-xs">
            <h4 className="text-sky-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Relatório Operacional de Preenchimentos Automáticos (Sem Interrupções)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-300">
              <div className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-850/60 rounded">
                <span>Notas Fiscais Ausentes (Preenchidas como &quot;SEM-NF&quot;):</span>
                <strong className="text-amber-400">{autoFillCounts.noNf}</strong>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-850/60 rounded">
                <span>Valores Ausentes / Zerados (Definidos como R$ 0,00):</span>
                <strong className="text-amber-400">{autoFillCounts.noValor}</strong>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-850/60 rounded">
                <span>Cód. Clientes Ausentes (Cód. Interno sequencial CLI-XXXXXX):</span>
                <strong className="text-emerald-400">{autoFillCounts.noClienteCode}</strong>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-850/60 rounded">
                <span>Datas Ausentes / Inválidas (Definidas com a data de Hoje):</span>
                <strong className="text-emerald-400">{autoFillCounts.noData}</strong>
              </div>
            </div>
            
            <div className="bg-slate-900/90 p-3 rounded border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2 mt-2 leading-relaxed">
              <Edit3 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                <strong>Ação Recomendada:</strong> Acesse a aba <strong>&quot;Registro de Devoluções&quot;</strong> para preencher as Notas Fiscais reais ou ajustar os valores das devoluções editando as linhas importadas diretamente.
              </span>
            </div>
          </div>

          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Tempo de Importação: <strong className="text-slate-200">{importSummary.duration}s</strong></span>
            </div>
            <div>
              <span>Linhas Ignoradas (Brancas): <strong className="text-slate-200">{importSummary.ignoredRows}</strong></span>
            </div>
            <div>
              <span>Total Processado: <strong className="text-slate-200">{importSummary.historico.total + importSummary.ignoredRows}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Zone */}
      {parsedData.length === 0 && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerInputClick}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
            dragActive ? "border-sky-500 bg-sky-500/5" : "border-slate-800 bg-slate-950/30 hover:border-slate-700"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-slate-900/80 rounded-full border border-slate-850 text-slate-400 shadow-inner">
              <Upload className="w-9 h-9 text-sky-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-200 block font-sans">Selecione o arquivo Excel / CSV da Heineken</span>
              <span className="text-xs text-slate-500 block mt-1.5">Arraste-o aqui ou clique para navegar nos seus arquivos</span>
            </div>
            <div className="bg-slate-900/50 border border-slate-850 px-4 py-2 rounded-lg text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              Análise e detecção de colunas 100% inteligente ativa
            </div>
          </div>
        </div>
      )}

      {/* Instant Preview after File Selection, No column mapping setup! */}
      {file && parsedData.length > 0 && !importSummary && (
        <div className="bg-slate-950/40 p-6 rounded-xl border border-slate-800 space-y-5">
          {layoutLearnedMessage && (
            <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl flex items-center gap-3 text-sky-400 font-mono text-xs">
              <Sparkles className="w-5 h-5 shrink-0 text-sky-400 animate-pulse" />
              <div>
                <strong className="block text-[11px] uppercase tracking-wider">Aprendizado Ativo Ampla</strong>
                <span className="text-slate-300 mt-0.5 block">{layoutLearnedMessage}</span>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/25 p-4 rounded-xl border border-slate-850">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-500/10 rounded-lg border border-sky-500/20 text-sky-400 shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Arquivo Heineken Carregado</span>
                <span className="text-sm font-semibold text-slate-200 block truncate">{file.name}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">Tamanho: {(file.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
            <div className="bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-800 text-center shrink-0 min-w-[100px]">
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Registros Encontrados</span>
              <span className="text-xl font-black text-sky-400 font-mono block mt-0.5">{parsedData.length}</span>
            </div>
          </div>

          {/* Autodetect highlights banner */}
          <div className="bg-slate-900/30 border border-slate-850 p-4 rounded-xl space-y-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider font-bold">Relatório de Mapeamento Autónomo Heineken</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
              <div className="p-2 bg-slate-950/40 rounded border border-slate-850 flex items-center justify-between">
                <span className="text-slate-400">Data Devolução:</span>
                <span className={detectedMappings.data ? "text-sky-400 font-bold" : "text-amber-500 font-semibold"}>
                  {detectedMappings.data ? `&quot;${detectedMappings.data}&quot;` : "Ausente (Hoje)"}
                </span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded border border-slate-850 flex items-center justify-between">
                <span className="text-slate-400">Cód. Cliente:</span>
                <span className={detectedMappings.clienteCodigo ? "text-sky-400 font-bold" : "text-amber-500 font-semibold"}>
                  {detectedMappings.clienteCodigo ? `&quot;${detectedMappings.clienteCodigo}&quot;` : "Ausente (CLI-xxxx)"}
                </span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded border border-slate-850 flex items-center justify-between">
                <span className="text-slate-400">Valor Nota:</span>
                <span className={detectedMappings.valorNF ? "text-sky-400 font-bold" : "text-amber-500 font-semibold"}>
                  {detectedMappings.valorNF ? `&quot;${detectedMappings.valorNF}&quot;` : "Ausente (R$ 0)"}
                </span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded border border-slate-850 flex items-center justify-between">
                <span className="text-slate-400">Número da NF:</span>
                <span className={detectedMappings.numeroNF ? "text-sky-400 font-bold" : "text-amber-500 font-semibold"}>
                  {detectedMappings.numeroNF ? `&quot;${detectedMappings.numeroNF}&quot;` : "Ausente (SEM NF)"}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-1">
              • Todos os campos não localizados serão preenchidos de forma tolerante (Ex: notas fiscais sem identificação receberão &quot;SEM-NF&quot; e valores zerados receberão R$ 0,00) para garantir que a importação nunca seja interrompida ou cancelada.
            </p>
          </div>

          {/* Mapeamento de Colunas Toggle */}
          <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Correção e Mapeamento de Colunas</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Reconhecidas: <strong className="text-emerald-400">{recognizedCount}</strong> • Sem correspondência: <strong className="text-amber-400">{unmappedCount}</strong>
              </span>
            </div>
            <button
              onClick={() => setShowMappingPanel(!showMappingPanel)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 font-mono"
            >
              {showMappingPanel ? "Ocultar Mapeamento Detalhado" : "Ajustar Mapeamento Manual"}
            </button>
          </div>

          {/* Interactive Mappings Box */}
          {showMappingPanel && (
            <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/70 space-y-3">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Memorização Inteligente de Modelos
                </span>
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="w-full sm:w-2/3">
                    <label className="text-[10px] text-slate-400 block mb-1 font-sans">Nome do Layout / Modelo</label>
                    <input
                      type="text"
                      placeholder="Ex: Heineken Goiânia - Modelo Geral, Relatório Devoluções Sul, etc."
                      value={layoutName}
                      onChange={(e) => {
                        setLayoutName(e.target.value);
                        setIsNewLayout(true);
                      }}
                      className="w-full text-xs p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:border-sky-500 outline-none placeholder:text-slate-600 font-sans"
                    />
                  </div>
                  <div className="w-full sm:w-1/3 flex items-end justify-start sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAllFields(!showAllFields)}
                      className={`w-full px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all font-mono ${
                        showAllFields 
                          ? "bg-sky-500/10 text-sky-400 border-sky-500/20" 
                          : "bg-slate-800 text-slate-300 border-slate-750 hover:bg-slate-700"
                      }`}
                    >
                      {showAllFields ? "Mostrar apenas não mapeados" : "Mostrar todos os campos"}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  • <strong>Aprendizado Contínuo:</strong> Ao processar a planilha, o Sistema AMPLA salvará o layout acima com o nome especificado para automatizar correspondências futuras.
                </p>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed font-sans mb-1 bg-slate-950/30 p-3 rounded-lg border border-slate-850">
                • <strong>Mapeamento Flexível:</strong> Se houver alguma coluna que o sistema não reconheceu de forma autônoma, use as caixas de seleção abaixo para informar a coluna correta de sua planilha. O preenchimento tolerante garantirá que os campos não preenchidos recebam valores vazios ou nulos sem travar.
              </div>

              <div className="space-y-5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {["Devolução", "Clientes", "Motoristas", "Hierarquia Comercial", "Motivo Heineken", "Geral"].map(group => {
                  const searchGroup = group === "Hierarquia Comercial" ? "Hierarquia" : group === "Motivo Heineken" ? "Motivo" : group;
                  let groupFields = SYSTEM_FIELDS.filter(sf => sf.group === searchGroup || (searchGroup === "Geral" && sf.group === "Geral"));
                  
                  if (!showAllFields) {
                    groupFields = groupFields.filter(field => !detectedMappings[field.key]);
                  }
                  
                  if (groupFields.length === 0) return null;

                  return (
                    <div key={group} className="space-y-2">
                      <h5 className="text-[10px] text-sky-400 uppercase tracking-wider font-bold border-b border-slate-800/60 pb-1 flex items-center justify-between">
                        <span>{group}</span>
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {groupFields.map(field => {
                          const isMapped = !!detectedMappings[field.key];
                          const mappedValue = detectedMappings[field.key] || "";

                          return (
                            <div 
                              key={field.key} 
                              className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 transition-all ${
                                isMapped 
                                  ? "bg-slate-900/40 border-slate-800/80" 
                                  : field.required 
                                    ? "bg-rose-500/5 border-rose-500/20" 
                                    : "bg-slate-900/10 border-slate-900"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-300 font-sans font-medium flex items-center gap-1">
                                  {field.label}
                                  {field.required && <span className="text-rose-500">*</span>}
                                </span>
                                
                                {isMapped ? (
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Reconhecido
                                  </span>
                                ) : field.required ? (
                                  <span className="text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold animate-pulse">
                                    <AlertCircle className="w-2.5 h-2.5" /> Obrigatório
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-750 px-1.5 py-0.5 rounded">
                                    Opcional
                                  </span>
                                )}
                              </div>

                              <select
                                value={mappedValue}
                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                className={`text-xs p-1.5 rounded-md border bg-slate-950 text-slate-200 outline-none w-full transition-all ${
                                  isMapped 
                                    ? "border-slate-850 hover:border-slate-700 focus:border-slate-650" 
                                    : "border-rose-500/35 focus:border-rose-500"
                                }`}
                              >
                                <option value="">-- Ignorar / Gravar Vazio --</option>
                                {headers.map((h, hIdx) => (
                                  <option key={`${h}-${hIdx}`} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {importProgress && (
            <div className="space-y-2 bg-slate-900/20 p-4 border border-slate-850 rounded-xl">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Processando dados em lotes...</span>
                <span>Lote {importProgress.current} de {importProgress.total}</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div 
                  className="bg-sky-500 h-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setFile(null);
                setParsedData([]);
                setHeaders([]);
                setStatus({ type: null, msg: "" });
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors font-mono"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              onClick={executeImport}
              disabled={isLoading}
              className="px-6 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-2 font-mono shadow-lg shadow-sky-500/10"
            >
              {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {isLoading ? "Processando..." : "IMPORTAR PLANILHA"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
