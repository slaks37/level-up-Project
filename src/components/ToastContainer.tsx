import React from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';
import type { ToastItem } from '../types';

interface ToastContainerProps {
  toasts: ToastItem[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-3 sm:right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-1.5rem)] sm:w-full pointer-events-none">
      {toasts.map((toast) => {
        const style =
          toast.type === 'success'
            ? { border: 'border-l-emerald-600', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> }
            : toast.type === 'warning'
              ? { border: 'border-l-amber-500', icon: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" /> }
              : toast.type === 'error'
                ? { border: 'border-l-rose-600', icon: <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" /> }
                : { border: 'border-l-sky-600', icon: <Info className="w-4 h-4 text-sky-600 flex-shrink-0" /> };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white border border-slate-300 border-l-4 ${style.border} rounded shadow-lg p-3 text-xs font-semibold text-slate-800 flex items-center gap-2`}
          >
            {style.icon}
            <span className="leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
