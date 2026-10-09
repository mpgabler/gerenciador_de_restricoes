import React, { useState } from 'react';
import { Sidebar, type TabType } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardPage } from './pages/DashboardPage';
import { ValidadorPage } from './pages/ValidadorPage';
import { ClientesPage } from './pages/ClientesPage';
import { RestricoesPage } from './pages/RestricoesPage';
import { RelatoriosPage } from './pages/RelatoriosPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [menuMobileAberto, setMenuMobileAberto] = useState<boolean>(false);
  const [sidebarRecolhida, setSidebarRecolhida] = useState<boolean>(false);
  const [clienteParaAvaliarId, setClienteParaAvaliarId] = useState<string | null>(null);

  // Estado para armazenar o filtro inicial ao navegar para Restrições
  const [filtroStatusInicialRestricoes, setFiltroStatusInicialRestricoes] = useState<string>('TODOS');

  const navegarParaAvaliacao = (clienteId: string) => {
    setClienteParaAvaliarId(clienteId);
    setActiveTab('validador');
  };

  // Função de navegação com suporte a filtro pré-selecionado
  const navegarParaAba = (aba: TabType, filtroStatus?: string) => {
    if (filtroStatus) {
      setFiltroStatusInicialRestricoes(filtroStatus);
    } else {
      setFiltroStatusInicialRestricoes('TODOS');
    }
    setActiveTab(aba);
  };

  const getTitulo = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Painel de Controle & Visão Geral';
      case 'validador':
        return 'Motor de Decisão & Compliance';
      case 'clientes':
        return 'Gestão de Clientes';
      case 'restricoes':
        return 'Gestão Global de Restrições';
      case 'relatorios':
        return 'Relatórios & Inteligência de Risco';
      default:
        return 'Sistema Financeiro Banestes';
    }
  };

  return (
    <div className="bg-slate-50 text-slate-800 antialiased h-screen flex overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          // Ao mudar de aba pelo menu lateral, reseta o filtro inicial para o padrão
          setFiltroStatusInicialRestricoes('TODOS');
          setActiveTab(tab);
        }}
        menuAbertoMobile={menuMobileAberto}
        onFecharMobile={() => setMenuMobileAberto(false)}
        recolhido={sidebarRecolhida}
        onToggleRecolhido={() => setSidebarRecolhida((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          titulo={getTitulo()}
          onAbrirMenuMobile={() => setMenuMobileAberto(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'dashboard' && (
            <DashboardPage onNavigate={navegarParaAba} />
          )}

          {activeTab === 'validador' && (
            <ValidadorPage clienteIdInicial={clienteParaAvaliarId} />
          )}

          {activeTab === 'clientes' && (
            <ClientesPage onAvaliarCliente={navegarParaAvaliacao} />
          )}

          {activeTab === 'restricoes' && (
            <RestricoesPage statusInicial={filtroStatusInicialRestricoes} />
          )}

          {activeTab === 'relatorios' && (
            <RelatoriosPage />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;