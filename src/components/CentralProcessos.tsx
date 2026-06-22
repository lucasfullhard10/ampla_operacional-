import React, { useState, useEffect, useRef } from "react";
import { 
  ClipboardList, Plus, Search, Calendar, FolderCheck, Tag, Info, ShieldAlert,
  SlidersHorizontal, CheckCircle2, AlertTriangle, Clock, PlayCircle, Eye,
  Trash2, X, PlusCircle, Paperclip, Send, Bell, Check, Edit2, Archive,
  LayoutGrid, BarChart2, Building, User, Users, FileText, Share2, HelpCircle,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Processo, ProcessoCategoria, ProcessoColuna, ProcessoComentario, 
  ProcessoHistorico, ProcessoNotificacao, Usuario, Unidade 
} from "../types";
import { ConfirmModal, ConfirmType } from "./NotificationModal";

interface CentralProcessosProps {
  currentUser: Usuario;
  unidades: Unidade[];
}

export default function CentralProcessos({ currentUser, unidades }: CentralProcessosProps) {
  // System states
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [colunas, setColunas] = useState<ProcessoColuna[]>([]);
  const [categorias, setCategorias] = useState<ProcessoCategoria[]>([]);
  const [notificacoes, setNotificacoes] = useState<ProcessoNotificacao[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [participantesDisponiveis, setParticipantesDisponiveis] = useState<Usuario[]>([]);
  const [unidadesList, setUnidadesList] = useState<Unidade[]>(unidades || []);
  
  // UI filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [filterAssignedToMe, setFilterAssignedToMe] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  
  // Modals & detail view states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null);
  const [historico, setHistorico] = useState<ProcessoHistorico[]>([]);
  const [comentarios, setComentarios] = useState<ProcessoComentario[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);
  const [mentionPrompt, setMentionPrompt] = useState<{
    user: Usuario;
    commentText: string;
    mencoes: string[];
    remainingNonAccess: Usuario[];
  } | null>(null);
  
  // Category management (Master)
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  
  // Column management (Master)
  const [showNewColInput, setShowNewColInput] = useState(false);
  const [newColId, setNewColId] = useState("");
  const [newColName, setNewColName] = useState("");
  
  // New Process Form state
  const [newProcesso, setNewProcesso] = useState({
    titulo: "",
    categoria: "RH",
    descricao: "",
    unidadeId: currentUser.unidadeId === "Todas" ? "un-go" : currentUser.unidadeId,
    prioridade: "Média" as "Baixa" | "Média" | "Alta" | "Crítica",
    dataInicio: new Date().toISOString().split("T")[0],
    dataLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    responsavel: currentUser.email,
    participantes: [] as string[],
    status: "novo",
    tagsText: "",
    observacoes: "",
    unidadesCompartilhadas: [] as string[],
    compartilharGeral: false
  });

  // HTML5 Drag and Drop visual state
  const [draggedOverColId, setDraggedOverColId] = useState<string | null>(null);

  // File attach local simulation state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Custom API fetch wrapper that injects necessary headers (e.g. x-user-email)
  const apiFetch = (url: string, options: any = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        "x-user-email": currentUser?.email || "",
      }
    });
  };

  // Load backend data helper
  const fetchData = async () => {
    try {
      // 1. Fetch Processos
      const resP = await apiFetch("/api/processos");
      if (resP.ok) {
        const data = await resP.json();
        setProcessos(data);
      }
      
      // 2. Fetch Columns
      const resCol = await apiFetch("/api/processo-colunas");
      if (resCol.ok) {
        const data = await resCol.json();
        const sorted = data.sort((a: ProcessoColuna, b: ProcessoColuna) => a.ordem - b.ordem);
        setColunas(sorted);
      }

      // 3. Fetch Categories
      const resCat = await apiFetch("/api/processo-categorias");
      if (resCat.ok) {
        setCategorias(await resCat.json());
      }

      // 4. Fetch System Users for mentions and assignees
      const resUsr = await apiFetch("/api/usuarios");
      if (resUsr.ok) {
        setUsuarios(await resUsr.json());
      }

      // 4b. Fetch Available Participants (all active system users)
      const resParts = await apiFetch("/api/processos-participantes-disponiveis");
      if (resParts.ok) {
        setParticipantesDisponiveis(await resParts.json());
      }

      // 5. Fetch Units
      const resUni = await apiFetch("/api/unidades");
      if (resUni.ok) {
        setUnidadesList(await resUni.json());
      }

      // 6. Fetch Notifications
      const resNot = await apiFetch("/api/processo-notificacoes");
      if (resNot.ok) {
        setNotificacoes(await resNot.json());
      }
    } catch (err) {
      console.error("Error fetching process data:", err);
    }
  };

  // Poll for changes real-time every 8 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Fetch comments and history when selected process is loaded
  useEffect(() => {
    if (selectedProcesso) {
      fetchCommentsAndHistory(selectedProcesso.id);
      
      // Update local process object from current master list for real-time update in dialog
      const freshObj = processos.find(p => p.id === selectedProcesso.id);
      if (freshObj) {
        setSelectedProcesso(freshObj);
      }
    }
  }, [selectedProcesso, processos]);

  const fetchCommentsAndHistory = async (id: string) => {
    try {
      const resCom = await apiFetch(`/api/processos/${id}/comentarios`);
      if (resCom.ok) {
        setComentarios(await resCom.json());
      }
      const resHist = await apiFetch(`/api/processos/${id}/historico`);
      if (resHist.ok) {
        setHistorico(await resHist.json());
      }
    } catch (err) {
      console.error("Error loading process comments/history:", err);
    }
  };

  // Handle Drag Card Start
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle Drag Card End / Drop
  const handleDropCard = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDraggedOverColId(null);
    const cardId = e.dataTransfer.getData("text/plain");

    const element = processos.find(p => p.id === cardId);
    if (!element) return;

    if (element.status === colId) return; // same column

    // Optimistic status update in state
    setProcessos(prev => prev.map(p => p.id === cardId ? { ...p, status: colId } : p));

    try {
      const res = await apiFetch(`/api/processos/${cardId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: colId })
      });

      if (!res.ok) {
        // Rollback state
        fetchData();
      } else {
        fetchData(); // pull fresh updates and history logs
      }
    } catch (err) {
      console.error("Error dragging process status:", err);
      fetchData();
    }
  };

  // Submit comment after all permissions/mentions checks have passed or confirmed
  const submitCommentDirectly = async (text: string, mentionsArray: string[]) => {
    if (!selectedProcesso) return;
    try {
      const res = await apiFetch(`/api/processos/${selectedProcesso.id}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: text, mencoes: mentionsArray })
      });

      if (res.ok) {
        setNewCommentText("");
        fetchCommentsAndHistory(selectedProcesso.id);
      } else {
        const errJson = await res.json();
        alert(errJson.error || "Erro ao enviar comentário.");
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
    }
  };

  const confirmAddMentionedParticipant = async (userToAdd: Usuario) => {
    if (!selectedProcesso || !mentionPrompt) return;

    const emailNorm = userToAdd.email.toLowerCase();
    const updatedParticipants = Array.from(new Set([
      ...(selectedProcesso.participantes || []),
      userToAdd.email
    ]));

    const updatedRoles = {
      ...((selectedProcesso as any).participanteRoles || {}),
      [emailNorm]: "editor" // Set as editor by default upon addition
    };

    try {
      const res = await apiFetch(`/api/processos/${selectedProcesso.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantes: updatedParticipants,
          participanteRoles: updatedRoles
        })
      });

      if (res.ok) {
        const updatedProc = await res.json();
        // Update both the list and chosen card state
        setProcessos(prev => prev.map(p => p.id === updatedProc.id ? updatedProc : p));
        setSelectedProcesso(updatedProc);
        fetchData(); // Force immediate cache and system sync

        // Next queued user or submit comment?
        if (mentionPrompt.remainingNonAccess.length > 0) {
          const nextUser = mentionPrompt.remainingNonAccess[0];
          const rest = mentionPrompt.remainingNonAccess.slice(1);
          setMentionPrompt({
            ...mentionPrompt,
            user: nextUser,
            remainingNonAccess: rest
          });
        } else {
          // All cleared! We can finally submit the comment!
          await submitCommentDirectly(mentionPrompt.commentText, mentionPrompt.mencoes);
          setMentionPrompt(null);
        }
      } else {
        const errJson = await res.json();
        alert(errJson.error || "Erro ao adicionar participante.");
        setMentionPrompt(null);
      }
    } catch (e) {
      console.error(e);
      setMentionPrompt(null);
    }
  };

  const declineAddMentionedParticipant = async () => {
    if (!mentionPrompt || !selectedProcesso) return;
    alert("O usuário selecionado não possui acesso ao processo e não receberá a menção.");

    // Next queued user or submit comment?
    if (mentionPrompt.remainingNonAccess.length > 0) {
      const nextUser = mentionPrompt.remainingNonAccess[0];
      const rest = mentionPrompt.remainingNonAccess.slice(1);
      setMentionPrompt({
        ...mentionPrompt,
        user: nextUser,
        remainingNonAccess: rest
      });
    } else {
      // Exclude this declined user from mentions
      const allowedMentions = mentionPrompt.mencoes.filter(email => {
        const target = participantesDisponiveis.find(u => u.email.toLowerCase() === email.toLowerCase());
        return target && checkUserHasAccess(target, selectedProcesso);
      });
      await submitCommentDirectly(mentionPrompt.commentText, allowedMentions);
      setMentionPrompt(null);
    }
  };

  // Submit Comments
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcesso || !newCommentText.trim()) return;

    // Detect user mentions
    const words = newCommentText.split(" ");
    const mencoes: string[] = [];
    words.forEach(w => {
      if (w.startsWith("@")) {
        const possibleEmail = w.substring(1).replace(/[.,;:!?)]+$/, ""); // Remove basic punctuation
        // Verify if it corresponds to an existing system user’s email or name
        const matchedUser = participantesDisponiveis.find(u => 
          u.email.toLowerCase() === possibleEmail.toLowerCase() || 
          u.nome.toLowerCase().replace(/\s+/g, "") === possibleEmail.toLowerCase()
        );
        if (matchedUser) {
          mencoes.push(matchedUser.email);
        }
      }
    });

    // Verify if any mentioned user does not have access to the process
    const nonAccessUsers = mencoes
      .map(email => participantesDisponiveis.find(u => u.email.toLowerCase() === email.toLowerCase()))
      .filter((u): u is Usuario => u !== undefined && !checkUserHasAccess(u, selectedProcesso));

    if (nonAccessUsers.length > 0) {
      const firstUser = nonAccessUsers[0];
      const rest = nonAccessUsers.slice(1);
      setMentionPrompt({
        user: firstUser,
        commentText: newCommentText.trim(),
        mencoes: mencoes,
        remainingNonAccess: rest
      });
    } else {
      await submitCommentDirectly(newCommentText.trim(), mencoes);
    }
  };

  const insertMention = (userEmail: string) => {
    if (!commentInputRef.current) return;
    const txt = newCommentText;
    const cursor = commentInputRef.current.selectionStart;
    
    // Find last @ symbol before cursor
    const lastAtIdx = txt.lastIndexOf("@", cursor - 1);
    if (lastAtIdx === -1) return;

    const prefix = txt.substring(0, lastAtIdx);
    const suffix = txt.substring(cursor);
    const completed = `${prefix}@${userEmail} ${suffix}`;
    
    setNewCommentText(completed);
    setShowMentionDropdown(false);
    
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 50);
  };

  const handleCommentTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewCommentText(val);

    const cursor = e.target.selectionStart;
    const lastAtIdx = val.lastIndexOf("@", cursor - 1);

    if (lastAtIdx !== -1 && lastAtIdx >= val.lastIndexOf(" ", cursor - 1)) {
      const query = val.substring(lastAtIdx + 1, cursor);
      setMentionQuery(query);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const dataURLtoBlob = (dataurl: string) => {
    try {
      const arr = dataurl.split(",");
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.error("Error parsing base64 data url:", e);
      return null;
    }
  };

  const handleDownloadAttachment = (anx: any) => {
    if (!anx || !anx.url) return;
    
    // Check if it is a Base64 data URL
    if (anx.url.startsWith("data:")) {
      try {
        const blob = dataURLtoBlob(anx.url);
        if (!blob) {
          window.open(anx.url, "_blank");
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        
        // Setup temporary anchor link for download
        const tempLink = document.createElement("a");
        tempLink.href = blobUrl;
        tempLink.download = anx.nome;
        document.body.appendChild(tempLink);
        tempLink.click();
        
        // Cleanup
        document.body.removeChild(tempLink);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      } catch (err) {
        console.error("Erro ao processar anexo:", err);
        window.open(anx.url, "_blank");
      }
    } else {
      // Direct opening or fallback download
      const tempLink = document.createElement("a");
      tempLink.href = anx.url;
      tempLink.target = "_blank";
      tempLink.download = anx.nome;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
    }
  };

  // Submit Attachments
  const handleAttachFileSimulation = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProcesso || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Check size limit: 30MB for safety (JSON max is 50MB on server payload parser)
    if (file.size > 30 * 1024 * 1024) {
      alert("O arquivo selecionado é muito grande. O limite máximo permitido é de 30MB.");
      return;
    }

    // Determine type string
    let type = "OUTROS";
    if (file.type.includes("pdf")) type = "PDF";
    else if (file.type.includes("image")) type = "IMAGEM";
    else if (file.type.includes("sheet") || file.name.endsWith(".xls") || file.name.endsWith(".xlsx") || file.name.endsWith(".csv")) type = "PLANILHA";
    else if (file.type.includes("word") || file.name.endsWith(".doc") || file.name.endsWith(".docx")) type = "DOCUMENTO";
    else if (file.type.includes("zip") || file.name.endsWith(".rar")) type = "ZIP";

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      if (!base64Url) return;

      const payload = {
        nome: file.name,
        url: base64Url,
        tipo: type
      };

      try {
        const res = await apiFetch(`/api/processos/${selectedProcesso.id}/anexos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          fetchCommentsAndHistory(selectedProcesso.id);
          fetchData();
        } else {
          const errData = await res.json();
          alert(errData.error || "Erro ao fazer upload do arquivo.");
        }
      } catch (err) {
        console.error("Error attaching simulated file:", err);
        alert("Erro ao enviar o anexo para o servidor.");
      }
    };

    reader.onerror = () => {
      alert("Ocorreu um erro ao ler o arquivo selecionado.");
    };

    reader.readAsDataURL(file);
  };

  // Create customized category (Master)
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await apiFetch("/api/processo-categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: newCatName.trim() })
      });
      if (res.ok) {
        setNewCatName("");
        setShowNewCatInput(false);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Erro ao criar categoria.");
      }
    } catch (err) {
      console.error("Error creating custom category:", err);
    }
  };

  // Create customized Kanban column (Master)
  const handleCreateColumn = async () => {
    if (!newColId.trim() || !newColName.trim()) return;
    try {
      const res = await apiFetch("/api/processo-colunas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: newColId.trim().toLowerCase(), 
          nome: newColName.trim(), 
          ordem: colunas.length + 1 
        })
      });
      if (res.ok) {
        setNewColId("");
        setNewColName("");
        setShowNewColInput(false);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Erro ao criar coluna.");
      }
    } catch (err) {
      console.error("Error creating custom column:", err);
    }
  };

  // Submit New Process
  const handleCreateProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcesso.titulo.trim()) return;

    // ----------------------------------------------------
    // FRONTEND VALIDATION (RULE: VALIDAÇÃO DE CORRELAÇÃO VISUAL)
    // ----------------------------------------------------
    // 1. Validate Responsável Principal (must correspond to an active system user)
    const validResponsavel = participantesDisponiveis.some(u => u.email.toLowerCase() === newProcesso.responsavel.toLowerCase()) || usuarios.some(u => u.email.toLowerCase() === newProcesso.responsavel.toLowerCase());
    if (!validResponsavel) {
      alert(`Validação do Processo: O Responsável Principal "${newProcesso.responsavel}" não existe no banco de dados do sistema.`);
      return;
    }

    // 2. Validate Participantes (all emails must exist in user database)
    if (newProcesso.participantes && newProcesso.participantes.length > 0) {
      for (const pEmail of newProcesso.participantes) {
        const exists = participantesDisponiveis.some(u => u.email.toLowerCase() === pEmail.toLowerCase()) || usuarios.some(u => u.email.toLowerCase() === pEmail.toLowerCase());
        if (!exists) {
          alert(`Validação do Processo: O participante com o e-mail "${pEmail}" não está cadastrado no sistema.`);
          return;
        }
      }
    }

    // 3. Validate Source Unit (must correspond to registered unit)
    const validSourceUnit = unidadesList.some(u => u.id === newProcesso.unidadeId);
    if (!validSourceUnit) {
      alert("Validação do Processo: A Unidade Origem selecionada é inválida ou não consta no banco de dados.");
      return;
    }

    const parsedTags = newProcesso.tagsText
      .split(",")
      .map(t => t.trim())
      .filter(t => t !== "");

    const shares = [...newProcesso.unidadesCompartilhadas];
    if (newProcesso.compartilharGeral) {
      shares.push("Todas");
    }

    // 4. Validate Shared Units (all must correspond to registered units)
    if (shares && shares.length > 0) {
      for (const uId of shares) {
        if (uId === "Todas") continue;
        const exists = unidadesList.some(u => u.id === uId);
        if (!exists) {
          alert(`Validação do Processo: A filial de compartilhamento "${uId}" não existe no banco de dados.`);
          return;
        }
      }
    }

    const payload = {
      titulo: newProcesso.titulo.trim(),
      categoria: newProcesso.categoria,
      descricao: newProcesso.descricao,
      unidadeId: newProcesso.unidadeId,
      prioridade: newProcesso.prioridade,
      dataInicio: newProcesso.dataInicio,
      dataLimite: newProcesso.dataLimite,
      responsavel: newProcesso.responsavel,
      participantes: newProcesso.participantes,
      status: newProcesso.status,
      tags: parsedTags,
      observacoes: newProcesso.observacoes,
      unidadesCompartilhadas: shares
    };

    try {
      const res = await apiFetch("/api/processos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowCreateModal(false);
        // Reset form
        setNewProcesso({
          titulo: "",
          categoria: categorias[0]?.nome || "RH",
          descricao: "",
          unidadeId: currentUser.unidadeId === "Todas" ? "un-go" : currentUser.unidadeId,
          prioridade: "Média",
          dataInicio: new Date().toISOString().split("T")[0],
          dataLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          responsavel: currentUser.email,
          participantes: [],
          status: colunas[0]?.id || "novo",
          tagsText: "",
          observacoes: "",
          unidadesCompartilhadas: [],
          compartilharGeral: false
        });
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Falha ao criar o processo no banco.");
      }
    } catch (err) {
      console.error("Error creating process:", err);
    }
  };

  // Mark single or all notifications as read
  const handleMarkNotificationRead = async (id?: string, all: boolean = false) => {
    try {
      const res = await apiFetch("/api/processo-notificacoes/lida", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, all })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error updating notifications status:", err);
    }
  };

  // Delete Process (Admin only)
  const handleDeleteProcess = (id: string) => {
    setConfirmDialog({
      message: "Deseja realmente excluir permanentemente este fluxo/processo? Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/processos/${id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            setSelectedProcesso(null);
            fetchData();
          } else {
            console.error("Permissão insuficiente ou erro na exclusão.");
          }
        } catch (err) {
          console.error("Error deleting process:", err);
        }
      }
    });
  };

  // FILTER LOGIC
  const filteredProcessos = processos.filter(p => {
    // 1. Text search
    const matchesText = p.titulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Category
    const matchesCategory = selectedCategory === "all" || p.categoria === selectedCategory;

    // 3. Priority
    const matchesPriority = selectedPriority === "all" || p.prioridade === selectedPriority;

    // 4. Unit filter (if master or has access)
    const matchesUnit = selectedUnit === "all" || p.unidadeId === selectedUnit || p.unidadesCompartilhadas?.includes(selectedUnit);

    // 5. Assigned to me filtering
    const matchesMe = !filterAssignedToMe || 
                      p.responsavel?.toLowerCase() === currentUser.email?.toLowerCase() || 
                      p.participantes?.some(pt => pt.toLowerCase() === currentUser.email?.toLowerCase());

    return matchesText && matchesCategory && matchesPriority && matchesUnit && matchesMe;
  });

  // METRICS CALCULATIONS
  const totalActives = processos.filter(p => p.status !== "concluido" && p.status !== "cancelado").length;
  const totalConcluded = processos.filter(p => p.status === "concluido").length;
  const totalPendente = processos.filter(p => p.status === "pendente").length;
  
  const todayStr = new Date().toISOString().split("T")[0];
  const totalOverdue = processos.filter(p => p.dataLimite && p.dataLimite < todayStr && p.status !== "concluido" && p.status !== "cancelado").length;

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "Crítica": return "bg-red-150 text-red-700 border-red-300";
      case "Alta": return "bg-amber-100 text-amber-800 border-amber-300";
      case "Média": return "bg-blue-100 text-blue-800 border-blue-300";
      default: return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const getProcessUserRole = (p: Processo, u: Usuario): "visualizador" | "editor" | "administrador" => {
    if (!u || !p) return "visualizador";
    const isMaster = u.perfil === "admin_master" || u.tipo_usuario === "MASTER";
    if (isMaster) return "administrador";

    const emailNorm = (u.email || "").toLowerCase();

    // Explicit roles override defaults
    if ((p as any).participanteRoles && (p as any).participanteRoles[emailNorm]) {
      return (p as any).participanteRoles[emailNorm];
    }

    // Creator or responsible is always administrador
    const isCreatorOrResponsible = p.criadoPor?.toLowerCase() === emailNorm || 
                                   p.responsavel?.toLowerCase() === emailNorm;
    if (isCreatorOrResponsible) return "administrador";

    // Participant is editor by default
    const isParticipant = p.participantes?.some(pt => pt.toLowerCase() === emailNorm);
    if (isParticipant) return "editor";

    // Default for shared access is visualizador
    return "visualizador";
  };

  const checkUserHasAccess = (u: Usuario, proc: Processo): boolean => {
    if (!u || !proc) return false;
    const isMaster = u.perfil === "admin_master" || u.tipo_usuario === "MASTER";
    if (isMaster) return true;

    const emailNorm = u.email.toLowerCase();

    const isPart = proc.criadoPor?.toLowerCase() === emailNorm || 
                   proc.responsavel?.toLowerCase() === emailNorm ||
                   proc.participantes?.some(p => p.toLowerCase() === emailNorm);
    if (isPart) return true;

    const mainUnitMatch = proc.unidadeId === u.unidadeId;
    const sharedMatch = proc.unidadesCompartilhadas?.includes(u.unidadeId) || 
                        proc.unidadesCompartilhadas?.includes("Todas");
    
    if (mainUnitMatch || sharedMatch) {
      return true;
    }

    return false;
  };

  // Calculates Average completion time
  // Compare criadoEm (ISO) to atualizadoEm (ISO)
  const getAverageCompletionDaysText = () => {
    const closed = processos.filter(p => p.status === "concluido" && p.criadoEm);
    if (closed.length === 0) return "---";
    let sumMs = 0;
    closed.forEach(p => {
      const diff = new Date(p.atualizadoEm || p.criadoEm).getTime() - new Date(p.criadoEm).getTime();
      sumMs += diff;
    });
    const avgDays = sumMs / closed.length / (1000 * 60 * 60 * 24);
    return `${avgDays.toFixed(1)} dias`;
  };

  // Get user display name from email
  const displayUserName = (email: string) => {
    const usr = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    return usr ? usr.nome : email;
  };

  return (
    <div id="central-processos-container" className="flex flex-col space-y-6 w-full p-1 max-w-7xl mx-auto">
      
      {/* HEADER SECTION WITH ACTION BUTTONS & NOTIFICATION BELL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FFFFFF] flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-indigo-400" />
            Central de Processos Colaborativos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestão operacional, agregação, fluxos operacionais e ocorrências compartilhados em tempo real entre filiais.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          {/* Real-time Notifications trigger */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="p-2.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition relative"
              title="Central de Notificações"
            >
              <Bell className="h-5 w-5 text-slate-300" />
              {notificacoes.filter(n => !n.lida).length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {notificacoes.filter(n => !n.lida).length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel (Desktop and Mobile safe) */}
            <AnimatePresence>
              {showNotifPanel && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 p-4 max-h-96 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <span className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                      <Bell className="h-4 w-4 text-indigo-400" /> Notificações
                    </span>
                    {notificacoes.length > 0 && (
                      <button 
                        onClick={() => handleMarkNotificationRead(undefined, true)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors"
                      >
                        Marcar todas lidas
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 mt-1">
                    {notificacoes.length === 0 ? (
                      <p className="text-xs text-slate-405 text-center py-4">Nenhuma notificação recente.</p>
                    ) : (
                      notificacoes.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            const relatedProc = processos.find(p => p.id === n.processoId);
                            if (relatedProc) {
                              setSelectedProcesso(relatedProc);
                              setShowNotifPanel(false);
                            }
                            handleMarkNotificationRead(n.id);
                          }}
                          className={`p-2.5 rounded-lg border cursor-pointer hover:border-indigo-500 transition-colors duration-200 ${
                            n.lida 
                              ? 'bg-[#0F172A] border-slate-800 text-slate-305' 
                              : 'bg-indigo-950/40 border-indigo-900 text-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-semibold text-xs text-slate-200">{n.titulo}</span>
                            {!n.lida && <span className="h-2 w-2 rounded-full bg-indigo-500"></span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.mensagem}</p>
                          <span className="text-[10px] text-slate-500 mt-2 block">{new Date(n.data).toLocaleString("pt-BR")}</span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setShowDashboard(!showDashboard)}
            className="p-2.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm flex items-center gap-1 transition-all"
          >
            {showDashboard ? <LayoutGrid className="h-4 w-4" /> : <BarChart2 className="h-4 w-4" />}
            {showDashboard ? "Ocultar Dash" : "Dashboard"}
          </button>

          <button 
            onClick={() => {
              fetchData();
              setShowCreateModal(true);
            }}
            className="px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-sm flex items-center gap-1.5 shadow-md transition-all"
          >
            <Plus className="h-4 w-4" /> Novo Processo
          </button>
        </div>
      </div>

      {/* DASHBOARD INDICATORS SECTION */}
      {showDashboard && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Card 1: Active */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-slate-500 text-xs font-medium">Processos Ativos</span>
              <h3 className="text-2xl font-bold text-slate-800">{totalActives}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <PlayCircle className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: Pending */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-slate-500 text-xs font-medium">Prazos Pendentes</span>
              <h3 className="text-2xl font-bold text-slate-800">{totalPendente}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3: Overdue */}
          <div className={`border rounded-xl p-4 flex items-center justify-between shadow-sm transition ${totalOverdue > 0 ? "bg-red-50/50 border-red-200 text-red-900" : "bg-white border-slate-200"}`}>
            <div className="space-y-1">
              <span className="text-slate-500 text-xs font-medium">Processos Atrasados</span>
              <h3 className="text-2xl font-bold text-slate-800">{totalOverdue}</h3>
            </div>
            <div className={`p-3 rounded-lg ${totalOverdue > 0 ? "bg-red-100 text-red-650" : "bg-slate-50 text-slate-500"}`}>
              <AlertTriangle className={`h-6 w-6 ${totalOverdue > 0 ? "animate-bounce" : ""}`} />
            </div>
          </div>

          {/* Card 4: Concluded & SLA */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-slate-500 text-xs font-medium">Tempo Médio SLA</span>
              <h3 className="text-lg font-bold text-slate-800">{getAverageCompletionDaysText()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{totalConcluded} concluídos total</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </motion.div>
      )}

      {/* FILTER BAR PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Painel de Filtros e Busca
          </span>
          {currentUser.perfil === "admin_master" && (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowNewCatInput(!showNewCatInput)}
                className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 transition-colors"
              >
                ⚙️ Criar Categoria
              </button>
              <button 
                onClick={() => setShowNewColInput(!showNewColInput)}
                className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 transition-colors"
              >
                ⚙️ Criar Coluna Kanban
              </button>
            </div>
          )}
        </div>

        {/* Master custom Category Form */}
        {showNewCatInput && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-3.5 border border-dashed border-slate-700 rounded-lg bg-[#0F172A] flex flex-col sm:flex-row gap-3 items-end"
          >
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-[#E2E8F0]">Nova Categoria Corporativa (MASTER)</label>
              <input 
                type="text" 
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Exemplo: Compras Filial" 
                className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium placeholder-[#94A3B8] rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCreateCategory}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded px-4 py-2 transition-all shadow-sm"
              >
                Salvar Categoria
              </button>
              <button 
                onClick={() => setShowNewCatInput(false)}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs px-3 py-2 rounded font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}

        {/* Master custom Column Form */}
        {showNewColInput && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-3.5 border border-dashed border-slate-700 rounded-lg bg-[#0F172A] flex flex-col sm:flex-row gap-3 items-end"
          >
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-[#E2E8F0]">ID Único da Coluna</label>
              <input 
                type="text" 
                value={newColId}
                onChange={e => setNewColId(e.target.value)}
                placeholder="Ex: em_retirada" 
                className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium placeholder-[#94A3B8] rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-[#E2E8F0]">Display Nome (Emoji incluso)</label>
              <input 
                type="text" 
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                placeholder="Ex: 🔧 Oficina" 
                className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium placeholder-[#94A3B8] rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCreateColumn}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded px-4 py-2 transition-all shadow-sm"
              >
                Salvar Coluna
              </button>
              <button 
                onClick={() => setShowNewColInput(false)}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs px-3 py-2 rounded font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* 1. Text input filter */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, tag, ou descrição..." 
              className="pl-9 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium placeholder-[#94A3B8] rounded-lg py-2.5 text-xs transition-all duration-200 outline-none"
            />
          </div>

          {/* 2. Category filtering */}
          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium rounded-lg p-2.5 text-xs transition-all duration-200 outline-none"
            >
              <option value="all" className="bg-[#0F172A] text-white">Todas Categorias</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.nome} className="bg-[#0F172A] text-white">{cat.nome}</option>
              ))}
            </select>
          </div>

          {/* 3. Priority filtering */}
          <div>
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium rounded-lg p-2.5 text-xs transition-all duration-200 outline-none"
            >
              <option value="all" className="bg-[#0F172A] text-white">Todas Prioridades</option>
              <option value="Baixa" className="bg-[#0F172A] text-white">🟢 Baixa</option>
              <option value="Média" className="bg-[#0F172A] text-white">🔵 Média</option>
              <option value="Alta" className="bg-[#0F172A] text-white">🟡 Alta</option>
              <option value="Crítica" className="bg-[#0F172A] text-white">🔴 Crítica</option>
            </select>
          </div>

          {/* 4. Unit restriction filter */}
          <div>
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium rounded-lg p-2.5 text-xs transition-all duration-200 outline-none"
            >
              <option value="all" className="bg-[#0F172A] text-white">Compartilhado Geral / Todas</option>
              {unidadesList.map(u => (
                <option key={u.id} value={u.id} className="bg-[#0F172A] text-white">{u.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Assign Checkbox */}
        <div className="flex items-center gap-2 pt-2 text-xs">
          <input 
            type="checkbox" 
            id="assignedToMeOnly"
            checked={filterAssignedToMe}
            onChange={e => setFilterAssignedToMe(e.target.checked)}
            className="rounded border-[#334155] text-[#2563EB] focus:ring-[#2563EB] bg-[#0F172A] cursor-pointer"
          />
          <label htmlFor="assignedToMeOnly" className="cursor-pointer font-semibold select-none text-slate-300 hover:text-white transition-colors">
            👤 Mostrar apenas tarefas que sou participante ou responsável principal
          </label>
        </div>
      </div>

      {/* HORIZONTAL SCROLLABLE KANBAN BOARD */}
      <div className="overflow-x-auto pb-4">
        <div className="flex space-x-4 min-w-[1200px] h-[640px]">
          {colunas.map(col => {
            const processesInCol = filteredProcessos.filter(p => p.status === col.id);
            const isDraggedOver = draggedOverColId === col.id;

            return (
              <div 
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedOverColId !== col.id) {
                    setDraggedOverColId(col.id);
                  }
                }}
                onDragLeave={() => setDraggedOverColId(null)}
                onDrop={(e) => handleDropCard(e, col.id)}
                className={`flex-1 flex flex-col p-3 rounded-xl border transition duration-200 ${
                  isDraggedOver 
                    ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200' 
                    : 'bg-slate-50/50 border-slate-200'
                }`}
              >
                {/* Column Head */}
                <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-800">{col.nome}</span>
                    <span className="text-xs bg-slate-200/80 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                      {processesInCol.length}
                    </span>
                  </div>
                </div>

                {/* Cards stack */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin">
                  {processesInCol.length === 0 ? (
                    <div className="h-24 border border-dashed border-slate-200 rounded-lg flex items-center justify-center p-4">
                      <span className="text-slate-400 text-xs text-center">Arraste processos para cá</span>
                    </div>
                  ) : (
                    processesInCol.map(proc => {
                      const isOverdue = proc.dataLimite && proc.dataLimite < todayStr;
                      
                      return (
                        <div 
                          key={proc.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, proc.id)}
                          onClick={() => setSelectedProcesso(proc)}
                          className="bg-white border border-slate-200 hover:border-slate-350 rounded-lg p-3 hover:shadow-md cursor-pointer transition relative group"
                        >
                          {/* Top badge level */}
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5 uppercase tracking-wide">
                              {proc.categoria}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 border rounded-md ${getPriorityColor(proc.prioridade)}`}>
                              {proc.prioridade}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition truncate-2-lines line-clamp-2">
                            {proc.titulo}
                          </h4>

                          {/* Unit info */}
                          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Building className="h-3 w-3" /> Unidade: {unidadesList.find(u => u.id === proc.unidadeId)?.nome || proc.unidadeId}
                          </p>

                          {/* Overdue alert */}
                          {isOverdue && (
                            <span className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-red-650 bg-red-50 border border-red-200 rounded-md px-1.5 py-0.5 animate-pulse">
                              <AlertTriangle className="h-3 w-3" /> ATRASADO ({proc.dataLimite})
                            </span>
                          )}

                          {/* Tags row */}
                          {proc.tags && proc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {proc.tags.map((tg, i) => (
                                <span key={i} className="text-[9px] bg-slate-50 text-slate-500 font-medium px-1 rounded-sm border border-slate-100">
                                  #{tg}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Bottom info section */}
                          <div className="border-t border-slate-100 mt-2.5 pt-2 flex items-center justify-between text-[11px] text-slate-500">
                            <div className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate max-w-[80px]" title={proc.responsavel}>
                                {displayUserName(proc.responsavel)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              {proc.anexos && proc.anexos.length > 0 && (
                                <span className="flex items-center gap-0.5 font-medium">
                                  <Paperclip className="h-3 w-3" /> {proc.anexos.length}
                                </span>
                              )}
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">
                                {proc.participantes ? proc.participantes.length + 1 : 1}p
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE PROCESS MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-2xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <PlusCircle className="h-5 w-5 text-indigo-400" /> Criar Novo Processo Corporativo
                </span>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProcessSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#E2E8F0]">
                      Título do Processo <span className="text-[#EF4444] font-bold">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newProcesso.titulo}
                      onChange={e => setNewProcesso({ ...newProcesso, titulo: e.target.value })}
                      placeholder="Título do Processo" 
                      className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium placeholder-[#94A3B8] rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
                    />
                  </div>

                  {/* Category & Priority */}
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0]">Categoria</label>
                    <select
                      value={newProcesso.categoria}
                      onChange={e => setNewProcesso({ ...newProcesso, categoria: e.target.value })}
                      className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
                    >
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.nome} className="bg-[#0F172A] text-white">
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0]">Prioridade</label>
                    <select
                      value={newProcesso.prioridade}
                      onChange={e => setNewProcesso({ ...newProcesso, prioridade: e.target.value as any })}
                      className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
                    >
                      <option value="Baixa" className="bg-[#0F172A] text-white">🟢 Baixa</option>
                      <option value="Média" className="bg-[#0F172A] text-white">🔵 Média</option>
                      <option value="Alta" className="bg-[#0F172A] text-white">🟡 Alta</option>
                      <option value="Crítica" className="bg-[#0F172A] text-white">🔴 Crítica</option>
                    </select>
                  </div>

                  {/* Dates */}
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0]">Data de Início</label>
                    <input 
                      type="date" 
                      value={newProcesso.dataInicio}
                      onChange={e => setNewProcesso({ ...newProcesso, dataInicio: e.target.value })}
                      className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0]">
                      Data Limite (Prazo Limite) <span className="text-[#EF4444] font-bold">*</span>
                    </label>
                    <input 
                      type="date" 
                      required
                      value={newProcesso.dataLimite}
                      onChange={e => setNewProcesso({ ...newProcesso, dataLimite: e.target.value })}
                      className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
                    />
                  </div>

                  {/* Unit & Stakeholder */}
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0]">Unidade Origem</label>
                    <select
                      value={newProcesso.unidadeId}
                      onChange={e => setNewProcesso({ ...newProcesso, unidadeId: e.target.value })}
                      className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
                    >
                      {unidadesList.map(u => (
                        <option key={u.id} value={u.id} className="bg-[#0F172A] text-[#FFFFFF]">
                          {u.nome} ({u.estado})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0]">Responsável Principal</label>
                    <select
                      value={newProcesso.responsavel}
                      onChange={e => setNewProcesso({ ...newProcesso, responsavel: e.target.value })}
                      className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
                    >
                      <option value="" disabled>Selecione o Responsável Principal...</option>
                      {usuarios.map(u => {
                        const position = u.cargo || "Supervisor";
                        const unitName = unidadesList.find(un => un.id === u.unidadeId)?.cidade || u.unidadeId || "Goiânia";
                        return (
                          <option key={u.id} value={u.email} className="bg-[#0F172A] text-[#FFFFFF]">
                            {u.nome} — {position} — {unitName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Multiple Participantes selection checkboxes */}
                  <div className="col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <label className="block text-xs font-semibold text-[#E2E8F0]">Participantes do Processo</label>
                      
                      {/* Interactive Selection Helpers */}
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            const allEmails = participantesDisponiveis.map(u => u.email);
                            setNewProcesso({ ...newProcesso, participantes: allEmails });
                          }}
                          className="text-indigo-400 hover:text-indigo-300 font-medium transition"
                        >
                          ✓ Selecionar Todos
                        </button>
                        <span className="text-[#334155]">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewProcesso({ ...newProcesso, participantes: [] });
                          }}
                          className="text-rose-400 hover:text-rose-300 font-medium transition"
                        >
                          ✕ Limpar
                        </button>
                        <span className="text-[#334155]">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            // Select users from current source unit
                            const branchUsers = participantesDisponiveis
                              .filter(u => u.unidadeId === newProcesso.unidadeId)
                              .map(u => u.email);
                            setNewProcesso({ ...newProcesso, participantes: branchUsers });
                          }}
                          className="text-sky-400 hover:text-sky-300 font-medium transition"
                        >
                          🏬 Mesma Filial
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-[#0F172A] border border-[#334155] hover:border-[#475569] rounded-lg max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 scrollbar-thin transition">
                      {participantesDisponiveis.map(u => {
                        const isUserMaster = u.perfil === "admin_master" || u.tipo_usuario === "MASTER";
                        const position = isUserMaster ? "Administrador Master" : (u.cargo || "Analista");
                        const unitName = isUserMaster ? "MASTER ADM" : (unidadesList.find(un => un.id === u.unidadeId)?.cidade || u.unidadeId || "Goiânia");
                        const isChecked = newProcesso.participantes.includes(u.email);
                        return (
                          <div 
                            key={u.id} 
                            className={`flex items-start gap-2.5 p-1.5 rounded transition-all duration-150 ${
                              isChecked ? 'bg-sky-500/5 border border-sky-500/20' : 'border border-transparent'
                            }`}
                          >
                            <input 
                              type="checkbox"
                              id={`part-${u.id}`}
                              checked={isChecked}
                              onChange={e => {
                                const checked = e.target.checked;
                                const updated = checked 
                                  ? [...newProcesso.participantes, u.email]
                                  : newProcesso.participantes.filter(x => x !== u.email);
                                setNewProcesso({ ...newProcesso, participantes: updated });
                              }}
                              className="mt-0.5 rounded border-[#475569] text-[#2563EB] focus:ring-[#2563EB] bg-[#0F172A] cursor-pointer"
                            />
                            <label htmlFor={`part-${u.id}`} className="cursor-pointer text-xs leading-none select-none flex-1" title={u.email}>
                              <div className="font-semibold text-slate-200">{u.nome}</div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                {isUserMaster ? (
                                  <span className="text-amber-400 font-semibold">{position} — {unitName}</span>
                                ) : (
                                  `${position} — ${unitName}`
                                )}
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Share among Branches/Units */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#E2E8F0] mb-2">Compartilhar com Filiais</label>
                    <div className="p-3 bg-[#0F172A] border border-[#334155] rounded-lg gap-2 flex flex-col">
                      <div className="flex items-center gap-2 border-b border-[#334155] pb-1.5 text-xs text-indigo-400">
                        <input 
                          type="checkbox"
                          id="shareGeral"
                          checked={newProcesso.compartilharGeral}
                          onChange={e => setNewProcesso({ ...newProcesso, compartilharGeral: e.target.checked })}
                          className="rounded border-[#334155] text-[#2563EB] focus:ring-[#2563EB] bg-[#0F172A] cursor-pointer"
                        />
                        <label htmlFor="shareGeral" className="font-semibold text-slate-200 cursor-pointer">🌍 Compartilhar com todas as filiais e Masters simultaneamente</label>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                        {unidadesList.map(u => {
                          const isDisabled = newProcesso.compartilharGeral;
                          const isChecked = newProcesso.unidadesCompartilhadas.includes(u.id);
                          return (
                            <div 
                              key={u.id} 
                              className={`flex items-center gap-1.5 p-1 px-2 rounded text-xs transition-all duration-150 border ${
                                isDisabled 
                                  ? 'text-[#64748B] border-transparent bg-slate-900/40' 
                                  : isChecked 
                                    ? 'bg-sky-500/5 border-sky-500/20 text-[#38BDF8]' 
                                    : 'text-slate-300 border-transparent hover:bg-slate-800/40'
                              }`}
                            >
                              <input 
                                type="checkbox"
                                disabled={isDisabled}
                                id={`share-unit-${u.id}`}
                                checked={isChecked}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  const updated = checked 
                                    ? [...newProcesso.unidadesCompartilhadas, u.id]
                                    : newProcesso.unidadesCompartilhadas.filter(x => x !== u.id);
                                  setNewProcesso({ ...newProcesso, unidadesCompartilhadas: updated });
                                }}
                                className={`rounded border-[#475569] text-[#2563EB] focus:ring-[#2563EB] bg-[#0F172A] ${
                                  isDisabled 
                                    ? 'bg-[#1E293B] !text-[#64748B] cursor-not-allowed border-slate-700' 
                                    : 'cursor-pointer'
                                }`}
                              />
                              <label 
                                htmlFor={`share-unit-${u.id}`} 
                                className={`truncate flex-1 font-medium ${isDisabled ? 'cursor-not-allowed text-[#64748B]' : 'cursor-pointer'}`}
                              >
                                {u.cidade}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#E2E8F0]">Descrição operacional</label>
                    <textarea 
                      value={newProcesso.descricao}
                      onChange={e => setNewProcesso({ ...newProcesso, descricao: e.target.value })}
                      placeholder="Identifique o passo a passo, documentos requeridos, contatos de suporte..." 
                      rows={3}
                      className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium placeholder-[#94A3B8] rounded-md p-2.5 text-xs transition-all duration-200 outline-none resize-none"
                    />
                  </div>

                  {/* Tags & Observacoes */}
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0]">Tags (Separar por vírgula)</label>
                    <input 
                      type="text" 
                      value={newProcesso.tagsText}
                      onChange={e => setNewProcesso({ ...newProcesso, tagsText: e.target.value })}
                      placeholder="ex: contratacao, aso, uberlandia" 
                      className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium placeholder-[#94A3B8] rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0]">Observações Extras</label>
                    <input 
                      type="text" 
                      value={newProcesso.observacoes}
                      onChange={e => setNewProcesso({ ...newProcesso, observacoes: e.target.value })}
                      placeholder="Qualquer anotação operacional secundária" 
                      className="mt-1 w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium placeholder-[#94A3B8] rounded-md p-2.5 text-xs transition-all duration-200 outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 text-slate-405 hover:text-white hover:bg-slate-850 text-xs font-semibold rounded-lg transition-all font-medium"
                  >
                    Mudar de Ideia
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-lg shadow-md transition-all"
                  >
                    Salvar Processo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED PROCESS DIALOG/DRAWER (REAL-TIME UPDATES & COLLABORATIVE WORK) */}
      <AnimatePresence>
        {selectedProcesso && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-end">
            <motion.div 
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-slate-900 h-full w-full max-w-xl shadow-2xl flex flex-col border-l border-slate-800 text-white"
            >
              {/* Drawer head */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px] bg-slate-800 rounded px-2 py-0.5 mt-0.5">
                    ID: {selectedProcesso.id}
                  </span>
                  <span className="text-[10px] font-bold text-white bg-indigo-600 rounded px-2 py-0.5">
                    {selectedProcesso.categoria}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(currentUser.perfil === "admin_master" || currentUser.unidadeId === selectedProcesso.unidadeId) && (
                    <button 
                      onClick={() => handleDeleteProcess(selectedProcesso.id)}
                      className="p-1.5 rounded text-red-400 hover:bg-slate-800 transition-colors"
                      title="Excluir Processo"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  )}
                  <button onClick={() => setSelectedProcesso(null)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Drawer Main scroll body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                
                {/* Title & priority */}
                <div>
                  <h3 className="text-lg font-bold text-slate-100 tracking-tight">{selectedProcesso.titulo}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`text-[10px] font-bold uppercase rounded-md px-2 py-0.5 border ${getPriorityColor(selectedProcesso.prioridade)}`}>
                      Prioridade {selectedProcesso.prioridade}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-900 rounded-md px-2 py-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Prazo: {selectedProcesso.dataLimite}
                    </span>
                  </div>
                </div>

                {/* Operations Specs Grid */}
                <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3.5 space-y-2.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Origem:</span>
                    <span className="font-semibold text-slate-200">
                      {unidadesList.find(u => u.id === selectedProcesso.unidadeId)?.nome || selectedProcesso.unidadeId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Responsável:</span>
                    <span className="font-semibold text-slate-200" title={selectedProcesso.responsavel}>
                      {displayUserName(selectedProcesso.responsavel)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Criado em:</span>
                    <span className="text-slate-300">
                      {new Date(selectedProcesso.criadoEm).toLocaleDateString("pt-BR")} às {new Date(selectedProcesso.criadoEm).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  {selectedProcesso.unidadesCompartilhadas && selectedProcesso.unidadesCompartilhadas.length > 0 && (
                    <div className="border-t border-[#334155] pt-2 flex flex-col gap-1">
                      <span className="font-semibold text-slate-400 flex items-center gap-1">
                        <Share2 className="h-3 w-3 text-indigo-400" /> Compartilhado com:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedProcesso.unidadesCompartilhadas.map(unId => (
                          <span key={unId} className="text-[10px] bg-slate-800 text-slate-200 font-semibold px-2 py-0.5 rounded">
                            {unId === "Todas" ? "🌍 Todas Filiais" : (unidadesList.find(u => u.id === unId)?.cidade || unId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Co-participants and access levels list */}
                  <div className="border-t border-[#334155] pt-2.5 space-y-2">
                    <span className="font-semibold text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-indigo-400" /> Participantes e Permissões:
                      </span>
                    </span>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {/* Responsible Principal */}
                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <div className="truncate pr-2">
                          <p className="font-bold text-slate-200 text-[11px] truncate flex items-center gap-1">
                            {displayUserName(selectedProcesso.responsavel)}
                            <span className="text-[9px] bg-sky-950/65 text-sky-400 px-1 py-0.2 rounded border border-sky-800/40 font-semibold font-mono">P. RESPONSÁVEL</span>
                          </p>
                          <span className="text-[10px] text-slate-400 block truncate">{selectedProcesso.responsavel}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded font-mono">
                          ADMINISTRADOR
                        </span>
                      </div>

                      {/* Other Participants */}
                      {(!selectedProcesso.participantes || selectedProcesso.participantes.length === 0) ? (
                        <p className="text-[10px] text-slate-400 italic text-center py-1">Sem co-participantes adicionais atribuídos.</p>
                      ) : (
                        selectedProcesso.participantes.map(email => {
                          const userMatch = participantesDisponiveis.find(u => u.email.toLowerCase() === email.toLowerCase());
                          const currentRole = getProcessUserRole(selectedProcesso, userMatch || { email, perfil: "user", id: "", nome: "" } as any);
                          const amIAdmin = getProcessUserRole(selectedProcesso, currentUser) === "administrador";

                          return (
                            <div key={email} className="flex items-center justify-between bg-[#131B2E] p-2 rounded-lg border border-slate-800 transition">
                              <div className="truncate pr-2">
                                <p className="font-bold text-slate-200 text-[11px] truncate">{userMatch ? userMatch.nome : email}</p>
                                <span className="text-[10px] text-slate-400 block truncate">{email}</span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {amIAdmin ? (
                                  <>
                                    <select
                                      value={currentRole}
                                      onChange={(e) => {
                                        const newRole = e.target.value as "visualizador" | "editor" | "administrador";
                                        const updatedRoles = {
                                          ...((selectedProcesso as any).participanteRoles || {}),
                                          [email.toLowerCase()]: newRole
                                        };
                                        // Save to database
                                        apiFetch(`/api/processos/${selectedProcesso.id}`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ participanteRoles: updatedRoles })
                                        }).then(res => {
                                          if (res.ok) {
                                            res.json().then(data => {
                                              setProcessos(prev => prev.map(p => p.id === data.id ? data : p));
                                              setSelectedProcesso(data);
                                              fetchData(); // Force immediate cache and system sync
                                            });
                                          }
                                        });
                                      }}
                                      className="bg-slate-900 border border-slate-700 text-slate-200 text-[10px] rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                                    >
                                      <option value="visualizador">VISUALIZADOR</option>
                                      <option value="editor">EDITOR</option>
                                      <option value="administrador">ADMINISTRADOR</option>
                                    </select>
                                    <button
                                      title="Remover co-participação"
                                      onClick={() => {
                                        const updatedParts = (selectedProcesso.participantes || []).filter(e => e !== email);
                                        const updatedRoles = { ...((selectedProcesso as any).participanteRoles || {}) };
                                        delete updatedRoles[email.toLowerCase()];

                                        apiFetch(`/api/processos/${selectedProcesso.id}`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            participantes: updatedParts,
                                            participanteRoles: updatedRoles
                                          })
                                        }).then(res => {
                                          if (res.ok) {
                                            res.json().then(data => {
                                              setProcessos(prev => prev.map(p => p.id === data.id ? data : p));
                                              setSelectedProcesso(data);
                                              fetchData(); // Force immediate cache and system sync
                                            });
                                          }
                                        });
                                      }}
                                      className="text-red-405 hover:text-red-300 hover:bg-slate-800 p-1 rounded transition"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </>
                                ) : (
                                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded font-mono ${
                                    currentRole === "administrador" ? "bg-[#3B0764]/80 text-[#C084FC] border border-[#701A75]/40" :
                                    currentRole === "editor" ? "bg-[#1E1B4B]/80 text-[#818CF8] border border-[#312E81]/40" :
                                    "bg-slate-800/80 text-slate-400 border border-slate-700/40"
                                  }`}>
                                    {currentRole === "administrador" ? "ADMINISTRADOR" : currentRole === "editor" ? "EDITOR" : "VISUALIZADOR"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quick Add participant inline form - only for card admins */}
                    {getProcessUserRole(selectedProcesso, currentUser) === "administrador" && (
                      <div className="pt-2 border-t border-[#131B2E] flex gap-1.5">
                        <select
                          onChange={(e) => {
                            const newMail = e.target.value;
                            if (!newMail) return;

                            const updatedParts = Array.from(new Set([
                              ...(selectedProcesso.participantes || []),
                              newMail
                            ]));

                            const updatedRoles = {
                              ...((selectedProcesso as any).participanteRoles || {}),
                              [newMail.toLowerCase()]: "editor"
                            };

                            apiFetch(`/api/processos/${selectedProcesso.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                participantes: updatedParts,
                                participanteRoles: updatedRoles
                              })
                            }).then(res => {
                              if (res.ok) {
                                res.json().then(data => {
                                  setProcessos(prev => prev.map(p => p.id === data.id ? data : p));
                                  setSelectedProcesso(data);
                                  fetchData(); // Force immediate cache and system sync
                                });
                              }
                              e.target.value = "";
                            });
                          }}
                          className="w-full bg-[#131B2E] border border-slate-700 hover:border-slate-600 rounded px-2 py-1 text-[10px] text-slate-300 focus:border-indigo-500 font-semibold cursor-pointer outline-none"
                        >
                          <option value="">➕ Adicionar participante...</option>
                          {participantesDisponiveis
                            .filter(u => 
                              u.email.toLowerCase() !== selectedProcesso.responsavel?.toLowerCase() &&
                              !(selectedProcesso.participantes || []).includes(u.email)
                            )
                            .map(u => (
                              <option key={u.id} value={u.email}>
                                {u.nome} ({u.email})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description block */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Descrição do Processo</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#0F172A] border border-[#334155] rounded-lg p-3 whitespace-pre-wrap">
                    {selectedProcesso.descricao || "Nenhuma descrição operacional provida."}
                  </p>
                </div>

                {/* Attachments Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Anexos / Documentos</h4>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-medium transition-colors"
                    >
                      <Paperclip className="h-3 w-3" /> Anexar Arquivo
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleAttachFileSimulation}
                      className="hidden" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    {(!selectedProcesso.anexos || selectedProcesso.anexos.length === 0) ? (
                      <p className="text-xs text-slate-400 italic bg-[#0F172A] rounded-lg p-3 text-center border border-[#334155]">Nenhum certificado, PDF ou planilha anexado.</p>
                    ) : (
                      selectedProcesso.anexos.map(anx => {
                        const fileFormatText = anx.tipo ? anx.tipo.toUpperCase() : "OUTROS";
                        return (
                          <div 
                            key={anx.id} 
                            onClick={() => handleDownloadAttachment(anx)}
                            className="flex items-center justify-between p-2.5 bg-[#0F172A] border border-[#334155] rounded-lg hover:bg-slate-800 hover:border-indigo-500/35 active:scale-[0.99] transition-all text-xs cursor-pointer select-none group"
                            title={`Clique para baixar ou abrir: ${anx.nome}`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <FileText className="h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                              <div className="truncate">
                                <p className="font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">{anx.nome}</p>
                                <span className="text-[10px] text-slate-400 block">{fileFormatText} • por {displayUserName(anx.usuario)}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="text-[11px] text-indigo-400 font-extrabold hover:text-indigo-300 group-hover:underline ml-2 flex-shrink-0"
                            >
                              Visualizar
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Real-time Collaboration Comments Block */}
                <div className="space-y-3.5 border-t border-[#334155] pt-4">
                  <h4 className="text-xs font-semibold text-slate-405 uppercase tracking-wide flex items-center gap-1">
                    💬 Comentários e Alinhamentos ({comentarios.length})
                  </h4>

                  {/* Comment list */}
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {comentarios.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-2">Sem comentários aqui. Seja o primeiro a apoiar!</p>
                    ) : (
                      comentarios.map(com => (
                        <div key={com.id} className="bg-[#0F172A] border border-[#334155] rounded-lg p-2.5 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-200">{com.usuarioNome}</span>
                            <span className="text-slate-400">{new Date(com.data).toLocaleString("pt-BR", {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-xs text-slate-300 font-normal leading-normal">
                            {/* Simple text parser to format @user names nicely */}
                            {com.texto.split(" ").map((word, idx) => {
                              if (word.startsWith("@")) {
                                return (
                                  <span key={idx} className="text-indigo-400 font-bold bg-indigo-950/50 px-1 rounded">
                                    {word}{" "}
                                  </span>
                                );
                              }
                              return word + " ";
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Form input for comment */}
                  <form onSubmit={handleAddComment} className="space-y-2 relative">
                    <div className="relative">
                      <textarea
                        ref={commentInputRef}
                        rows={2}
                        value={newCommentText}
                        onChange={handleCommentTextChange}
                        placeholder="Digite um comentário... Use @NomeUsuario para mencioná-lo no fluxo."
                        className="w-full bg-[#0F172A] border border-[#334155] hover:border-[#3B82F6] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 text-white font-medium placeholder-[#94A3B8] rounded-xl p-3 text-xs transition-all duration-200 outline-none resize-none"
                      />

                      {/* Mention popup dropdown suggestions trigger */}
                      {showMentionDropdown && mentionQuery !== null && (
                        <div className="absolute left-0 bottom-full mb-1 w-full bg-slate-900 border border-[#334155] rounded-lg shadow-xl z-50 max-h-36 overflow-y-auto">
                          <div className="bg-slate-950 px-2.5 py-1 text-[10px] font-semibold text-slate-400 border-b border-[#334155]">
                            Mencione membros vinculados ou administradores:
                          </div>
                          {participantesDisponiveis
                            .filter(u => {
                              const isMaster = u.perfil === "admin_master" || u.tipo_usuario === "MASTER";
                              const displayName = isMaster ? `${u.nome} (MASTER ADM)` : u.nome;
                              const matchesQuery = displayName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
                                                   u.email.toLowerCase().includes(mentionQuery.toLowerCase());
                              if (!matchesQuery) return false;

                              // Only show users who currently have access to the selected process
                              return checkUserHasAccess(u, selectedProcesso);
                            })
                            .map(u => {
                              const isMaster = u.perfil === "admin_master" || u.tipo_usuario === "MASTER";
                              const displayName = isMaster ? `${u.nome} (MASTER ADM)` : u.nome;
                              return (
                                <div
                                  key={u.id}
                                  onClick={() => insertMention(u.email)}
                                  className="px-3 py-1.5 hover:bg-slate-800 cursor-pointer text-xs flex flex-col border-b border-slate-800 last:border-0"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-200">{displayName}</span>
                                    {isMaster && (
                                      <span className="text-[9px] bg-indigo-950 text-[#818CF8] px-1.5 py-0.5 rounded border border-indigo-700/50 font-bold font-mono">
                                        MASTER ADM
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium">{u.email}</span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-indigo-400 font-medium animate-none">
                        Atalho: digite @ e veja membros.
                      </span>
                      <button 
                        type="submit"
                        className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg flex items-center gap-1 font-bold text-xs shadow-sm transition-all"
                      >
                        <Send className="h-3 w-3" /> Enviar
                      </button>
                    </div>
                  </form>
                </div>

                {/* Audit & Process History block */}
                <div className="border-t border-[#334155] pt-4 space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <Archive className="h-3.5 w-3.5 text-slate-400" /> Histórico Operacional Completo
                  </h4>

                  <div className="space-y-3.5 pl-2 relative border-l border-[#334155] mt-2">
                    {historico.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Sem registros de histórico até o momento.</p>
                    ) : (
                      historico.map(h => (
                        <div key={h.id} className="relative pl-4 text-xs">
                          {/* Dot accent */}
                          <span className="absolute -left-[13px] top-1.5 h-1.5 w-1.5 rounded-full bg-slate-500 ring-4 ring-slate-900" />
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="font-medium text-slate-300">{h.usuario}</span>
                            <span>•</span>
                            <span>{new Date(h.data).toLocaleString("pt-BR")}</span>
                          </div>
                          <p className="text-slate-300 mt-0.5">
                            <span className="font-semibold text-slate-200">{h.acao}:</span> {h.detalhes}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mentions Confirmation Popup */}
      <AnimatePresence>
        {mentionPrompt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-705 rounded-xl p-5 max-w-sm w-full shadow-2xl relative space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="bg-amber-955/20 p-2.5 rounded-full border border-amber-600/40 text-amber-400 flex-shrink-0">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Acesso de Participante</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Controle de Segurança Kanban</p>
                </div>
              </div>
              
              <div className="space-y-2 bg-[#0F172A] border border-slate-800 rounded-lg p-3.5 text-xs text-slate-350">
                <p className="font-semibold text-amber-440 flex items-center gap-1.5">
                  ⚠️ O usuário não possui acesso ao processo.
                </p>
                <p className="text-slate-300 font-medium mt-1">
                  Membro: <span className="text-slate-100 font-bold">{mentionPrompt.user.nome || mentionPrompt.user.email}</span>
                </p>
                <p className="text-slate-400 leading-relaxed text-[11px] mt-1.5">
                  Deseja adicionar este usuário como participante para que ele possa receber notificações, visualizações e menções correlacionadas ao processo?
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={declineAddMentionedParticipant}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-302 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  Não
                </button>
                <button
                  onClick={() => confirmAddMentionedParticipant(mentionPrompt.user)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition"
                >
                  Sim
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />

    </div>
  );
}
