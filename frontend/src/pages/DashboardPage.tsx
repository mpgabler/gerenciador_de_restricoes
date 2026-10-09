import React, { useState, useEffect, useMemo } from 'react';
import type { TabType } from '../components/layout/Sidebar';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';

interface DashboardPageProps {
  onNavigate: (tab: TabType, filtroStatus?: string) => void;
  onAvaliarCliente?: (clienteId: string) => void;
}

// Converte YYYY-MM-DD para DD/MM/AAAA sem sofrer alteração de fuso horário
export const formatarDataBR = (dataStr?: string | null): string => {
  if (!dataStr) return '—';
  const limpo = dataStr.split('T')[0];
  const partes = limpo.split('-');
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return dataStr;
};

// Utilitário de máscara para consistência visual
export const formatarCpfCnpj = (valor: string): string => {
  const limpo = (valor || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
  const temLetra = /[A-Z]/.test(limpo);

  if (!temLetra && limpo.length <= 11) {
    return limpo
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')       .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return limpo
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, '.$1/$2')     .replace(/\/([A-Z0-9]{4})([A-Z0-9]{1,2})$/, '$1-$2');
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [restricoes, setRestricoes] = useState<RestricaoResponseDTO[]>([]);
  const [filtroStatusFeed, setFiltroStatusFeed] = useState<'TODOS' | 'ATIVA' | 'BAIXADA'>('TODOS');
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [resClientes, resRestricoes] = await Promise.all([
        clienteService.listarTodos().catch(() => []),
        restricaoService.listarTodas ? restricaoService.listarTodas().catch(() => []) : Promise.resolve([]),
      ]);

      const listaClientes: Cliente[] = Array.isArray(resClientes)
        ? resClientes
        : Array.isArray((resClientes as any)?.content)
        ? (resClientes as any).content
        : [];

      const listaRestricoes: RestricaoResponseDTO[] = Array.isArray(resRestricoes)
        ? resRestricoes
        : Array.isArray((resRestricoes as any)?.content)
        ? (resRestricoes as any).content
        : [];

      setClientes(listaClientes);
      setRestricoes(listaRestricoes);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setClientes([]);
      setRestricoes([]);
    } finally {
      setCarregando(false);
    }
  };

  // Métricas Executivas
  const metricas = useMemo(() => {
    const listaClientes = Array.isArray(clientes) ? clientes : [];
    const listaRestricoes = Array.isArray(restricoes) ? restricoes : [];

    const ativas = listaRestricoes.filter((r) => r?.status === 'ATIVA');
    const baixadas = listaRestricoes.filter((r) => r?.status === 'BAIXADA');

    const totalValorAtivo = ativas.reduce((acc, r) => acc + (r?.valor || 0), 0);
    const totalFraudes = ativas.filter((r) => r?.tipoCodigo === 'FRAUDE').length;
    const totalJudiciais = ativas.filter((r) => r?.tipoCodigo === 'BLOQUEIO_JUDICIAL').length;
    const totalInadimplencias = ativas.filter((r) => r?.tipoCodigo === 'INADIMPLENCIA').length;

    const idsClientesComRestricao = new Set(ativas.map((r) => r?.clienteId).filter(Boolean));
    const clientesRegulares = listaClientes.filter((c) => !idsClientesComRestricao.has(c?.id)).length;
    const taxaSaudeCarteira = listaClientes.length > 0
      ? ((clientesRegulares / listaClientes.length) * 100).toFixed(0)
      : '100';

    return {
      ativas,
      baixadas,
      totalValorAtivo,
      totalFraudes,
      totalJudiciais,
      totalInadimplencias,
      clientesRegulares,
      taxaSaudeCarteira,
    };
  }, [restricoes, clientes]);

  // Lista de Ocorrências com filtro e ordenação (mais recente primeiro)
  const ultimasOcorrenciasFiltradas = useMemo(() => {
    const listaSegura = Array.isArray(restricoes) ? restricoes : [];

    const filtradas = filtroStatusFeed === 'TODOS'
      ? listaSegura
      : listaSegura.filter((r) => r?.status === filtroStatusFeed);

    const ordenadas = [...filtradas].sort((a, b) => {
      const dataA = a?.dataOcorrencia || '';
      const dataB = b?.dataOcorrencia || '';
      return dataB.localeCompare(dataA);
    });

    return ordenadas.slice(0, 5);
  }, [restricoes, filtroStatusFeed]);

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. CABEÇALHO SUPERIOR */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#14213D] font-poppins">
            Visão geral do risco
          </h1>
          <p className="text-sm text-[#4A5875] mt-0.5">
            Mesa de Risco &amp; Compliance · atualizado hoje, {formatarDataBR(new Date().toISOString())}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('relatorios')}
            className="h-11 px-4.5 rounded-xl border border-[#CBD3E1] bg-white hover:bg-slate-50 text-[#14213D] text-sm font-semibold transition-all shadow-2xs font-poppins"
          >
            Auditoria completa
          </button>
          <button
            type="button"
            onClick={() => onNavigate('validador')}
            className="h-11 px-5 rounded-xl border-0 bg-[#004b87] hover:bg-[#003a6b] text-white text-sm font-semibold transition-all flex items-center gap-2 shadow-xs active:scale-[0.98] font-poppins"
          >
            <svg className="w-4 h-4 text-[#009ee3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Avaliar transação
          </button>
        </div>
      </header>

      {/* 2. ALERT STRIP (QUANDO HOUVER BLOQUEIO JUDICIAL OU FRAUDE) */}
      {metricas.totalJudiciais > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3.5 bg-[#FDECEC] border border-[#F2B8B8] rounded-xl p-4 text-left shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-[#9B1C1C] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold text-[#7A1414] block font-poppins">
                {metricas.totalJudiciais} {metricas.totalJudiciais === 1 ? 'bloqueio judicial exige' : 'bloqueios judiciais exigem'} ação imediata
              </span>
              <span className="text-xs text-[#7A1414]/90 block">
                Operações do proponente ficam impedidas até a regularização cadastral.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('restricoes', 'ATIVA')}
            className="px-3.5 py-1.5 text-xs font-bold text-[#8A1212] bg-white hover:bg-red-50 border border-[#D98C8C] rounded-lg transition-colors font-poppins shadow-2xs shrink-0"
          >
            Ver restrição
          </button>
        </div>
      )}

      {/* 3. KPIS EXECUTIVOS */}
      <section aria-label="Indicadores" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {/* KPI 1: Exposição em Risco */}
        <div
          onClick={() => onNavigate('restricoes', 'ATIVA')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate('restricoes', 'ATIVA')}
          className="group cursor-pointer bg-white border border-[#DDE3EE] hover:border-amber-400 rounded-xl p-5 shadow-xs hover:shadow-md hover:bg-amber-50/15 transition-all flex flex-col justify-between"
        >
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#4A5875] block font-poppins">
              EXPOSIÇÃO EM RISCO
            </span>
            <span className="text-2xl md:text-[28px] font-extrabold tracking-tight text-[#14213D] block mt-1.5 font-poppins tabular-nums">
              {formatarMoeda(metricas.totalValorAtivo)}
            </span>
            <span className="text-xs text-[#4A5875] mt-1 block">
              Montante ativo retido por restrições
            </span>
          </div>
          <span className="mt-3 text-xs font-bold text-[#004b87] group-hover:text-[#003a6b] font-poppins flex items-center gap-1 transition-colors">
            Ver clientes com restrições →
          </span>
        </div>

        {/* KPI 2: Apontamentos Vigentes */}
        <div
          onClick={() => onNavigate('restricoes', 'ATIVA')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate('restricoes', 'ATIVA')}
          className="group cursor-pointer bg-white border border-[#DDE3EE] hover:border-red-400 rounded-xl p-5 shadow-xs hover:shadow-md hover:bg-red-50/15 transition-all flex flex-col justify-between"
        >
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#4A5875] block font-poppins">
              APONTAMENTOS VIGENTES
            </span>
            <span className="text-2xl md:text-[28px] font-extrabold tracking-tight text-[#9B1C1C] block mt-1.5 font-poppins tabular-nums">
              {metricas.ativas.length}
            </span>
            <span className="text-xs text-[#4A5875] mt-1 block">
              {metricas.totalInadimplencias} inadimplências · {metricas.totalJudiciais} ordens judiciais
            </span>
          </div>
          <span className="mt-3 text-xs font-bold text-[#9B1C1C] group-hover:text-red-900 font-poppins flex items-center gap-1 transition-colors">
            Abrir fila de ativos →
          </span>
        </div>

        {/* KPI 3: Saúde da Carteira */}
        <div className="bg-white border border-[#DDE3EE] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#4A5875] block font-poppins">
              SAÚDE DA CARTEIRA
            </span>
            <span className="text-2xl md:text-[28px] font-extrabold tracking-tight text-[#0B6B3A] block mt-1.5 font-poppins tabular-nums">
              {metricas.taxaSaudeCarteira}%
            </span>
            <div className="h-2 rounded-full bg-[#E3E8F1] overflow-hidden my-2.5">
              <div
                className="h-full bg-[#0B6B3A] transition-all"
                style={{ width: `${metricas.taxaSaudeCarteira}%` }}
              ></div>
            </div>
            <span className="text-xs text-[#4A5875] block">
              {metricas.clientesRegulares} de {clientes.length} clientes sem pendências
            </span>
          </div>
        </div>

        {/* KPI 4: Regularizadas */}
        <div
          onClick={() => onNavigate('restricoes', 'BAIXADA')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate('restricoes', 'BAIXADA')}
          className="group cursor-pointer bg-white border border-[#DDE3EE] hover:border-emerald-400 rounded-xl p-5 shadow-xs hover:shadow-md hover:bg-emerald-50/15 transition-all flex flex-col justify-between"
        >
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#4A5875] block font-poppins">
              REGULARIZADAS
            </span>
            <span className="text-2xl md:text-[28px] font-extrabold tracking-tight text-[#14213D] block mt-1.5 font-poppins tabular-nums">
              {metricas.baixadas.length}
            </span>
            <span className="text-xs text-[#4A5875] mt-1 block">
              Baixas registradas no histórico
            </span>
          </div>
          <span className="mt-3 text-xs font-bold text-[#0B6B3A] group-hover:text-emerald-900 font-poppins flex items-center gap-1 transition-colors">
            Ver histórico →
          </span>
        </div>
      </section>

      {/* 4. ÁREA INFERIOR: TABELA DE OCORRÊNCIAS + COMPOSIÇÃO DO RISCO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-left items-start">
        {/* TABELA DE OCORRÊNCIAS RECENTES (SEM A COLUNA DE AÇÃO) */}
        <section
          aria-label="Ocorrências"
          className="lg:col-span-2 bg-white border border-[#DDE3EE] rounded-xl p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#14213D] font-poppins">
                  Ocorrências recentes
                </h2>
                <span className="text-xs text-[#4A5875]">
                  Trilha de auditoria das regras aplicadas aos proponentes
                </span>
              </div>

              {/* FILTROS POR SITUAÇÃO */}
              <div role="group" aria-label="Filtrar por situação" className="inline-flex p-1 bg-[#EEF1F7] rounded-xl text-xs font-poppins self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFiltroStatusFeed('TODOS')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                    filtroStatusFeed === 'TODOS'
                      ? 'bg-white text-[#14213D] shadow-2xs font-bold'
                      : 'text-[#4A5875] hover:text-[#14213D]'
                  }`}
                >
                  Todas ({restricoes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusFeed('ATIVA')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                    filtroStatusFeed === 'ATIVA'
                      ? 'bg-white text-[#8A1212] shadow-2xs font-bold'
                      : 'text-[#4A5875] hover:text-[#8A1212]'
                  }`}
                >
                  Ativas ({metricas.ativas.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusFeed('BAIXADA')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                    filtroStatusFeed === 'BAIXADA'
                      ? 'bg-white text-[#0B5C33] shadow-2xs font-bold'
                      : 'text-[#4A5875] hover:text-[#0B5C33]'
                  }`}
                >
                  Baixadas ({metricas.baixadas.length})
                </button>
              </div>
            </div>

            {/* TABELA DE 5 COLUNAS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#14213D]">
                <thead className="text-[11px] font-bold uppercase tracking-wider text-[#4A5875] border-b border-[#DDE3EE] font-poppins">
                  <tr>
                    <th className="py-2.5 px-3">TIPO</th>
                    <th className="py-2.5 px-3">PROPONENTE</th>
                    <th className="py-2.5 px-3">DATA</th>
                    <th className="py-2.5 px-3 text-right">VALOR</th>
                    <th className="py-2.5 px-3 text-right">SITUAÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F7]">
                  {carregando ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#4A5875] text-xs">
                        <div className="inline-block w-5 h-5 border-2 border-[#004b87] border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p>Carregando eventos...</p>
                      </td>
                    </tr>
                  ) : ultimasOcorrenciasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#4A5875] text-xs">
                        Nenhum registro encontrado para a situação selecionada.
                      </td>
                    </tr>
                  ) : (
                    ultimasOcorrenciasFiltradas.map((row) => {
                      const isAtiva = row.status === 'ATIVA';
                      return (
                        <tr key={row.id} className="hover:bg-[#F8FAFD] transition-colors">
                          <td className="py-3.5 px-3 font-semibold text-xs text-slate-800">
                            {row.tipoCodigo}
                          </td>
                          <td className="py-3.5 px-3 font-medium text-xs text-slate-800">
                            {row.clienteNome || 'Cliente'}
                          </td>
                          <td className="py-3.5 px-3 text-xs font-mono text-[#4A5875]">
                            {formatarDataBR(row.dataOcorrencia)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-xs tabular-nums text-slate-900">
                            {formatarMoeda(row.valor || 0)}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <span
                              className={`w-[74px] h-5.5 inline-flex items-center justify-center text-[10px] font-bold rounded-full tracking-wide font-sans ${
                                isAtiva
                                  ? 'bg-[#FFF0D1] text-[#7A4300]'
                                  : 'bg-[#DDF3E6] text-[#0B5C33]'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EEF1F7] flex justify-between items-center text-xs text-[#4A5875]">
            <span>Mostrando os 5 registros mais recentes</span>
            <button
              type="button"
              onClick={() => onNavigate('restricoes')}
              className="font-bold text-[#004b87] hover:text-[#003a6b] font-poppins"
            >
              Ver todas as ocorrências →
            </button>
          </div>
        </section>

        {/* COMPOSIÇÃO DO RISCO ATIVO (1 COLUNA) */}
        <section aria-label="Composição do risco" className="bg-white border border-[#DDE3EE] rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#14213D] font-poppins">
              Composição do risco ativo
            </h2>
            <span className="text-xs text-[#4A5875]">
              Restrições ativas que bloqueiam operações
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Inadimplência */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-[#14213D]">
                <span>Inadimplência</span>
                <span className="tabular-nums">
                  {metricas.totalInadimplencias} ·{' '}
                  {metricas.ativas.length > 0
                    ? Math.round((metricas.totalInadimplencias / metricas.ativas.length) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#E3E8F1] overflow-hidden">
                <div
                  className="h-full bg-[#C26A00] transition-all"
                  style={{
                    width: `${metricas.ativas.length > 0 ? (metricas.totalInadimplencias / metricas.ativas.length) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Bloqueio Judicial */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-[#14213D]">
                <span>Bloqueio judicial</span>
                <span className="tabular-nums">
                  {metricas.totalJudiciais} ·{' '}
                  {metricas.ativas.length > 0
                    ? Math.round((metricas.totalJudiciais / metricas.ativas.length) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#E3E8F1] overflow-hidden">
                <div
                  className="h-full bg-[#5B3FB5] transition-all"
                  style={{
                    width: `${metricas.ativas.length > 0 ? (metricas.totalJudiciais / metricas.ativas.length) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Fraude Identificada */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-[#14213D]">
                <span>Fraude identificada</span>
                <span className="tabular-nums">
                  {metricas.totalFraudes} ·{' '}
                  {metricas.ativas.length > 0
                    ? Math.round((metricas.totalFraudes / metricas.ativas.length) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#E3E8F1] overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all"
                  style={{
                    width: `${metricas.ativas.length > 0 ? (metricas.totalFraudes / metricas.ativas.length) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#EEF1F7] pt-3 text-xs text-[#4A5875] flex justify-between items-center">
            <span>Total de apontamentos ativos</span>
            <span className="font-bold text-[#14213D] tabular-nums font-poppins">
              {metricas.ativas.length}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};