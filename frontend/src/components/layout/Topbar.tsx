import React from 'react';

interface TopbarProps {
  titulo?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ titulo = 'Motor de Decisão & Compliance' }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800">{titulo}</h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          API Online (v1.2)
        </span>
      </div>
    </header>
  );
};