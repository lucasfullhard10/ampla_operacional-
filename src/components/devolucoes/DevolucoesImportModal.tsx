import React, { useState } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Sparkles, ArrowRight, RefreshCw, Save } from "lucide-react";
import * as XLSX from "xlsx";
import { DevolucaoCliente, DevolucaoMotorista, DevolucaoMotivo } from "../../types";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientes: DevolucaoCliente[];
  motoristas: DevolucaoMotorista[];
  motivos: DevolucaoMotivo[];
  currentUser: any;
}

export default function DevolucoesImportModal({
  isOpen,
  onClose,
  onSuccess,
  clientes = [],
  motoristas = [],
  motivos = [],
  currentUser
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [enrichedData, setEnrichedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<{ total: number; enrichedClients: number; autoNFs: number }>({
    total: 0,
    enrichedClients: 0,
    autoNFs: 0
  });

  if (!isOpen) return null;

  // Process File with intelligent zero-barrier auto mapping
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
          alert("A planilha selecionada está vazia.");
          setIsProcessing(false);
          return;
        }

        // Auto-match headers intelligently
        let enrichedCount = 0;
        let autoNFCount = 0;
        const currentYear = new Date().getFullYear();
        let seqNF = 1;

        const processed = rawRows.map((row, idx) => {
          // Normalize key names
          const keys = Object.keys(row);
          const findVal = (...aliases: string[]) => {
            const matchedKey = keys.find(k => {
              const cleanK = String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
              return aliases.some(a => cleanK.includes(a.toLowerCase().replace(/[^a-z0-9]/g, "")));
            });
            return matchedKey ? row[matchedKey] : "";
          };

          // Raw extracted fields
          let numNF = String(findVal("nf", "nota", "numero_nf", "num_nf", "doc") || "").trim();
          if (!numNF) {
            numNF = `NF-${String(seqNF++).padStart(6, "0")}`;
            autoNFCount++;
          }

          let valNF = parseFloat(String(findVal("valor", "val", "vlr", "total", "montante") || "0").replace("R$", "").replace(/\./g, "").replace(",", "."));
          if (isNaN(valNF)) valNF = 0;

          let cliCod = String(findVal("cliente", "cod_cliente", "cliente_codigo", "cod_cli", "cnpj", "pdv") || "").trim();
          let cliNome = String(findVal("nome_cliente", "razao", "fantasia", "cliente_nome", "nome") || "").trim();

          let drvMat = String(findVal("matricula", "cod_motorista", "motorista_id") || "").trim();
          let drvNome = String(findVal("motorista", "nome_motorista", "condutor") || "").trim();

          let motCod = String(findVal("motivo", "cod_motivo", "motivo_codigo", "ycode", "codigo_motivo") || "").trim();
          let motDesc = String(findVal("descricao_motivo", "desc_motivo", "motivo_desc") || "").trim();

          let statusVal = String(findVal("status", "situacao", "estado") || "Aguardando Tratativa").trim();
          if (!["Aguardando Tratativa", "Em Análise", "Em Atendimento", "Aguardando Comercial", "Resolvida", "Cancelada"].includes(statusVal)) {
            statusVal = "Aguardando Tratativa";
          }

          let dataOcc = String(findVal("data", "data_ocorrido", "data_emissao") || "").trim();
          if (!dataOcc) {
            dataOcc = new Date().toISOString().split("T")[0];
          }

          let obs = String(findVal("observacao", "obs", "detalhes", "historico") || "").trim();
          let filialVal = String(findVal("filial", "unidade", "unidadeId") || currentUser?.unidadeId || "un-go").trim();

          // AUTO ENRICHMENT AGAINST OFFICIAL DATABASE
          let vendedor = "";
          let supervisor = "";
          let gerente = "";
          let canal = "";
          let area = "";
          let endereco = "";
          let cidade = "";
          let uf = "";
          let telefoneCliente = "";

          if (cliCod) {
            const matchedCli = clientes.find(c => String(c.codigo).trim().toLowerCase() === cliCod.toLowerCase());
            if (matchedCli) {
              if (!cliNome) cliNome = matchedCli.nomeFantasia || matchedCli.razaoSocial;
              vendedor = matchedCli.vendedor || "";
              supervisor = matchedCli.supervisor || "";
              gerente = matchedCli.gerente || "";
              canal = matchedCli.canalVenda || "Rotas";
              area = (matchedCli as any).areaResponsavel || "";
              endereco = matchedCli.endereco || "";
              cidade = matchedCli.cidade || "";
              uf = matchedCli.uf || "";
              telefoneCliente = matchedCli.telefone || "";
              if (matchedCli.unidadeId) filialVal = matchedCli.unidadeId;
              enrichedCount++;
            }
          }

          // Motorista enrichment
          let drvTel = "";
          if (drvMat || drvNome) {
            const matchedDrv = motoristas.find(m => 
              (drvMat && String(m.matricula).toLowerCase() === drvMat.toLowerCase()) ||
              (drvNome && m.nome.toLowerCase().includes(drvNome.toLowerCase()))
            );
            if (matchedDrv) {
              drvMat = matchedDrv.matricula || matchedDrv.id;
              drvNome = matchedDrv.nome;
              drvTel = matchedDrv.telefone || "";
            }
          }

          // Motivo enrichment
          if (motCod && !motDesc) {
            const matchedMot = motivos.find(m => String(m.codigo).toLowerCase() === motCod.toLowerCase());
            if (matchedMot) {
              motDesc = matchedMot.descricao;
            }
          }

          return {
            numeroNF: numNF,
            valorNF: valNF,
            clienteCodigo: cliCod || `CLI-${idx + 100}`,
            clienteNome: cliNome || "Cliente Importado",
            clienteRazaoSocial: cliNome,
            clienteNomeFantasia: cliNome,
            vendedor,
            supervisor,
            gerente,
            canal,
            area,
            endereco,
            cidade,
            uf,
            telefoneCliente,
            filial: filialVal,
            unidadeId: filialVal,
            motoristaMatricula: drvMat || "DRV-IMP",
            motoristaNome: drvNome || "Motorista Importado",
            motoristaTelefone: drvTel,
            motivoCodigo: motCod || "Y40",
            motivoDescricao: motDesc || "PDV Fechado",
            status: statusVal,
            resolvido: statusVal === "Resolvida" ? "SIM" : "NÃO",
            observacao: obs || "Importado via planilha inteligente",
            dataOcorrido: dataOcc,
            data: dataOcc,
            usuarioCadastro: currentUser?.nome || "Importador IA",
            dataCadastro: new Date().toISOString()
          };
        });

        setParsedData(processed);
        setEnrichedData(processed);
        setStats({
          total: processed.length,
          enrichedClients: enrichedCount,
          autoNFs: autoNFCount
        });
      } catch (err) {
        console.error(err);
        alert("Erro ao ler arquivo Excel. Verifique a formatação do arquivo.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  // Import batch to server database
  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return;
    setIsUploading(true);

    try {
      const res = await fetch("/api/devolucoes/import-sheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify({
          data: {
            historico: parsedData
          }
        })
      });

      if (res.ok) {
        alert(`✓ ${parsedData.length} devoluções importadas com sucesso!`);
        onSuccess();
        onClose();
      } else {
        const errJson = await res.json();
        alert(`Erro na importação: ${errJson.error || "Falha ao gravar no banco"}`);
      }
    } catch (err: any) {
      alert(`Falha na conexão: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-tight">
                Importação Inteligente de Planilhas (Zero Mapeamento)
              </h2>
              <p className="text-xs text-slate-400">
                A IA identifica as colunas automaticamente e enriquece os registros com o banco oficial de Clientes e Motoristas.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono text-slate-200">
          {/* Upload Area */}
          {parsedData.length === 0 ? (
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center space-y-4 bg-slate-950/40 hover:border-sky-500/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Selecione uma planilha de devoluções (.xlsx, .xls ou .csv)</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Não é necessário ajustar colunas! O sistema identifica automaticamente número de NF, cliente, valor, motivo e motorista.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold rounded-lg cursor-pointer shadow-lg shadow-sky-500/10 transition-all">
                <Upload className="w-4 h-4" />
                <span>Escolher Arquivo Excel</span>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300 text-sm block">
                      {stats.total} Devoluções Identificadas com Sucesso!
                    </span>
                    <span className="text-[11px] text-emerald-400/80 block mt-0.5">
                      ✓ {stats.enrichedClients} clientes enriquecidos com a base oficial de hierarquia. {stats.autoNFs > 0 ? `(${stats.autoNFs} NFs geradas automaticamente)` : ""}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setParsedData([]);
                    setFile(null);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold"
                >
                  Carregar Outro Arquivo
                </button>
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <div className="p-3 bg-slate-950 border-b border-slate-800 font-bold text-[11px] text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>Pré-visualização dos Registros ({parsedData.length})</span>
                  <span className="text-sky-400">Pronto para Gravação Direta no Banco</span>
                </div>
                <div className="max-h-[280px] overflow-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold">
                        <th className="p-2.5">NF</th>
                        <th className="p-2.5">Data</th>
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5">Motorista</th>
                        <th className="p-2.5">Motivo</th>
                        <th className="p-2.5 text-right">Valor (R$)</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {parsedData.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="p-2.5 font-bold text-sky-400">{row.numeroNF}</td>
                          <td className="p-2.5 text-slate-300">{row.dataOcorrido}</td>
                          <td className="p-2.5 text-slate-200 truncate max-w-[150px]">{row.clienteNome}</td>
                          <td className="p-2.5 text-slate-300 truncate max-w-[120px]">{row.motoristaNome}</td>
                          <td className="p-2.5 font-mono text-slate-400">{row.motivoCodigo}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-400">
                            R$ {row.valorNF?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800 bg-slate-950/50">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg">
            Cancelar
          </button>
          {parsedData.length > 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={isUploading}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isUploading ? "Gravando no Banco..." : `Confirmar e Importar ${parsedData.length} Registros`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
