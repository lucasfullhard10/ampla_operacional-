import React, { useState, useMemo, useEffect } from "react";
import { 
  Plus, Search, Truck, MapPin, Navigation, Calendar, Download, FileText, 
  Trash2, ShieldAlert, Edit, Info, Clock, AlertTriangle, Save, History, 
  Paperclip, ClipboardList, Check, X, ChevronRight, Upload, PlusCircle, Bookmark
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EntregaOff, Veiculo, Motorista, EntregaOffNF, Unidade, OccurrenceEntry, ChangeLogEntry } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";

interface EntregasOffProps {
  offList: EntregaOff[];
  veiculos: Veiculo[];
  motoristas: Motorista[];
  unidades?: Unidade[];
  onRefresh: () => void;
  userEmail: string;
}

interface NfField {
  numero_nf: string;
  valor_nf: string;
}

// Operational Status Mapping
export const STATUS_OPTIONS = [
  "Aguardando Programação",
  "Programada",
  "Aguardando Carregamento",
  "Em Carregamento",
  "Em Rota",
  "Chegou ao Cliente",
  "Em Descarga",
  "AG.DESCARGA",
  "Entrega Parcial",
  "Entrega Concluída",
  "Cliente Ausente",
  "Cliente Fechado",
  "Recusada",
  "Reagendada",
  "Devolução Parcial",
  "Devolução Total",
  "Cancelada",
  "Veículo Quebrado",
  "Problema Operacional",
  "Retornando à Base",
  "Finalizada"
];

// Color mapping for all of the 20 operation statuses
export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  "Aguardando Programação": { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", label: "Ag. Programação" },
  "Programada": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Programada" },
  "Aguardando Carregamento": { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20", label: "Ag. Carregamento" },
  "Em Carregamento": { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", label: "Em Carregamento" },
  "Em Rota": { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20", label: "Em Rota" },
  "Chegou ao Cliente": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "No Cliente" },
  "Em Descarga": { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", label: "Em Descarga" },
  "AG.DESCARGA": { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", label: "AG.DESCARGA" },
  "Entrega Parcial": { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "Parcial" },
  "Entrega Concluída": { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20", label: "Concluída" },
  "Cliente Ausente": { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/18", label: "Ausente" },
  "Cliente Fechado": { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/18", label: "Fechado" },
  "Recusada": { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", label: "Recusada" },
  "Reagendada": { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/20", label: "Reagendada" },
  "Devolução Parcial": { bg: "bg-orange-400/10", text: "text-orange-300", border: "border-orange-400/20", label: "Dev. Parcial" },
  "Devolução Total": { bg: "bg-red-600/10", text: "text-red-300", border: "border-red-600/20", label: "Dev. Total" },
  "Cancelada": { bg: "bg-slate-700/10", text: "text-slate-500", border: "border-slate-700/20", label: "Cancelada" },
  "Veículo Quebrado": { bg: "bg-red-600/15", text: "text-red-400", border: "border-red-600/20", label: "Vei. Quebrado" },
  "Problema Operacional": { bg: "bg-purple-600/10", text: "text-purple-400", border: "border-purple-600/20", label: "Prob. Operacional" },
  "Retornando à Base": { bg: "bg-indigo-600/10", text: "text-indigo-400", border: "border-indigo-600/20", label: "Retornando Base" },
  "Finalizada": { bg: "bg-emerald-600/10", text: "text-emerald-400", border: "border-emerald-600/20", label: "Finalizada" },
  "Pendente": { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", label: "Pendente" }
};

export const OCCURRENCE_TYPES = [
  "Cliente Ausente",
  "Cliente Fechado",
  "Recusa",
  "Falta de Produto",
  "Endereço Incorreto",
  "Problema Mecânico",
  "Trânsito",
  "Acidente",
  "Reagendamento",
  "Outros"
];

export default function EntregasOffView({ offList, veiculos, motoristas, unidades = [], onRefresh, userEmail }: EntregasOffProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Selected delivery for deep operation/edit modal
  const [selectedDelivery, setSelectedDelivery] = useState<EntregaOff | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<"editar" | "ocorrencias" | "anexos" | "historico">("editar");

  // Notifications & Modals
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);

  // Creation Form Fields
  const [dt, setDt] = useState("");
  const [cliente, setCliente] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().split("T")[0]);
  const [tipoOperacao, setTipoOperacao] = useState("Entrega Extralimite");
  const [statusEntrega, setStatusEntrega] = useState("Aguardando Programação");
  const [qtdNfs, setQtdNfs] = useState<number>(1);
  const [nfsFields, setNfsFields] = useState<NfField[]>([{ numero_nf: "", valor_nf: "" }]);

  // Edition Form Fields (State for modal modification)
  const [editMotoristaId, setEditMotoristaId] = useState("");
  const [editVeiculoId, setEditVeiculoId] = useState("");
  const [editPlaca, setEditPlaca] = useState("");
  const [editUnidadeId, setEditUnidadeId] = useState("");
  const [editCliente, setEditCliente] = useState("");
  const [editCidade, setEditCidade] = useState("");
  const [editEndereco, setEditEndereco] = useState("");
  const [editData, setEditData] = useState("");
  const [editHorario, setEditHorario] = useState("");
  const [editObservacoes, setEditObservacoes] = useState("");
  const [editQtdVolumes, setEditQtdVolumes] = useState(1);
  const [editQtdEntregues, setEditQtdEntregues] = useState(0);
  const [editQtdPendente, setEditQtdPendente] = useState(0);
  const [editQtdRecusada, setEditQtdRecusada] = useState(0);
  const [editQtdDevolvida, setEditQtdDevolvida] = useState(0);
  const [editStatus, setEditStatus] = useState("");

  // Occurrence Submission fields
  const [newOccTipo, setNewOccTipo] = useState("Cliente Ausente");
  const [newOccDesc, setNewOccDesc] = useState("");

  // Attachment Submission fields
  const [newAnexNome, setNewAnexNome] = useState("");
  const [newAnexTipo, setNewAnexTipo] = useState("Canhoto");
  const [uploadingFile, setUploadingFile] = useState(false);

  // Synchronize edition with selected delivery
  useEffect(() => {
    if (selectedDelivery) {
      setEditMotoristaId(selectedDelivery.motoristaId || "");
      setEditVeiculoId(selectedDelivery.veiculoId || "");
      setEditPlaca(selectedDelivery.placa || veiculos.find(v => v.id === selectedDelivery.veiculoId)?.placa || "");
      setEditUnidadeId(selectedDelivery.unidadeId || "");
      setEditCliente(selectedDelivery.cliente || "");
      setEditCidade(selectedDelivery.cidade || "");
      setEditEndereco(selectedDelivery.endereco || "");
      setEditData(selectedDelivery.data || "");
      setEditHorario(selectedDelivery.horario || "");
      setEditObservacoes(selectedDelivery.observacoes || "");
      setEditQtdVolumes(selectedDelivery.qtd_volumes ?? 1);
      setEditQtdEntregues(selectedDelivery.qtd_entregues ?? 0);
      setEditQtdPendente(selectedDelivery.qtd_pendente ?? 0);
      setEditQtdRecusada(selectedDelivery.qtd_recusada ?? 0);
      setEditQtdDevolvida(selectedDelivery.qtd_devolvida ?? 0);
      setEditStatus(selectedDelivery.status_entrega || "Aguardando Programação");
    }
  }, [selectedDelivery, veiculos]);

  // Handle dynamic NF rows count
  const handleQtdNfsChange = (valStr: string) => {
    let val = parseInt(valStr);
    if (isNaN(val) || val < 1) val = 1;

    setQtdNfs(val);
    setNfsFields(prev => {
      const copy = [...prev];
      if (copy.length < val) {
        while (copy.length < val) {
          copy.push({ numero_nf: "", valor_nf: "" });
        }
      } else if (copy.length > val) {
        copy.splice(val);
      }
      return copy;
    });
  };

  // Real-time Total Calculation
  const totalValue = nfsFields.reduce((sum, f) => {
    const valParsed = parseFloat(f.valor_nf) || 0;
    return sum + (valParsed > 0 ? valParsed : 0);
  }, 0);

  // Dynamic Dashboard Stats
  const dashboardStats = useMemo(() => {
    const total = offList.length;
    const emRota = offList.filter(x => (x.status_entrega || "").toLowerCase() === "em rota").length;
    
    const concluidas = offList.filter(x => {
      const s = (x.status_entrega || "").toLowerCase();
      return s === "entrega concluída" || s === "finalizada";
    }).length;

    const pendentes = offList.filter(x => {
      const s = (x.status_entrega || "").toLowerCase();
      return s === "aguardando programação" || s === "programada" || s === "aguardando carregamento" || s === "em carregamento" || s === "pendente";
    }).length;

    const reagendadas = offList.filter(x => (x.status_entrega || "").toLowerCase() === "reagendada").length;
    const recusadas = offList.filter(x => (x.status_entrega || "").toLowerCase() === "recusada").length;
    const devolvidas = offList.filter(x => {
      const s = (x.status_entrega || "").toLowerCase();
      return s === "devolução parcial" || s === "devolução total" || s === "retornando à base";
    }).length;

    const canceladas = offList.filter(x => (x.status_entrega || "").toLowerCase() === "cancelada").length;

    return { total, emRota, concluidas, pendentes, reagendadas, recusadas, devolvidas, canceladas };
  }, [offList]);

  // POST Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dt || !cliente || !endereco || !veiculoId || !motoristaId) {
      setNotification({
        type: "error",
        message: "Não foi possível cadastrar a entrega extra limit. Motivo: Preencha todos os campos obrigatórios."
      });
      return;
    }

    // Validate NFs
    let nfIncomplete = false;
    const cleanNfs = nfsFields.map(f => {
      const numStr = f.numero_nf.trim();
      const valStr = f.valor_nf.trim();
      const valParsed = parseFloat(valStr);
      
      if (!numStr || !valStr || isNaN(valParsed) || valParsed < 0) {
        nfIncomplete = true;
      }
      return {
        numero_nf: numStr,
        valor_nf: valParsed
      };
    });

    if (nfIncomplete) {
      setNotification({
        type: "error",
        message: "❌ Existem NF's sem preenchimento completo."
      });
      return;
    }

    const selectedVeh = veiculos.find(v => v.id === veiculoId);

    try {
      const res = await fetch("/api/entregas-off", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify({
          dt,
          cliente,
          cidade,
          endereco,
          observacoes,
          veiculoId,
          motoristaId,
          data,
          tipo_operacao: tipoOperacao,
          qtd_nfs: qtdNfs,
          valor_total: totalValue,
          status_entrega: statusEntrega,
          placa: selectedVeh?.placa || "",
          qtd_volumes: 1,
          qtd_entregues: 0,
          qtd_pendente: 1,
          qtd_recusada: 0,
          qtd_devolvida: 0,
          ocorrencias: [],
          log_alteracoes: [],
          anexos: [],
          nfs: cleanNfs
        }),
      });
      if (res.ok) {
        setNotification({
          type: "success",
          message: "✅ Registro salvo com sucesso."
        });
        // Clear forms
        setDt("");
        setCliente("");
        setCidade("");
        setEndereco("");
        setObservacoes("");
        setVeiculoId("");
        setMotoristaId("");
        setTipoOperacao("Entrega Extralimite");
        setStatusEntrega("Aguardando Programação");
        setQtdNfs(1);
        setNfsFields([{ numero_nf: "", valor_nf: "" }]);
        setIsAdding(false);
        onRefresh();
      } else {
        const error = await res.json();
        setNotification({
          type: "error",
          message: `❌ Não foi possível realizar o cadastro. Motivo: ${error.error || "Ação recusada pelo banco de dados."}`
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "❌ Não foi possível registrar a entrega. Motivo: Erro operacional ou de conexão."
      });
    }
  };

  // PUT Submission for Edit details
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery) return;

    try {
      const res = await fetch(`/api/entregas-off/${selectedDelivery.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({
          motoristaId: editMotoristaId,
          veiculoId: editVeiculoId,
          placa: editPlaca,
          unidadeId: editUnidadeId,
          cliente: editCliente,
          cidade: editCidade,
          endereco: editEndereco,
          data: editData,
          horario: editHorario,
          observacoes: editObservacoes,
          qtd_volumes: Number(editQtdVolumes),
          qtd_entregues: Number(editQtdEntregues),
          qtd_pendente: Number(editQtdPendente),
          qtd_recusada: Number(editQtdRecusada),
          qtd_devolvida: Number(editQtdDevolvida),
          status_entrega: editStatus
        })
      });

      if (res.ok) {
        const updatedObj = await res.json();
        setSelectedDelivery(updatedObj);
        setNotification({
          type: "success",
          message: "✅ Todas as alterações operacionais foram salvas!"
        });
        onRefresh();
      } else {
        const err = await res.json();
        setNotification({
          type: "error",
          message: `❌ Erro ao salvar: ${err.error || "Ação recusada."}`
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "❌ Falha operacional para atualizar informações."
      });
    }
  };

  // POST Occurrence
  const handleAddOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery || !newOccDesc.trim()) return;

    try {
      const res = await fetch(`/api/entregas-off/${selectedDelivery.id}/ocorrencias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({
          tipo: newOccTipo,
          descricao: newOccDesc
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedDelivery(data.updated || data.item);
        setNewOccDesc("");
        setNotification({
          type: "success",
          message: "⚠️ Nova ocorrência registrada no andamento operacional!"
        });
        onRefresh();
      } else {
        setNotification({
          type: "error",
          message: "❌ Falha ao tentar cadastrar ocorrência."
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // POST Attachments via mock upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDelivery) return;

    setUploadingFile(true);
    try {
      const response = await fetch("/api/upload-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filename: file.name,
          filetype: file.type,
          base64Data: "" 
        })
      });

      if (response.ok) {
        const docResult = await response.json();
        
        const attachRes = await fetch(`/api/entregas-off/${selectedDelivery.id}/anexos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": userEmail
          },
          body: JSON.stringify({
            nome: newAnexNome || file.name,
            tipo: newAnexTipo,
            url: docResult.url
          })
        });

        if (attachRes.ok) {
          const resBody = await attachRes.json();
          setSelectedDelivery(resBody.updated);
          setNewAnexNome("");
          setNotification({
            type: "success",
            message: "📎 Arquivo de anexo vinculado com sucesso!"
          });
          onRefresh();
        } else {
          setNotification({
            type: "error",
            message: "❌ Não foi possível vincular o arquivo."
          });
        }
      } else {
        setNotification({
          type: "error",
          message: "❌ Erro ao enviar arquivo para o servidor de documentos."
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingFile(false);
    }
  };

  // DELETE operation
  const handleDelete = async (itemId: string) => {
    setConfirmDialog({
      title: "Excluir Registro",
      message: "Confirma a remoção permanente desta Entrega Extra OFF e de todas as suas Notas Fiscais vinculadas?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/entregas-off/${itemId}`, {
            method: "DELETE",
            headers: {
              "x-user-email": userEmail
            }
          });
          if (res.ok) {
            setNotification({
              type: "success",
              message: "✅ Entrega OFF excluída com sucesso."
            });
            onRefresh();
          } else {
            setNotification({
              type: "error",
              message: "❌ Erro ao solicitar remoção do registro."
            });
          }
        } catch (err) {
          console.error(err);
          setNotification({
            type: "error",
            message: "❌ Falha operacional para deletar item."
          });
        }
      }
    });
  };

  // SEARCH filtering
  const filtered = offList.filter(
    (x) =>
      x.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      x.dt.includes(searchTerm) ||
      (x.endereco && x.endereco.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (x.cidade && x.cidade.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (x.nfs && x.nfs.some((nf: EntregaOffNF) => nf.numero_nf.includes(searchTerm))) ||
      (x.tipo_operacao && x.tipo_operacao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // EXCEL CSV download
  const exportToExcel = () => {
    let csvContent = "\ufeff"; 
    csvContent += "Data;Cliente;Cidade;DT;NF's;Valores Individuais;Valor Total;Veículo;Placa;Motorista;Tipo Operação;Status;Volumes;Entregues;Pendentes\n";

    filtered.forEach(item => {
      const driver = motoristas.find(m => m.id === item.motoristaId)?.nome || "Não definido";
      const vehicle = veiculos.find(v => v.id === item.veiculoId);
      const plaque = item.placa || vehicle?.placa || "N/D";
      const formatClient = item.cliente.replace(/;/g, " ");
      const totalValStr = `R$ ${Number(item.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      const opType = item.tipo_operacao || "Entrega OFF";
      const status = item.status_entrega || "Pendente";
      
      const vols = item.qtd_volumes ?? 1;
      const ents = item.qtd_entregues ?? 0;
      const pends = item.qtd_pendente ?? 1;

      if (item.nfs && item.nfs.length > 0) {
        item.nfs.forEach((nf, idx) => {
          const nfNum = nf.numero_nf;
          const nfValStr = `R$ ${Number(nf.valor_nf).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          const currentTotalStr = idx === 0 ? totalValStr : "";
          csvContent += `${item.data};${formatClient};${item.cidade || "N/D"};${item.dt};${nfNum};${nfValStr};${currentTotalStr};${vehicle?.modelo || "N/A"};${plaque};${driver};${opType};${status};${vols};${ents};${pends}\n`;
        });
      } else {
        csvContent += `${item.data};${formatClient};${item.cidade || "N/D"};${item.dt};-;-;${totalValStr};${vehicle?.modelo || "N/A"};${plaque};${driver};${opType};${status};${vols};${ents};${pends}\n`;
      }
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_entregas_off_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Generation template
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setNotification({
        type: "error",
        message: "❌ Não foi possível abrir a visualização de impressão."
      });
      return;
    }

    let rowsHtml = "";
    filtered.forEach(item => {
      const driver = motoristas.find(m => m.id === item.motoristaId)?.nome || "Não definido";
      const vehicle = veiculos.find(v => v.id === item.veiculoId);
      const plaque = item.placa || vehicle?.placa || "N/D";
      const opType = item.tipo_operacao || "Entrega OFF";
      const status = item.status_entrega || "Pendente";
      const totalValStr = `R$ ${Number(item.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      let nfsDetail = "";
      if (item.nfs && item.nfs.length > 0) {
        nfsDetail = item.nfs.map(nf => `NF ${nf.numero_nf}: R$ ${Number(nf.valor_nf).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join("<br/>");
      } else {
        nfsDetail = "-";
      }

      rowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 10px; font-family: monospace;">${item.data}</td>
          <td style="padding: 10px;"><strong>${item.cliente}</strong><br/><small style="color:#64748b; font-size:10px;">${item.cidade || ""}, ${item.endereco}</small></td>
          <td style="padding: 10px; font-family: monospace; font-weight: bold;">${item.dt}</td>
          <td style="padding: 10px; line-height: 1.5;">${nfsDetail}</td>
          <td style="padding: 10px; font-family: monospace; text-align: right; font-weight: bold; color: #0284c7;">${totalValStr}</td>
          <td style="padding: 10px; font-family: monospace;">${plaque}</td>
          <td style="padding: 10px;">${driver}</td>
          <td style="padding: 10px;"><span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background-color: #f1f5f9; border: 1px solid #cbd5e1; color:#334155; display:inline-block;">${opType}</span></td>
          <td style="padding: 10px; text-align: center;"><span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: bold; background-color: #dcfce7; color: #15803d;">${status.toUpperCase()}</span></td>
        </tr>
      `;
    });

    const totalSumAll = filtered.reduce((acc, current) => acc + (current.valor_total || 0), 0);
    const totalSumFormatted = `R$ ${totalSumAll.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Operacional de Entregas OFF-Route</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; margin: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          th { background-color: #0f172a; color: white; text-align: left; padding: 12px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #64748b; font-family: monospace; border-t: 1px dashed #cbd5e1; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin: 0; font-size: 24px; color: #0284c7; text-transform: uppercase; letter-spacing: 2px;">AMPLALOG</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155; font-weight: bold;">Gestão de Monitoramento de Transporte</p>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b; font-family: monospace; line-height: 1.4;">
            <p style="margin: 0;"><strong>RELATÓRIO:</strong> ENTREGAS EXTRA OFF-ROUTE</p>
            <p style="margin: 2px 0 0 0;"><strong>EMISSÃO:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente / Endereço</th>
              <th>DT / OFF</th>
              <th>Notas Fiscais (NF's)</th>
              <th style="text-align: right;">vlr total</th>
              <th>Placa</th>
              <th>Motorista</th>
              <th>Operação</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Upper Header Nav */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-sky-400" />
            Módulo de Entregas OFF-Route Extra
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Módulo operacional completo: acompanhamento, edição, controle de anexos, registro de ocorrências e histórico de auditoria.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={exportToExcel}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700/80 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700/80 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            PDF
          </button>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-lg shadow-sky-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Lançar Nova OFF
            </button>
          )}
        </div>
      </div>

      {/* Painel de Acompanhamento (Indicators Dashboard) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-750 transition">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold">Total OFF</span>
            <ClipboardList className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-xl font-black text-white font-mono leading-none">{dashboardStats.total}</span>
          <span className="text-[9px] text-slate-500 mt-1.5 block">Entregas cadastradas</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-750 transition">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold">Em Rota</span>
            <Truck className="w-4 h-4 text-sky-500" />
          </div>
          <span className="text-xl font-black text-sky-400 font-mono leading-none">{dashboardStats.emRota}</span>
          <span className="text-[9px] text-slate-500 mt-1.5 block">Em trânsito ativo</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-750 transition">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold">Concluídas</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-xl font-black text-emerald-400 font-mono leading-none">{dashboardStats.concluidas}</span>
          <span className="text-[9px] text-slate-500 mt-1.5 block">Sucesso ou Finalizada</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-750 transition">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold">Pendentes</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-xl font-black text-slate-300 font-mono leading-none">{dashboardStats.pendentes}</span>
          <span className="text-[9px] text-slate-500 mt-1.5 block">Aguardando programação</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-750 transition">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold">Reagendada</span>
            <Calendar className="w-4 h-4 text-teal-500" />
          </div>
          <span className="text-xl font-black text-teal-400 font-mono leading-none">{dashboardStats.reagendadas}</span>
          <span className="text-[9px] text-slate-500 mt-1.5 block">Novas datas agendadas</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-750 transition">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold">Recusadas</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-xl font-black text-rose-400 font-mono leading-none">{dashboardStats.recusadas}</span>
          <span className="text-[9px] text-slate-500 mt-1.5 block">Recusas em descarga</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-750 transition">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold">Devolvidas</span>
            <History className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-xl font-black text-purple-400 font-mono leading-none">{dashboardStats.devolvidas}</span>
          <span className="text-[9px] text-slate-500 mt-1.5 block">Parciais ou total</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-750 transition">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold">Canceladas</span>
            <X className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-xl font-black text-slate-500 font-mono leading-none">{dashboardStats.canceladas}</span>
          <span className="text-[9px] text-slate-500 mt-1.5 block">Canceladas da carga</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registration Dynamic Form */}
        {isAdding && (
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 h-fit space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-sky-400" />
                Registrar Entrega Externa
              </h3>
              <button 
                onClick={() => setIsAdding(false)} 
                className="text-[11px] text-slate-400 hover:text-rose-400 font-mono transition cursor-pointer"
              >
                Fechar [x]
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[10px]">Nº Documento DT / OFF</label>
                  <input
                    type="text"
                    required
                    value={dt}
                    onChange={(e) => setDt(e.target.value)}
                    placeholder="Ex: 30040"
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-700 uppercase focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[10px]">Data da Entrega</label>
                  <input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[10px]">Tipo de Operação</label>
                  <select
                    value={tipoOperacao}
                    onChange={(e) => setTipoOperacao(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Entrega Extralimite">Entrega Extralimite</option>
                    <option value="Frete OFF-Route">Frete OFF-Route</option>
                    <option value="Recarga Extra-Contrato">Recarga Extra-Contrato</option>
                    <option value="Reentrega OFF-Route">Reentrega OFF-Route (Exceção DT)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[10px]">Status Inicial</label>
                  <select
                    value={statusEntrega}
                    onChange={(e) => setStatusEntrega(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-500"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[10px]">Cidade Destino</label>
                  <input
                    type="text"
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: Goiânia"
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[10px]">Nome do Cliente</label>
                  <input
                    type="text"
                    required
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Ex: Atacadão S/A"
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono text-[10px]">Endereço Completo</label>
                <textarea
                  rows={2}
                  required
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, número, bairro..."
                  className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-700 focus:border-sky-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[10px]">Veículo</label>
                  <select
                    required
                    value={veiculoId}
                    onChange={(e) => setVeiculoId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Selecione...</option>
                    {veiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.placa} ({v.modelo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[10px]">Motorista</label>
                  <select
                    required
                    value={motoristaId}
                    onChange={(e) => setMotoristaId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Selecione...</option>
                    {motoristas.filter(m => m.statusFinal === "LIBERADO").map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono text-[10px]">Observações de Lançamento</label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ocorrências, detalhes de agenda, etc..."
                  className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-700 focus:border-sky-500"
                />
              </div>

              {/* Quantidade de NFs Selector Field */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-850">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[10px]">CONTAGEM DE NF's</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={qtdNfs}
                    onChange={(e) => handleQtdNfsChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[10px]">&nbsp;</label>
                  <div className="text-sky-400 font-mono text-xs font-bold pt-2.5">
                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Dynamic Note Fiscais container */}
              <div className="space-y-2 max-h-48 overflow-y-auto p-2.5 bg-slate-950/40 rounded-lg border border-slate-850">
                {nfsFields.map((field, idx) => (
                  <div key={idx} className="space-y-1 border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                    <span className="text-[9px] text-sky-500 font-mono font-bold uppercase">Nota {idx + 1}</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        required
                        value={field.numero_nf}
                        onChange={(e) => {
                          const updated = [...nfsFields];
                          updated[idx].numero_nf = e.target.value;
                          setNfsFields(updated);
                        }}
                        placeholder="Nº Nota"
                        className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[10px]"
                      />
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={field.valor_nf}
                        onChange={(e) => {
                          const updated = [...nfsFields];
                          updated[idx].valor_nf = e.target.value;
                          setNfsFields(updated);
                        }}
                        placeholder="Valor R$"
                        className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[10px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded shadow-lg cursor-pointer transition text-xs mt-1"
              >
                Gravar Registro Extra OFF
              </button>
            </form>
          </div>
        )}

        {/* Database Search & Item Presentation Panels */}
        <div className={`${isAdding ? "lg:col-span-2" : "col-span-full"} space-y-4`}>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Busque por documento (DT), cliente, endereço, cidade ou nota fiscal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-700"
              />
            </div>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")} 
                className="text-xs text-slate-400 hover:text-white font-mono cursor-pointer shrink-0"
              >
                Limpar Filtro
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => {
              const driver = motoristas.find((m) => m.id === item.motoristaId);
              const vehicle = veiculos.find((v) => v.id === item.veiculoId);
              const plaque = item.placa || vehicle?.placa || "N/D";
              const totalSum = Number(item.valor_total || 0);

              const stColor = STATUS_COLORS[item.status_entrega || "Pendente"] || STATUS_COLORS["Pendente"];

              return (
                <div 
                  key={item.id} 
                  className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-xl transition duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded font-mono font-bold text-sky-400">
                          DT OFF #{item.dt}
                        </span>
                        <h4 className="text-white text-sm font-extrabold tracking-tight pt-1">
                          {item.cliente} 
                          {item.cidade && <span className="text-xs text-slate-500 font-normal"> ({item.cidade})</span>}
                        </h4>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-600" /> {item.data} {item.horario && `@ ${item.horario}`}
                        </span>
                        
                        <div className="flex gap-1 items-center">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded font-mono border ${stColor.bg} ${stColor.text} ${stColor.border}`}>
                            {stColor.label.toUpperCase()}
                          </span>

                          {/* Quick Edit Action Icon */}
                          <button
                            onClick={() => {
                              setSelectedDelivery(item);
                              setActiveDetailsTab("editar");
                            }}
                            className="p-1 px-1.5 bg-slate-850 hover:bg-sky-800 border border-slate-800/80 text-sky-400 hover:text-white rounded transition cursor-pointer"
                            title="Editar Entrega"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 px-1.5 bg-rose-950/20 hover:bg-rose-900 border border-rose-900/20 text-rose-400 hover:text-white rounded transition cursor-pointer"
                            title="Remover Registro"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 font-sans flex items-start gap-1 p-1 px-2 rounded bg-slate-950/30 border border-slate-850/40">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span>{item.endereco}</span>
                    </p>

                    {/* Operational performance parameters if filled */}
                    {(item.qtd_volumes !== undefined || item.qtd_entregues !== undefined) && (
                      <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono text-slate-400/80 p-1.5 bg-slate-950/20 border border-slate-850/30 rounded">
                        <div>
                          <span>Volumes: </span>
                          <span className="text-slate-200 font-bold">{item.qtd_volumes || 0}</span>
                        </div>
                        <div>
                          <span>Entregue: </span>
                          <span className="text-emerald-400 font-bold">{item.qtd_entregues || 0}</span>
                        </div>
                        <div>
                          <span>Devold/Recus: </span>
                          <span className="text-rose-400 font-bold">{(item.qtd_devolvida || 0) + (item.qtd_recusada || 0)}</span>
                        </div>
                      </div>
                    )}

                    {/* Invoices detail nested panel */}
                    <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850/90 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-b border-slate-850/80 pb-1.5">
                        <span className="font-semibold text-slate-400 tracking-wider">
                          NOTAS FISCAIS ({item.nfs?.length || item.qtd_nfs || 0})
                        </span>
                        <span className="text-sky-400 font-bold">
                          R$ {totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1 font-mono pr-1 custom-scrollbar">
                        {item.nfs && item.nfs.map((nf, idx) => (
                          <div 
                            key={nf.id || idx} 
                            className="flex justify-between text-[11px] text-slate-300 py-0.5 border-b border-slate-900/40 last:border-0 last:py-0"
                          >
                            <span className="text-slate-400 text-xs">NF {nf.numero_nf}</span>
                            <span className="text-slate-200 font-semibold font-mono text-[10px]">
                              R$ {Number(nf.valor_nf).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                        {(!item.nfs || item.nfs.length === 0) && (
                          <div className="text-[10px] text-slate-500 font-mono italic">
                            Nenhuma NF informada.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/85 grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 mt-auto bg-slate-950/10 p-2 rounded-lg">
                    <div>
                      <span className="text-slate-600 block uppercase text-[8px] tracking-wider mb-0.5">Operação:</span>
                      <span className="text-slate-300 font-bold block truncate">{item.tipo_operacao || "Entrega OFF"}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block uppercase text-[8px] tracking-wider mb-0.5">Veículo:</span>
                      <span className="text-sky-400 font-bold block truncate">{plaque}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block uppercase text-[8px] tracking-wider mb-0.5">Motorista:</span>
                      <span className="text-slate-300 font-bold block truncate">{driver ? driver.nome.split(" ")[0] + " " + (driver.nome.split(" ")[1] || "") : "Sem Driver"}</span>
                    </div>
                  </div>

                  {/* Indicators for attachments & occurrences */}
                  {(item.ocorrencias && item.ocorrencias.length > 0 || item.anexos && item.anexos.length > 0) && (
                    <div className="flex gap-2.5 pt-1.5 border-t border-slate-900/50 justify-end text-[9px] font-mono text-slate-500">
                      {item.ocorrencias && item.ocorrencias.length > 0 && (
                        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> {item.ocorrencias.length} Ocorrências</span>
                      )}
                      {item.anexos && item.anexos.length > 0 && (
                        <span className="flex items-center gap-1"><Paperclip className="w-3 h-3 text-sky-400" /> {item.anexos.length} Anexos</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500 font-mono text-xs bg-slate-950 border border-slate-850 rounded-xl flex flex-col items-center justify-center gap-3">
                <ShieldAlert className="w-8 h-8 text-slate-700" />
                <p>Nenhum registro extra 'OFF-Route' foi localizado para os termos inseridos ou na sua unidade.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OPERATIONS & DETAILS PANEL MODAL (Equivalent to Vistoria & DT view) */}
      <AnimatePresence>
        {selectedDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3">
            <motion.div 
              id="details-operation-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-5 h-5 text-sky-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Operações e Gestão OFF-Route # {selectedDelivery.dt}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Cliente: {selectedDelivery.cliente} | Cadastro ID: <span className="text-slate-400 font-semibold">{selectedDelivery.id}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDelivery(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 p-1.5 rounded-full transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav Tabs */}
              <div className="bg-slate-950/30 px-4 py-2 border-b border-slate-800 flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveDetailsTab("editar")}
                  className={`px-3 py-1.5 rounded transition text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeDetailsTab === "editar" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700/80"
                  }`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar Informações
                </button>
                <button
                  onClick={() => setActiveDetailsTab("ocorrencias")}
                  className={`px-3 py-1.5 rounded transition text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeDetailsTab === "ocorrencias" ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700/80"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Ocorrências ({selectedDelivery.ocorrencias?.length || 0})
                </button>
                <button
                  onClick={() => setActiveDetailsTab("anexos")}
                  className={`px-3 py-1.5 rounded transition text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer shrink-0 relative ${
                    activeDetailsTab === "anexos" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700/80"
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Anexos e Documentos ({selectedDelivery.anexos?.length || 0})
                </button>
                <button
                  onClick={() => setActiveDetailsTab("historico")}
                  className={`px-3 py-1.5 rounded transition text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeDetailsTab === "historico" ? "bg-indigo-650 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700/80"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Histórico ({selectedDelivery.log_alteracoes?.length || 0})
                </button>
              </div>

              {/* Tab Contents Frame */}
              <div className="flex-1 overflow-y-auto p-5 font-sans text-xs">
                
                {/* TAB 1: EDIT DETAILS FORM */}
                {activeDetailsTab === "editar" && (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Left Block: Client & Location details */}
                      <div className="bg-slate-950/20 p-4 rounded-lg border border-slate-850 space-y-3 md:col-span-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold block pb-1 border-b border-slate-900">Destinatário & Rota</span>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-slate-400 font-mono text-[9px] block">Nome do Cliente</label>
                            <input
                              type="text"
                              value={editCliente}
                              onChange={(e) => setEditCliente(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-slate-400 font-mono text-[9px] block">Cidade</label>
                            <input
                              type="text"
                              value={editCidade}
                              onChange={(e) => setEditCidade(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 font-mono text-[9px] block">Endereço de Descarga</label>
                          <textarea
                            rows={2}
                            value={editEndereco}
                            onChange={(e) => setEditEndereco(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1 col-span-2">
                            <label className="text-slate-400 font-mono text-[9px] block">Unidade Responsável</label>
                            <select
                              value={editUnidadeId}
                              onChange={(e) => setEditUnidadeId(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 px-2 py-1.5 rounded text-white"
                            >
                              <option value="">Nenhuma Unidade</option>
                              {unidades.map(u => (
                                <option key={u.id} value={u.id}>{u.nome}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-slate-400 font-mono text-[9px] block">Horário da Entrega</label>
                            <input
                              type="text"
                              placeholder="Ex: 14:35"
                              value={editHorario}
                              onChange={(e) => setEditHorario(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 font-mono text-[9px] block">Observações do Atendimento</label>
                          <input
                            type="text"
                            value={editObservacoes}
                            onChange={(e) => setEditObservacoes(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white"
                          />
                        </div>
                      </div>

                      {/* Right Block: Active vehicle state & driver */}
                      <div className="bg-slate-950/20 p-4 rounded-lg border border-slate-850 space-y-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold block pb-1 border-b border-slate-900">Transportes</span>

                        <div className="space-y-1">
                          <label className="text-slate-400 font-mono text-[9px] block">Data da Saída</label>
                          <input
                            type="date"
                            value={editData}
                            onChange={(e) => setEditData(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 px-2 py-1.5 rounded text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 font-mono text-[9px] block">Motorista Associado</label>
                          <select
                            value={editMotoristaId}
                            onChange={(e) => setEditMotoristaId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 px-2 py-1.5 rounded text-white"
                          >
                            <option value="">Selecione...</option>
                            {motoristas.map(m => (
                              <option key={m.id} value={m.id}>{m.nome} ({m.statusFinal})</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 font-mono text-[9px] block">Veículo cadastrado</label>
                          <select
                            value={editVeiculoId}
                            onChange={(e) => {
                              const selectedVal = e.target.value;
                              setEditVeiculoId(selectedVal);
                              const plate = veiculos.find(v => v.id === selectedVal)?.placa || "";
                              setEditPlaca(plate);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 px-2 py-1.5 rounded text-white"
                          >
                            <option value="">Selecione...</option>
                            {veiculos.map(v => (
                              <option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 font-mono text-[9px] block">Placa do Veículo (Editável)</label>
                          <input
                            type="text"
                            value={editPlaca}
                            onChange={(e) => setEditPlaca(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white font-mono uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Operational Counts and Global state */}
                    <div className="bg-slate-950/20 p-4 rounded-lg border border-slate-850 space-y-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold block pb-1 border-b border-slate-900">Quantitativos de Volumes e Status do Fluxo</span>
                      
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="space-y-1">
                          <label className="text-slate-400 text-[9px] block font-mono">Qtd Volumes</label>
                          <input
                            type="number"
                            min="0"
                            value={editQtdVolumes}
                            onChange={(e) => setEditQtdVolumes(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-center font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-emerald-400 text-[9px] block font-mono">Volumes Entregues</label>
                          <input
                            type="number"
                            min="0"
                            value={editQtdEntregues}
                            onChange={(e) => setEditQtdEntregues(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-center font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-amber-400 text-[9px] block font-mono">Volumes Pendente</label>
                          <input
                            type="number"
                            min="0"
                            value={editQtdPendente}
                            onChange={(e) => setEditQtdPendente(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-center font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-rose-400 text-[9px] block font-mono">Volumes Recusados</label>
                          <input
                            type="number"
                            min="0"
                            value={editQtdRecusada}
                            onChange={(e) => setEditQtdRecusada(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-center font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-pink-400 text-[9px] block font-mono">Volumes Devolvidos</label>
                          <input
                            type="number"
                            min="0"
                            value={editQtdDevolvida}
                            onChange={(e) => setEditQtdDevolvida(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white text-center font-mono"
                          />
                        </div>
                        <div className="space-y-1 col-span-2 md:col-span-1">
                          <label className="text-sky-400 text-[9px] block font-mono">Status Operacional</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-850 p-1.5 rounded text-white font-mono text-[10px]"
                          >
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded shadow flex items-center justify-center gap-2 cursor-pointer transition text-xs mt-2"
                    >
                      <Save className="w-4 h-4" />
                      Salvar Alterações Operacionais e Logar no Histórico
                    </button>
                  </form>
                )}

                {/* TAB 2: OCCURRENCES */}
                {activeDetailsTab === "ocorrencias" && (
                  <div className="space-y-5">
                    {/* Add new Occurrence Fieldset */}
                    <div className="bg-slate-950/30 p-4 rounded-lg border border-slate-850 space-y-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold block pb-1 border-b border-slate-900">Registrar Nova Ocorrência do Percurso</span>
                      <form onSubmit={handleAddOccurrence} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="space-y-1">
                          <label className="text-slate-400 text-[10px]">Tipo de Ocorrência</label>
                          <select
                            value={newOccTipo}
                            onChange={(e) => setNewOccTipo(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 px-2 py-1.5 rounded text-white"
                          >
                            {OCCURRENCE_TYPES.map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-slate-400 text-[10px]">Descrição da Ocorrência</label>
                          <input
                            type="text"
                            required
                            placeholder="Descreva detalhes como trânsito intenso, sinistro, recusa parcial, etc."
                            value={newOccDesc}
                            onChange={(e) => setNewOccDesc(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 px-3 py-1.5 rounded text-white"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-4 rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Lançar Ocorrência
                        </button>
                      </form>
                    </div>

                    {/* Timeline of occurrences */}
                    <div className="space-y-3.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block pb-1 border-b border-slate-900/50">Linha de Tempo de Ocorrências</span>
                      
                      {selectedDelivery.ocorrencias && selectedDelivery.ocorrencias.length > 0 ? (
                        <div className="relative pl-6 border-l-2 border-slate-800 space-y-4">
                          {selectedDelivery.ocorrencias.map((o: OccurrenceEntry, idx: number) => (
                            <div key={o.id || idx} className="relative">
                              {/* Dot pointer indicator */}
                              <span className="absolute -left-9 top-1 w-3.5 h-3.5 bg-amber-500 border-2 border-slate-900 rounded-full"></span>
                              <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-850/60 font-sans space-y-1">
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                                  <span className="bg-amber-950/30 text-amber-500 font-bold border border-amber-900/20 px-2 py-0.5 rounded">
                                    {o.tipo.toUpperCase()}
                                  </span>
                                  <span>{o.data} - {o.hora} | Registrado por: <strong className="text-slate-400">{o.usuario}</strong></span>
                                </div>
                                <p className="text-xs text-slate-200 font-normal pt-1">{o.descricao}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500 font-mono italic">
                          Nenhuma ocorrência foi registrada para esta entrega até o momento.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: ANEXOS ENVIADOS */}
                {activeDetailsTab === "anexos" && (
                  <div className="space-y-5">
                    {/* File uploading simulation panel */}
                    <div className="bg-slate-950/30 p-4 rounded-lg border border-slate-850 space-y-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold block pb-1 border-b border-slate-900">Anexar Comprovantes, Fotos, Canhoto e Notas</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="space-y-1">
                          <label className="text-slate-400 text-[10px]">Nome Descritivo do Arquivo</label>
                          <input
                            type="text"
                            placeholder="Ex: Canhoto Assinado NF 1022"
                            value={newAnexNome}
                            onChange={(e) => setNewAnexNome(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 px-3 py-1.5 rounded text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 text-[10px]">Tipo de Documento</label>
                          <select
                            value={newAnexTipo}
                            onChange={(e) => setNewAnexTipo(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 px-2 py-1.5 rounded text-white"
                          >
                            <option value="Foto">Foto</option>
                            <option value="Comprovante de Entrega">Comprovante de Entrega</option>
                            <option value="Canhoto">Canhoto Escaneado</option>
                            <option value="Nota Fiscal">Nota Fiscal / XML</option>
                            <option value="Documento">Documento de Viagem</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>

                        <div className="relative">
                          <label className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded transition flex items-center justify-center gap-1.5 cursor-pointer text-xs">
                            <Upload className="w-4 h-4" />
                            {uploadingFile ? "Enviando Documento..." : "Selecionar e Carregar"}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              disabled={uploadingFile}
                              className="hidden"
                              onChange={handleFileChange}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Timeline/List of Attachments */}
                    <div className="space-y-3.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block pb-1 border-b border-slate-900/50">Documentos e Comprovantes Vinculados</span>
                      
                      {selectedDelivery.anexos && selectedDelivery.anexos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedDelivery.anexos.map((anx: any, idx: number) => (
                            <div key={anx.id || idx} className="bg-slate-950/40 p-3 rounded-lg border border-slate-850/70 flex items-center justify-between gap-3 font-sans">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 bg-slate-900 border border-slate-800 rounded">
                                  <Paperclip className="w-4 h-4 text-sky-400 shrink-0" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[11px] text-white block font-bold truncate">{anx.nome}</span>
                                  <span className="text-[9px] text-slate-500 font-mono block">Tipo: <strong className="text-slate-400">{anx.tipo}</strong> | Data: {anx.data}</span>
                                </div>
                              </div>
                              <a
                                href={anx.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-slate-900 hover:bg-sky-950 hover:text-sky-400 border border-slate-800 text-[10px] text-slate-300 rounded font-mono transition cursor-pointer"
                              >
                                Abrir
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500 font-mono italic">
                          Nenhum documento ou canhoto foi anexado a este registro extra ainda.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: HISTORICAL AUDITING TRAIL */}
                {activeDetailsTab === "historico" && (
                  <div className="space-y-3.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block pb-1 border-b border-slate-900">Histórico Completo de Alterações e Trâmite</span>
                    
                    {selectedDelivery.log_alteracoes && selectedDelivery.log_alteracoes.length > 0 ? (
                      <div className="border border-slate-850 rounded-lg overflow-hidden divide-y divide-slate-850 font-sans">
                        {selectedDelivery.log_alteracoes.map((log: ChangeLogEntry, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-950/20 hover:bg-slate-950/40 transition flex flex-col md:flex-row justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <span className="font-semibold text-white">{log.usuario}</span>
                                <span className="text-[10px] text-slate-500 font-mono">alterou</span>
                                <span className="text-sky-400 font-bold font-mono text-[10.5px]">{log.campo}</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <span className="text-slate-600 font-mono italic">De:</span>
                                <span className="text-slate-300 font-mono leading-none py-0.5 px-1 bg-slate-950 rounded truncate max-w-xs">{log.antes || "-"}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                                <span className="text-slate-600 font-mono italic">Para:</span>
                                <span className="text-emerald-400 font-mono font-bold leading-none py-0.5 px-1 bg-slate-950 rounded truncate max-w-xs">{log.depois || "-"}</span>
                              </div>
                            </div>
                            
                            <div className="text-right shrink-0 my-auto text-[10px] text-slate-500 font-mono flex items-center justify-end gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-600" />
                              <span>{log.data} às {log.hora}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-500 font-mono italic bg-slate-950/10 border border-dashed border-slate-800 rounded-xl">
                        Nenhum histórico operacional foi gerado para este registro ainda.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-2.5">
                <button
                  onClick={() => setSelectedDelivery(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded text-xs font-bold font-sans cursor-pointer transition"
                >
                  Fechar Painel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
