import React, { useState } from 'react';
import { Sidebar, type TabType } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardPage } from './pages/DashboardPage';
import { ValidadorPage } from './pages/ValidadorPage';
import { ClientesPage } from './pages/ClientesPage';
import { RestricoesPage } from './pages/RestricoesPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { ParametrosPage } from './pages/ParametrosPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [menuMobileAberto, setMenuMobileAberto] = useState<boolean>(false);
  const [sidebarRecolhida, setSidebarRecolhida] = useState<boolean>(false);
  const [clienteParaAvaliarId, setClienteParaAvaliarId] = useState<string | null>(null);

  // Estados para armazenar os filtros iniciais ao navegar para Restrições
  const [filtroStatusInicialRestricoes, setFiltroStatusInicialRestricoes] = useState<string>('TODOS');
  const [filtroTipoInicialRestricoes, setFiltroTipoInicialRestricoes] = useState<string>('TODOS');

  const navegarParaAvaliacao = (clienteId: string) => {
    setClienteParaAvaliarId(clienteId);
    setActiveTab('validador');
  };

  // Função de navegação com suporte a filtros pré-selecionados (Status e Tipo)
  const navegarParaAba = (aba: TabType, filtroStatus?: string, filtroTipo?: string) => {
    setFiltroStatusInicialRestricoes(filtroStatus || 'TODOS');
    setFiltroTipoInicialRestricoes(filtroTipo || 'TODOS');
    setActiveTab(aba);
  };

  const getTitulo = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Painel de Controle';
      case 'validador':
        return 'Avaliação de Risco';
      case 'clientes':
        return 'Gestão de Clientes';
      case 'restricoes':
        return 'Gestão de Restrições';
      case 'relatorios':
        return 'Relatórios';
      case 'parametros':
        return 'Políticas de Crédito';
      default:
        return 'Sistema Financeiro Banestes';
    }
  };

  return (
    <div className="bg-slate-50 text-slate-800 antialiased h-screen flex overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          // Ao mudar de aba pelo menu lateral, reseta os filtros para o padrão
          setFiltroStatusInicialRestricoes('TODOS');
          setFiltroTipoInicialRestricoes('TODOS');
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
            <RestricoesPage
              statusInicial={filtroStatusInicialRestricoes}
              tipoInicial={filtroTipoInicialRestricoes}
            />
          )}

          {activeTab === 'relatorios' && (
            <RelatoriosPage />
          )}

          {activeTab === 'parametros' && (
            <ParametrosPage />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;