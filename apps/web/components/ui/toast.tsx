"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, XCircle, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let toastQueue: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

function emitChange() {
  listeners.forEach((listener) => listener(toastQueue));
}

export function toast(message: string, type: ToastType = "info", duration = 5000) {
  const id = Math.random().toString(36).substr(2, 9);
  const newToast: Toast = { id, type, message, duration };

  toastQueue = [...toastQueue, newToast];
  emitChange();

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
}

export function dismissToast(id: string) {
  toastQueue = toastQueue.filter((t) => t.id !== id);
  emitChange();
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-md">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
  };

  const bgColors = {
    success: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    error: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    warning: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
    info: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  };

  return (
    <div
      className={`${bgColors[t.type]} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right duration-300`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
      <p className="flex-1 text-sm text-foreground">{t.message}</p>
      <button
        onClick={() => dismissToast(t.id)}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
