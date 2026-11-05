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

        const colorClasses =
          n.type === 'success'
            ? 'border-emerald-500/50 bg-emerald-950/80 text-emerald-200'
            : n.type === 'error'
            ? 'border-rose-500/50 bg-rose-950/80 text-rose-200'
            : n.type === 'warning'
            ? 'border-amber-500/50 bg-amber-950/80 text-amber-200'
            : 'border-blue-500/50 bg-blue-950/80 text-blue-200';

        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-slide-in ${colorClasses}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm leading-tight text-white">{n.title}</div>
              {n.message && <div className="text-xs opacity-90 mt-1 leading-relaxed break-words">{n.message}</div>}
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-white/60 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
