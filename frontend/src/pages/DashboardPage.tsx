import React, { useState, useEffect, useMemo } from 'react';
import type { TabType } from '../components/layout/Sidebar';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';

interface DashboardPageProps {
  onNavigate: (tab: TabType, filtroStatus?: string) => void;
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

  // Lista do Feed das Últimas Ocorrências com filtro e ordenação decrescente (mais recente primeiro)
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
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#081c30] via-[#002855] to-[#004b87] rounded-2xl p-6 md:p-8 text-white shadow-md border border-[#009ee3]/20 text-left">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <svg className="w-80 h-80 text-[#009ee3]" viewBox="0 0 200 200" fill="currentColor">
            <path d="M120 40 L160 40 L160 80 L140 80 L140 68 L70 138 L56 124 L126 54 L114 54 Z" />
            <circle cx="60" cy="140" r="12" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#009ee3]/15 border border-[#009ee3]/30 text-[#009ee3] text-xs font-semibold uppercase tracking-wider mb-3 font-poppins">
              <span className="w-2 h-2 rounded-full bg-[#009ee3] animate-pulse"></span>
              Mesa de Risco & Compliance • Bantestes
            </div>
            <h2 className="font-poppins text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Painel de Decisão & Inteligência de Crédito
            </h2>
            <p className="text-sm text-slate-200 mt-2 leading-relaxed">
              Monitoramento em tempo real de apontamentos normativos, conformidade de proponentes e validação transacional com latência de{' '}
              <strong className="text-[#009ee3] font-bold">12ms</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('validador')}
              className="px-5 py-3 bg-[#009ee3] hover:bg-[#008ecb] text-[#081c30] rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] font-poppins"
            >
              <svg className="w-4 h-4 text-[#081c30]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Avaliar Transação
            </button>
            <button
              onClick={() => onNavigate('relatorios')}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all border border-white/15 backdrop-blur-xs font-poppins"
            >
              Auditoria Completa
            </button>
          </div>
        </div>
      </section>

      {/* 2. KPIS EXECUTIVOS (3 CARDS COM REDIRECIONAMENTO NO CARD DE RISCO) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        {/* KPI 1: Exposição em Risco (Clicável com direcionamento para restrições) */}
        <div
          onClick={() => onNavigate('restricoes', 'ATIVA')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigate('restricoes', 'ATIVA');
            }
          }}
          className="group cursor-pointer bg-white border border-slate-200/90 hover:border-amber-400 rounded-xl p-5 shadow-xs hover:shadow-md hover:bg-amber-50/20 transition-all duration-150 active:scale-[0.99] flex flex-col justify-between"
          title="Clique para acessar diretamente os clientes com pendências ativas"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="font-poppins text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-700 transition-colors">
                Exposição em Risco
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 group-hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="font-poppins text-2xl font-extrabold text-[#081c30] mt-3 group-hover:text-amber-900 transition-colors">
              {formatarMoeda(metricas.totalValorAtivo)}
            </p>
            <p className="text-[11px] text-amber-700 mt-2 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Montante ativo retido por restrições
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-700 font-semibold font-poppins">
            <span>Ver clientes com restrições</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>

        {/* KPI 2: Saúde da Carteira */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs hover:border-[#004b87]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-poppins text-xs font-bold uppercase tracking-wider text-slate-500">
                Saúde da Carteira
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#00874c] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="font-poppins text-2xl font-extrabold text-[#00874c] mt-3">
              {metricas.taxaSaudeCarteira}%
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              <strong className="text-slate-700">{metricas.clientesRegulares}</strong> de {clientes.length} clientes sem pendências
            </p>
          </div>
        </div>

        {/* KPI 3: Ocorrências Ativas */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs hover:border-[#004b87]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-poppins text-xs font-bold uppercase tracking-wider text-slate-500">
                Apontamentos Vigentes
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="font-poppins text-2xl font-extrabold text-red-700 mt-3">
              {metricas.ativas.length}
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              {metricas.totalFraudes + metricas.totalJudiciais} impedimentos de bloqueio imediato
            </p>
          </div>
        </div>
      </div>

      {/* 3. GRÁFICOS ANALÍTICOS & FEED DE AUDITORIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* COMPOSIÇÃO DO RISCO ATIVO */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-poppins text-base font-bold text-slate-800">
                Composição do Risco Ativo
              </h3>
              <span className="text-xs text-slate-400 font-medium">Classificação</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Distribuição proporcional das restrições ativas que bloqueiam operações.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Inadimplência
                  </span>
                  <span className="text-slate-900 font-bold">{metricas.totalInadimplencias}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${metricas.ativas.length > 0 ? (metricas.totalInadimplencias / metricas.ativas.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Fraude Identificada
                  </span>
                  <span className="text-slate-900 font-bold">{metricas.totalFraudes}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${metricas.ativas.length > 0 ? (metricas.totalFraudes / metricas.ativas.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Bloqueio Judicial
                  </span>
                  <span className="text-slate-900 font-bold">{metricas.totalJudiciais}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${metricas.ativas.length > 0 ? (metricas.totalJudiciais / metricas.ativas.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Regularizações Baixadas:</span>
            <strong className="text-[#00874c] font-bold font-poppins">{metricas.baixadas.length} casos</strong>
          </div>
        </section>

        {/* FEED DE AUDITORIA COM FILTRO E DATA BR */}
        <section className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-poppins text-base font-bold text-slate-800">
                  Últimas Ocorrências Registradas
                </h3>
                <p className="text-xs text-slate-500">Trilha de auditoria das regras aplicadas aos proponentes.</p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* ABAS SELETORAS DE FILTRO */}
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-poppins">
                  <button
                    type="button"
                    onClick={() => setFiltroStatusFeed('TODOS')}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium ${filtroStatusFeed === 'TODOS'
                        ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Todas ({restricoes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatusFeed('ATIVA')}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${filtroStatusFeed === 'ATIVA'
                        ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-amber-700'
                      }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Ativas ({metricas.ativas.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatusFeed('BAIXADA')}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${filtroStatusFeed === 'BAIXADA'
                        ? 'bg-white text-[#00874c] shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-[#00874c]'
                      }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Baixadas ({metricas.baixadas.length})
                  </button>
                </div>

                <button
                  onClick={() => onNavigate('restricoes')}
                  className="text-xs text-[#004b87] hover:text-[#003a6b] font-semibold transition-colors flex items-center gap-1 font-poppins ml-2"
                >
                  Ver Todas
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {carregando ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block w-6 h-6 border-2 border-[#004b87] border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-xs font-medium">Carregando auditoria...</p>
                </div>
              ) : ultimasOcorrenciasFiltradas.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-sm font-semibold text-slate-600">Nenhum evento localizado</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Não há ocorrências {filtroStatusFeed === 'ATIVA' ? 'ativas' : filtroStatusFeed === 'BAIXADA' ? 'baixadas' : ''} no momento.
                  </p>
                </div>
              ) : (
                ultimasOcorrenciasFiltradas.map((r) => {
                  const isAtiva = r?.status === 'ATIVA';
                  const valorFormatado = formatarMoeda(r?.valor || 0);

                  return (
                    <div
                      key={r?.id || Math.random()}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-[#e8f3fa]/30 transition-all gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${r?.tipoCodigo === 'FRAUDE'
                              ? 'bg-red-500'
                              : r?.tipoCodigo === 'BLOQUEIO_JUDICIAL'
                                ? 'bg-purple-500'
                                : 'bg-amber-500'
                            }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-800 font-poppins">
                              {r?.tipoCodigo || 'OUTROS'}
                            </p>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-600 font-medium">{r?.clienteNome || 'Cliente'}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Ocorrência:{' '}
                            <span className="font-mono text-slate-600 font-medium">
                              {formatarDataBR(r?.dataOcorrencia)}
                            </span>
                            {' '}• Valor:{' '}
                            <strong className="text-slate-700">{valorFormatado}</strong>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`w-[76px] h-6 inline-flex items-center justify-center self-start sm:self-auto text-[11px] font-bold rounded-md border tracking-wide font-sans text-center shrink-0 ${isAtiva
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-100 text-[#00874c] border-emerald-200'
                          }`}
                      >
                        {r?.status || 'N/A'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};