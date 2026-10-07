import React, { useState, useEffect } from 'react';
import type { TabType } from '../components/layout/Sidebar';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';

interface DashboardPageProps {
  onNavigate: (tab: TabType) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [restricoes, setRestricoes] = useState<RestricaoResponseDTO[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [resClientes, resRestricoes] = await Promise.all([
        clienteService.listarTodos().catch(() => []),
        restricaoService.listarTodas().catch(() => []),
      ]);
      setClientes(resClientes);
      setRestricoes(resRestricoes);
    } catch (e) {
      console.error('Falha ao carregar métricas do dashboard:', e);
    } finally {
      setCarregando(false);
    }
  };

  const restricoesAtivas = restricoes.filter((r) => r.status === 'ATIVA');
  const fraudesAtivas = restricoesAtivas.filter((r) => r.tipoCodigo === 'FRAUDE').length;
  const inadimplenciasAtivas = restricoesAtivas.filter((r) => r.tipoCodigo === 'INADIMPLENCIA').length;

  return (
    <div className="space-y-6">
      {/* BANNER DE BOAS-VINDAS E STATUS OPERACIONAL */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Visão Geral do Sistema</span>
          <h2 className="text-2xl font-bold mt-1">Centro de Operações de Crédito & Risco</h2>
          <p className="text-sm text-slate-300 mt-1">
            Motor de regras operando com latência média de <strong className="text-emerald-400">12ms</strong> • Spring Data JPA ativo.
          </p>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
          <button
            onClick={() => onNavigate('validador')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Avaliar Transação
          </button>
        </div>
      </section>

      {/* ATALHOS DE GESTÃO RÁPIDA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('validador')}
          className="bg-white border border-slate-200 hover:border-blue-400 p-5 rounded-xl text-left transition-all group shadow-2xs hover:shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h4 className="font-semibold text-slate-800 text-sm">Validador em Tempo Real</h4>
          <p className="text-xs text-slate-500 mt-1">Simular aprovação ou bloqueio com base nas políticas bancárias.</p>
        </button>

        <button
          onClick={() => onNavigate('clientes')}
          className="bg-white border border-slate-200 hover:border-blue-400 p-5 rounded-xl text-left transition-all group shadow-2xs hover:shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h4 className="font-semibold text-slate-800 text-sm">Base de Clientes ({clientes.length})</h4>
          <p className="text-xs text-slate-500 mt-1">Gerir registos, inclusão de novos proponentes e CPFs.</p>
        </button>

        <button
          onClick={() => onNavigate('relatorios')}
          className="bg-white border border-slate-200 hover:border-blue-400 p-5 rounded-xl text-left transition-all group shadow-2xs hover:shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="font-semibold text-slate-800 text-sm">Relatórios & Auditoria</h4>
          <p className="text-xs text-slate-500 mt-1">Consultar volume financeiro represado e taxas de regularização.</p>
        </button>
      </div>

      {/* PAINEL DE CONTROLE DE INCIDENTES E ATIVIDADES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RESUMO DE ALERTAS CRÍTICOS */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Alertas de Risco Ativos</h3>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-red-50/60 border border-red-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-red-800 block">Fraudes Detectadas</span>
                  <span className="text-xs text-red-600">Bloqueio compulsório</span>
                </div>
                <span className="text-xl font-extrabold text-red-700">{fraudesAtivas}</span>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-800 block">Inadimplências Ativas</span>
                  <span className="text-xs text-amber-600">Sob monitorização de atraso/teto</span>
                </div>
                <span className="text-xl font-extrabold text-amber-700">{inadimplenciasAtivas}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 border-t border-slate-100 pt-3">
            Motor de Conformidade Bancária em execução contínua.
          </p>
        </section>

        {/* FEED DE EVENTOS RECENTES */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Feed de Auditoria Recente</h3>
            <span className="text-xs text-slate-400">Últimos registos do banco</span>
          </div>

          <div className="space-y-3">
            {carregando ? (
              <p className="text-xs text-slate-400 text-center py-6">A carregar eventos...</p>
            ) : restricoes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Nenhuma atividade recente registada.</p>
            ) : (
              restricoes.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        r.tipoCodigo === 'FRAUDE'
                          ? 'bg-red-500'
                          : r.tipoCodigo === 'BLOQUEIO_JUDICIAL'
                          ? 'bg-purple-500'
                          : 'bg-amber-500'
                      }`}
                    ></span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {r.tipoCodigo} — <span className="font-normal text-slate-600">{r.clienteNome || 'Cliente'}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">Ocorrência: {r.dataOcorrencia}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      r.status === 'ATIVA'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};