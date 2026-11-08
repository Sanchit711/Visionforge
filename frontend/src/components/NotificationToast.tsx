import React from 'react';
import { useAppStore } from '../stores/useAppStore';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useAppStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {notifications.map((n) => {
        const Icon =
          n.type === 'success'
            ? CheckCircle2
            : n.type === 'error'
            ? XCircle
            : n.type === 'warning'
            ? AlertTriangle
            : Info;

        const iconColor =
          n.type === 'success'
            ? 'text-emerald-500'
            : n.type === 'error'
            ? 'text-rose-500'
            : n.type === 'warning'
            ? 'text-amber-500'
            : 'text-[#0071e3]';

        return (
          <div
            key={n.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border border-[#e5e5ea] dark:border-white/10 bg-white/95 dark:bg-[#161f30]/95 backdrop-blur-xl shadow-xl shadow-black/10 dark:shadow-black/40 transition-all duration-300 animate-slide-in"
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white leading-tight">{n.title}</div>
              {n.message && <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words">{n.message}</div>}
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
