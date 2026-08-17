import React, { useEffect, useState } from "react";
import { FileX, X } from "lucide-react";
import { DOCUMENT_UNAVAILABLE_EVENT } from "../lib/documents";

export default function DocumentNotificationCenter() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;
    const showNotification = () => {
      setVisible(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setVisible(false), 5000);
    };

    window.addEventListener(DOCUMENT_UNAVAILABLE_EVENT, showNotification);
    return () => {
      window.removeEventListener(DOCUMENT_UNAVAILABLE_EVENT, showNotification);
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-4 z-[200] w-[min(390px,calc(100vw-2rem))] rounded-xl border border-amber-500/25 bg-slate-900 p-4 shadow-2xl shadow-black/40">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
          <FileX className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">Documento não disponível</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">Nenhum documento foi anexado a este registro.</p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-white"
          aria-label="Fechar notificação"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
