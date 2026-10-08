import React from 'react';

interface TopbarProps {
  titulo: string;
  onAbrirMenuMobile?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ titulo, onAbrirMenuMobile }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 md:px-6 flex items-center justify-between shrink-0 font-sans">
      <div className="flex items-center gap-3 min-w-0 text-left">
        {onAbrirMenuMobile && (
          <button
            onClick={onAbrirMenuMobile}
            className="md:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:text-banestes-primary hover:bg-slate-100 focus:outline-none transition-colors"
            aria-label="Abrir menu Banestes"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h1 className="font-poppins text-base md:text-lg font-bold text-slate-800 tracking-tight truncate text-left">
          {titulo}
        </h1>
      </div>

      {/*<div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] md:text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Conexão Segura Banestes
        </span>
      </div>*/}
    </header>
  );
};