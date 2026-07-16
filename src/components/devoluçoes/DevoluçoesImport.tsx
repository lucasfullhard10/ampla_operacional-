import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Layers } from "lucide-react";

interface ImportProps {
  unidades: any[];
  onRefresh: () => void;
  currentUser: any;
}

export default function DevolucoesImport({ unidades, onRefresh, currentUser }: ImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  const [importSummary, setImportSummary] = useState<any | null>(null);

  // Column mappings
  const [mappings, setMappings] = useState<Record<string, string>>({
    data: "",
    motoristaMatricula: "",
    motoristaNome: "",
    motoristaTelefone: "",
    clienteCodigo: "",
    clienteRazaoSocial: "",
    clienteNomeFantasia: "",
    vendedor: "",
    supervisor: "",
    gerente: "",
    canal: "",
    endereco: "",
    numeroNF: "",
    valorNF: "",
    motivoCodigo: "",
    motivoDescricao: "",
    observacao: "",
    unidadeId: "",
    status: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile) return;
    
    // Check extension
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
        
        // Convert to JSON with headers
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length === 0) {
          throw new Error("A planilha está vazia.");
        }

        const rawHeaders = json[0].map((h: any) => String(h || "").trim());
        setHeaders(rawHeaders);

        // Map data rows
        const rows = json.slice(1).map((row: any[]) => {
          const obj: Record<string, any> = {};
          rawHeaders.forEach((header: string, index: number) => {
            obj[header] = row[index] !== undefined ? row[index] : "";
          });
          return obj;
        });

        setParsedData(rows);

        // Auto detect mappings based on heuristics
        const newMappings = { ...mappings };
        rawHeaders.forEach((h: string) => {
          const upper = h.toUpperCase();
          if (upper.includes("DATA") || upper.includes("EMISS") || upper.includes("DT")) newMappings.data = h;
          if (upper.includes("MATRICULA") || upper.includes("MATR") || upper.includes("CHAPA") || upper.includes("RE")) newMappings.motoristaMatricula = h;
          if (upper.includes("MOTORISTA") || upper.includes("NOME MOT")) newMappings.motoristaNome = h;
          if (upper.includes("FONE") || upper.includes("CELULAR") || upper.includes("TEL")) newMappings.motoristaTelefone = h;
          if (upper.includes("COD") || upper.includes("CLIENTE") || upper.includes("PDV")) newMappings.clienteCodigo = h;
          if (upper.includes("RAZAO") || upper.includes("SOCIAL") || upper.includes("NOME COMPLETO")) newMappings.clienteRazaoSocial = h;
          if (upper.includes("FANTASIA") || upper.includes("APELIDO")) newMappings.clienteNomeFantasia = h;
          if (upper.includes("VENDEDOR") || upper.includes("RCA") || upper.includes("VEND")) newMappings.vendedor = h;
          if (upper.includes("SUPERVISOR") || upper.includes("SUP")) newMappings.supervisor = h;
          if (upper.includes("GERENTE") || upper.includes("GER")) newMappings.gerente = h;
          if (upper.includes("CANAL") || upper.includes("VULGO")) newMappings.canal = h;
          if (upper.includes("ENDERECO") || upper.includes("RUA") || upper.includes("LOCAL")) newMappings.endereco = h;
          if (upper.includes("NF") || upper.includes("NOTA") || upper.includes("NUMERO") || upper.includes("DOC")) newMappings.numeroNF = h;
          if (upper.includes("VALOR") || upper.includes("PRECO") || upper.includes("TOTAL")) newMappings.valorNF = h;
          if (upper.includes("MOTIVO") || upper.includes("COD_MOT") || upper.includes("CODIGO MOTIVO")) newMappings.motivoCodigo = h;
          if (upper.includes("DESCRICAO") || upper.includes("MOTIVO_DESC") || upper.includes("DESC MOTIVO")) newMappings.motivoDescricao = h;
          if (upper.includes("OBS") || upper.includes("COMENTARIO")) newMappings.observacao = h;
          if (upper.includes("FILIAL") || upper.includes("UNIDADE") || upper.includes("EMPRESA")) newMappings.unidadeId = h;
          if (upper.includes("STATUS") || upper.includes("SITUACAO") || upper.includes("CONCLUIDO")) newMappings.status = h;
        });

        // Use standard unit mapping if found
        setMappings(newMappings);
        setStatus({ type: "success", msg: `${rows.length} linhas carregadas com sucesso! Verifique o mapeamento das colunas abaixo.` });
      } catch (err: any) {
        setStatus({ type: "error", msg: `Erro ao processar planilha: ${err.message}` });
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setStatus({ type: "error", msg: "Erro ao ler o arquivo." });
      setIsLoading(false);
    };

    reader.readAsBinaryString(selectedFile);
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

  const handleMappingChange = (field: string, val: string) => {
    setMappings(prev => ({ ...prev, [field]: val }));
  };

  const executeImport = async () => {
    if (parsedData.length === 0) return;
    setIsLoading(true);
    setStatus({ type: null, msg: "" });
    setImportSummary(null);

    try {
      // Structure import data
      const clientes: any[] = [];
      const motoristas: any[] = [];
      const hierarquia: any[] = [];
      const motivos: any[] = [];
      const historico: any[] = [];

      // Determine unit code default
      const defaultUnit = currentUser.unidadeId !== "Todas" ? currentUser.unidadeId : (unidades[0]?.id || "un-go");

      parsedData.forEach((row) => {
        // Resolve values based on mapped columns
        const dataVal = mappings.data ? row[mappings.data] : new Date().toISOString().split("T")[0];
        
        let rowDate = "";
        if (dataVal instanceof Date) {
          rowDate = dataVal.toISOString().split("T")[0];
        } else if (dataVal) {
          // Attempt parsing date string
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

        const motoristaMatricula = mappings.motoristaMatricula ? String(row[mappings.motoristaMatricula] || "").trim() : "";
        const motoristaNome = mappings.motoristaNome ? String(row[mappings.motoristaNome] || "").trim() : "";
        const motoristaTelefone = mappings.motoristaTelefone ? String(row[mappings.motoristaTelefone] || "").trim() : "Não Informado";

        const clienteCodigo = mappings.clienteCodigo ? String(row[mappings.clienteCodigo] || "").trim() : "";
        const clienteRazaoSocial = mappings.clienteRazaoSocial ? String(row[mappings.clienteRazaoSocial] || "").trim() : "";
        const clienteNomeFantasia = mappings.clienteNomeFantasia ? String(row[mappings.clienteNomeFantasia] || "").trim() : clienteRazaoSocial;

        const vendedor = mappings.vendedor ? String(row[mappings.vendedor] || "").trim() : "";
        const supervisor = mappings.supervisor ? String(row[mappings.supervisor] || "").trim() : "";
        const gerente = mappings.gerente ? String(row[mappings.gerente] || "").trim() : "";
        const canal = mappings.canal ? String(row[mappings.canal] || "").trim() : "Rotas";
        const endereco = mappings.endereco ? String(row[mappings.endereco] || "").trim() : "Não Informado";

        const numeroNF = mappings.numeroNF ? String(row[mappings.numeroNF] || "").trim() : "";
        const rawValor = mappings.valorNF ? row[mappings.valorNF] : 0;
        const valorNF = typeof rawValor === "number" ? rawValor : parseFloat(String(rawValor).replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;

        const motivoCodigo = mappings.motivoCodigo ? String(row[mappings.motivoCodigo] || "").trim() : "Y40";
        const motivoDescricao = mappings.motivoDescricao ? String(row[mappings.motivoDescricao] || "").trim() : "PDV Fechado";
        const observacao = mappings.observacao ? String(row[mappings.observacao] || "").trim() : "";

        // Resolve unit
        let rowUnitId = defaultUnit;
        if (mappings.unidadeId && row[mappings.unidadeId]) {
          const mappedUnitName = String(row[mappings.unidadeId]).toUpperCase();
          const matchedUnit = unidades.find(u => 
            (u.nome && u.nome.toUpperCase().includes(mappedUnitName)) || 
            (u.id && u.id.toUpperCase() === mappedUnitName)
          );
          if (matchedUnit) {
            rowUnitId = matchedUnit.id;
          }
        }

        const rowStatus = mappings.status && row[mappings.status] ? 
          (String(row[mappings.status]).toLowerCase().includes("resolv") || String(row[mappings.status]).toLowerCase().includes("sim") ? "Resolvida" : "Pendente") : 
          "Pendente";

        // Collect entities to save
        if (clienteCodigo) {
          clientes.push({
            codigo: clienteCodigo,
            razaoSocial: clienteRazaoSocial || clienteNomeFantasia,
            nomeFantasia: clienteNomeFantasia,
            cnpj: "00.000.000/0001-00",
            cidade: "Goiânia",
            uf: "GO",
            telefone: "Não cadastrado",
            canalVenda: canal,
            vendedor,
            supervisor,
            gerente,
            areaResponsavel: "Vendas",
            situacao: "Ativo",
            unidadeId: rowUnitId
          });
        }

        if (motoristaMatricula && motoristaNome) {
          motoristas.push({
            matricula: motoristaMatricula,
            nome: motoristaNome,
            telefone: motoristaTelefone || "Não Informado",
            funcao: "Motorista",
            unidadeId: rowUnitId,
            status: "Ativo"
          });
        }

        if (vendedor) {
          hierarquia.push({
            vendedor,
            supervisor,
            gerente,
            area: "Vendas",
            canal,
            telefone: "Não cadastrado",
            email: `${vendedor.toLowerCase().replace(/\s+/g, ".")}@ambev.com.br`,
            status: "Ativo",
            unidadeId: rowUnitId
          });
        }

        if (motivoCodigo) {
          motivos.push({
            codigo: motivoCodigo,
            descricao: motivoDescricao
          });
        }

        if (numeroNF && clienteCodigo) {
          historico.push({
            data: rowDate || new Date().toISOString().split("T")[0],
            motoristaMatricula,
            motoristaNome: motoristaNome || "Não Informado",
            motoristaTelefone: motoristaTelefone || "Não Informado",
            clienteCodigo,
            clienteRazaoSocial: clienteRazaoSocial || clienteNomeFantasia,
            clienteNomeFantasia,
            vendedor,
            supervisor,
            gerente,
            areaResponsavel: "Vendas",
            canal,
            telefone: "Não cadastrado",
            endereco,
            numeroNF,
            valorNF,
            motivoCodigo,
            motivoDescricao,
            observacao,
            unidadeId: rowUnitId,
            status: rowStatus
          });
        }
      });

      // deduplicate arrays to prevent bloat
      const uniqueClients = Array.from(new Map(clientes.map(item => [item.codigo, item])).values());
      const uniqueDrivers = Array.from(new Map(motoristas.map(item => [item.matricula, item])).values());
      const uniqueHierarchy = Array.from(new Map(hierarquia.map(item => [item.vendedor + "_" + item.unidadeId, item])).values());
      const uniqueReasons = Array.from(new Map(motivos.map(item => [item.codigo, item])).values());

      const payload = {
        clientes: uniqueClients,
        motoristas: uniqueDrivers,
        hierarquia: uniqueHierarchy,
        motivos: uniqueReasons,
        historico
      };

      const res = await fetch("/api/devolucoes/import-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload })
      });

      if (!res.ok) {
        throw new Error("Erro na comunicação com o servidor.");
      }

      const reply = await res.json();
      if (reply.success) {
        setImportSummary(reply.summary);
        setStatus({ type: "success", msg: "Importação realizada com sucesso! Os dados foram processados." });
        onRefresh();
        // Clear state
        setFile(null);
        setParsedData([]);
      } else {
        throw new Error(reply.error || "Erro desconhecido");
      }
    } catch (err: any) {
      setStatus({ type: "error", msg: `Falha na importação: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const fieldsForMapping = [
    { key: "data", label: "Data de Devolução", req: true },
    { key: "numeroNF", label: "Número da NF", req: true },
    { key: "valorNF", label: "Valor NF (R$)", req: true },
    { key: "clienteCodigo", label: "Código do Cliente/PDV", req: true },
    { key: "clienteNomeFantasia", label: "Nome Fantasia Cliente", req: false },
    { key: "motoristaMatricula", label: "Matrícula Motorista", req: false },
    { key: "motoristaNome", label: "Nome do Motorista", req: false },
    { key: "vendedor", label: "Nome do Vendedor", req: false },
    { key: "supervisor", label: "Nome do Supervisor", req: false },
    { key: "motivoCodigo", label: "Código do Motivo (ex: Y40)", req: false },
    { key: "motivoDescricao", label: "Descrição do Motivo", req: false },
    { key: "unidadeId", label: "Unidade/Filial", req: false }
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" /> Centro de Importação Inteligente
          </h2>
          <p className="text-xs text-slate-400 mt-1">Carregue sua planilha consolidada Heineken (Excel/XLSX/CSV) para popular o banco de dados sem esforço.</p>
        </div>
      </div>

      {status.msg && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border ${
          status.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <div className="text-xs font-mono">{status.msg}</div>
        </div>
      )}

      {importSummary && (
        <div className="bg-slate-950/80 border border-slate-850 p-5 rounded-lg space-y-3">
          <h4 className="text-sm font-semibold text-sky-400 font-mono">Resumo do Processamento</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Clientes", val: importSummary.clientes },
              { label: "Motoristas", val: importSummary.motoristas },
              { label: "Hierarquia", val: importSummary.hierarquia },
              { label: "Motivos", val: importSummary.motivos },
              { label: "Devoluções", val: importSummary.historico }
            ].map(item => (
              <div key={item.label} className="bg-slate-900 p-3 rounded-md border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">{item.label}</span>
                <span className="text-lg font-extrabold text-slate-200 block font-mono mt-1">{item.val?.success || 0}</span>
                <span className="text-[9px] text-slate-600 block">de {item.val?.total || 0}</span>
              </div>
            ))}
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
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
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
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-4 bg-slate-900/80 rounded-full border border-slate-800 text-slate-400">
              <Upload className="w-8 h-8 text-sky-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Clique para enviar ou arraste o arquivo aqui</span>
              <span className="text-xs text-slate-500 block mt-1">Suporta formatos .xlsx, .xls ou .csv consolidados da operação</span>
            </div>
          </div>
        </div>
      )}

      {/* Column Mapping Section */}
      {parsedData.length > 0 && (
        <div className="space-y-4">
          <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-300 font-mono tracking-wider uppercase mb-3 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-sky-400" /> Mapeamento de Colunas da Planilha
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fieldsForMapping.map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-400 font-mono block">
                    {field.label} {field.req && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={mappings[field.key] || ""}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 rounded-lg p-2 font-mono"
                  >
                    <option value="">-- Ignorar ou Não mapear --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setFile(null);
                setParsedData([]);
                setHeaders([]);
                setStatus({ type: null, msg: "" });
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors font-mono"
            >
              Cancelar
            </button>
            <button
              onClick={executeImport}
              disabled={isLoading}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
            >
              {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {isLoading ? "Processando..." : "Confirmar e Importar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
