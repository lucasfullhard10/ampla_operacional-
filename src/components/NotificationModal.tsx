import React from "react";

export interface NotificationType {
  type: "success" | "error";
  message: string;
  onConfirm?: () => void;
}

export interface ConfirmType {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface NotificationModalProps {
  notification: NotificationType | null;
  onClose: () => void;
}

export function NotificationModal({ notification, onClose }: NotificationModalProps) {
  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl max-w-sm w-full mx-4 shadow-2xl text-center space-y-4">
        <div className="flex justify-center">
          {notification.type === "success" ? (
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center text-2xl border border-emerald-500/20">
              ✓
            </div>
          ) : (
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-2xl border border-rose-500/20">
              ✗
            </div>
          )}
        </div>
        <div>
          <h3 className="text-white font-bold text-base">
            {notification.type === "success" ? "Sucesso!" : "Erro!"}
          </h3>
          <p className="whitespace-pre-line text-xs text-slate-300 mt-2 font-sans leading-relaxed">
            {notification.message}
          </p>
        </div>
        <button
          onClick={() => {
            if (notification.onConfirm) notification.onConfirm();
            onClose();
          }}
          className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold transition font-sans"
        >
          OK
        </button>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  confirm: ConfirmType | null;
  onClose: () => void;
}

export function ConfirmModal({ confirm, onClose }: ConfirmModalProps) {
  if (!confirm) return null;

  const [processing, setProcessing] = React.useState(false);

  const handleConfirm = async () => {
    if (processing) return;
    try {
      setProcessing(true);
      await confirm.onConfirm();
    } catch (e) {
      console.error("Erro na confirmação do modal:", e);
    } finally {
      setProcessing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl max-w-sm w-full mx-4 shadow-2xl space-y-4 text-center">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center text-2xl border border-amber-500/20">
            ?
          </div>
        </div>
        <div>
          <h3 className="text-white font-bold text-base">Confirmar</h3>
          <p className="text-xs text-slate-300 mt-2 font-sans leading-relaxed">
            {confirm.message}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            id="modal-btn-cancelar"
            type="button"
            disabled={processing}
            onClick={() => {
              if (confirm.onCancel) confirm.onCancel();
              onClose();
            }}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="modal-btn-confirmar"
            type="button"
            disabled={processing}
            onClick={handleConfirm}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            {processing ? "Processando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
