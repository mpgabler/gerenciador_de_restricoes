import React from 'react';

export type TabType = 'dashboard' | 'validador' | 'clientes' | 'restricoes' | 'relatorios';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  menuAbertoMobile?: boolean;
  onFecharMobile?: () => void;
  recolhido?: boolean;
  onToggleRecolhido?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  menuAbertoMobile = false,
  onFecharMobile,
  recolhido = false,
  onToggleRecolhido,
}) => {
  const itensMenu = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'validador' as TabType,
      label: 'Validador de Risco',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'clientes' as TabType,
      label: 'Clientes',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'restricoes' as TabType,
      label: 'Restrições',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
    {
      id: 'relatorios' as TabType,
      label: 'Relatórios',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  const handleItemClick = (id: TabType) => {
    onSelectTab(id);
    if (onFecharMobile) onFecharMobile();
  };

  const renderConteudo = (isMobile: boolean) => {
    const modoRecolhido = !isMobile && recolhido;

    return (
      <div
        className={`flex flex-col h-full bg-[#081c30] text-white select-none transition-all duration-300 font-sans border-r border-slate-800/80 ${
          modoRecolhido ? 'w-20 p-3' : 'w-64 p-4'
        } ${isMobile ? 'w-64 p-4 shadow-2xl' : ''}`}
      >
        {/* LOGO INSTITUCIONAL BANTESTES COM A SETA ASCENDENTE */}
        <div
          className={`flex items-center pb-5 border-b border-slate-800/80 ${
            modoRecolhido ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Ícone estilizado com azul primário e ciano oficial */}
            <div className="relative w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#004b87] to-[#002855] flex items-center justify-center font-bold text-white text-lg shadow-sm border border-[#009ee3]/30">
              <span className="font-poppins font-extrabold tracking-tight">B</span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#009ee3] rounded-full border-2 border-[#081c30] animate-pulse" />
            </div>
            {!modoRecolhido && (
              <div className="min-w-0 text-left">
                <h2 className="font-poppins font-bold text-sm tracking-wide text-white truncate flex items-center gap-1">
                  BANTESTES
                  <svg className="w-3.5 h-3.5 text-[#009ee3] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414-1.414L14.586 7H13a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium truncate">
                  Risco & Compliance
                </p>
              </div>
            )}
          </div>

          {/* Fechar gaveta no mobile */}
          {isMobile && onFecharMobile && (
            <button
              onClick={onFecharMobile}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
              title="Fechar menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="flex-1 mt-5 space-y-1.5 text-left">
          {itensMenu.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                title={modoRecolhido ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition-all ${
                  modoRecolhido
                    ? 'justify-center py-3 px-0'
                    : 'gap-3 px-3.5 py-2.5 text-left'
                } ${
                  isActive
                    ? 'bg-[#004b87] text-white shadow-sm border-l-4 border-[#009ee3] font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-[#009ee3]' : 'text-slate-400'}>
                  {item.icon}
                </span>
                {!modoRecolhido && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* RODAPÉ COM BOTÃO RECOLHER E OPERADOR */}
        <div className="pt-3 border-t border-slate-800/80 space-y-3">
          {!isMobile && onToggleRecolhido && (
            <button
              onClick={onToggleRecolhido}
              className={`w-full flex items-center rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors ${
                modoRecolhido ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2 text-left'
              }`}
              title={modoRecolhido ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            >
              <svg className="w-4 h-4 shrink-0 text-[#009ee3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {modoRecolhido ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
              {!modoRecolhido && <span className="truncate">Recolher menu</span>}
            </button>
          )}

          <div
            className={`flex items-center text-left ${
              modoRecolhido ? 'justify-center' : 'gap-3 px-1'
            }`}
            title={modoRecolhido ? 'Operador de Risco (analista@bantestes.com.br)' : undefined}
          >
            <div className="w-8 h-8 shrink-0 rounded-full bg-slate-800 border border-[#009ee3]/40 flex items-center justify-center text-xs font-bold text-[#009ee3]">
              OP
            </div>
            {!modoRecolhido && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate font-poppins">Operador de Risco</p>
                <p className="text-[10px] text-slate-400 truncate">analista@bantestes.com.br</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <aside className="hidden md:flex shrink-0 h-full">
        {renderConteudo(false)}
      </aside>

      {menuAbertoMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-[#081c30]/70 backdrop-blur-xs transition-opacity"
            onClick={onFecharMobile}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {renderConteudo(true)}
          </div>
        </div>
      )}
    </>
  );
};