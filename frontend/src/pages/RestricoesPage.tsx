import React, { useState, useEffect, useMemo } from 'react';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';
import { ModalNovaRestricaoGlobal } from '../components/modals/ModalNovaRestricaoGlobal';

export const RestricoesPage: React.FC = () => {
  const [restricoes, setRestricoes] = useState<RestricaoResponseDTO[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [resRestricoes, resClientes] = await Promise.all([
        restricaoService.listarTodas().catch(() => []),
        clienteService.listarTodos().catch(() => []),
      ]);
      setRestricoes(resRestricoes);
      setClientes(resClientes);
    } catch (e) {
      console.error('Falha ao carregar dados:', e);
    } finally {
      setCarregando(false);
    }
  };

  const handleDarBaixa = async (id: string) => {
    try {
      await restricaoService.darBaixa(id);
      carregarDados();
    } catch (e) {
      console.error('Erro ao dar baixa:', e);
    }
  };

  // Mapeamento por ID
  const mapaClientesPorId = useMemo(() => {
    const map = new Map<string, Cliente>();
    clientes.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });
    return map;
  }, [clientes]);

  // Mapeamento por Nome (Fallback de resiliência caso clienteId venha ausente no DTO)
  const mapaClientesPorNome = useMemo(() => {
    const map = new Map<string, Cliente>();
    clientes.forEach((c) => {
      if (c.nome) map.set(c.nome.trim().toLowerCase(), c);
    });
    return map;
  }, [clientes]);

  // Recupera o documento (CPF/CNPJ) e o tipo de pessoa do cliente
  const obterDadosCliente = (r: RestricaoResponseDTO) => {
    const porId = r.clienteId ? mapaClientesPorId.get(r.clienteId) : undefined;
    const porNome = r.clienteNome ? mapaClientesPorNome.get(r.clienteNome.trim().toLowerCase()) : undefined;
    const cliente = porId || porNome;

    const documento =
      (r as any).documento ||
      (r as any).clienteDocumento ||
      (r as any).cpf ||
      cliente?.documento ||
      (cliente as any)?.cpf ||
      '';

    const tipoPessoa = cliente?.tipoPessoa || (documento.replace(/\D/g, '').length > 11 ? 'PJ' : 'PF');

    return { cliente, documento, tipoPessoa };
  };

  // Filtragem combinada resiliente (CPF/CNPJ numérico e com máscara, tipo e status)
  const restricoesFiltradas = useMemo(() => {
    const termoBusca = busca.trim().toLowerCase();
    const digitosBusca = busca.replace(/\D/g, '');

    return restricoes.filter((r) => {
      const { documento } = obterDadosCliente(r);
      const documentoDigitos = documento.replace(/\D/g, '');

      const matchNome = (r.clienteNome || '').toLowerCase().includes(termoBusca);
      const matchTipo = r.tipoCodigo.toLowerCase().includes(termoBusca);
      const matchDocumento =
        (documento && documento.toLowerCase().includes(termoBusca)) ||
        (digitosBusca.length > 0 && documentoDigitos.includes(digitosBusca));

      const atendeBusca = !termoBusca || matchNome || matchTipo || matchDocumento;
      const atendeTipo = filtroTipo === 'TODOS' || r.tipoCodigo === filtroTipo;
      const atendeStatus = filtroStatus === 'TODOS' || r.status === filtroStatus;

      return atendeBusca && atendeTipo && atendeStatus;
    });
  }, [restricoes, mapaClientesPorId, mapaClientesPorNome, busca, filtroTipo, filtroStatus]);

  const totalAtivas = restricoes.filter((r) => r.status === 'ATIVA').length;
  const totalBaixadas = restricoes.filter((r) => r.status === 'BAIXADA').length;

  return (
    <div className="space-y-6 font-sans">
      <section className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden text-left">
        {/* CABEÇALHO */}
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">Gestão Global de Restrições</h3>
            <p className="text-sm text-slate-500">
              Total: <strong className="text-[#081c30] font-semibold">{restricoes.length}</strong> ocorrências (
              <span className="text-amber-600 font-medium">{totalAtivas} ativas</span>,{' '}
              <span className="text-[#00874c] font-medium">{totalBaixadas} regularizadas</span>).
            </p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="px-4 py-2 bg-[#004b87] hover:bg-[#003a6b] text-white font-poppins font-medium text-sm rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs active:scale-[0.99]"
          >
            <svg className="w-4 h-4 text-[#009ee3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Nova Restrição
          </button>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex flex-col md:flex-row gap-3 text-left">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, CPF/CNPJ ou tipo..."
            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] transition-all"
          />

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] transition-all font-sans"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="FRAUDE">Fraude</option>
            <option value="INADIMPLENCIA">Inadimplência</option>
            <option value="BLOQUEIO_JUDICIAL">Bloqueio Judicial</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] transition-all font-sans"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVA">Ativa</option>
            <option value="BAIXADA">Baixada (Regularizada)</option>
          </select>
        </div>

        {/* TABELA DE OCORRÊNCIAS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5 font-poppins">Cliente</th>
                <th className="px-6 py-3.5 font-poppins">Tipo de Restrição</th>
                <th className="px-6 py-3.5 font-poppins">Valor Atrasado</th>
                <th className="px-6 py-3.5 font-poppins">Data Ocorrência</th>
                <th className="px-6 py-3.5 font-poppins">Status</th>
                <th className="px-6 py-3.5 text-right font-poppins">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {carregando ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-[#004b87] border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-xs font-medium">Carregando restrições...</p>
                  </td>
                </tr>
              ) : restricoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-sans">
                    Nenhuma restrição encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                restricoesFiltradas.map((r) => {
                  const isAtiva = r.status === 'ATIVA';
                  const { documento, tipoPessoa } = obterDadosCliente(r);
                  const valorFormatado = new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(r.valor || 0);

                  return (
                    <tr key={r.id} className="hover:bg-[#e8f3fa]/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {r.clienteNome || 'Cliente'}
                        {documento && (
                          <span className="block text-xs font-normal text-slate-400 font-mono">
                            {tipoPessoa === 'PJ' ? 'CNPJ: ' : 'CPF: '}
                            {documento}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <span className="inline-flex items-center gap-1.5 font-sans">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              r.tipoCodigo === 'FRAUDE'
                                ? 'bg-red-500'
                                : r.tipoCodigo === 'BLOQUEIO_JUDICIAL'
                                ? 'bg-purple-500'
                                : 'bg-amber-500'
                            }`}
                          ></span>
                          {r.tipoCodigo}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{valorFormatado}</td>
                      <td className="px-6 py-4 text-slate-500">{r.dataOcorrencia}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                            isAtiva
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-emerald-100 text-[#00874c] border-emerald-200'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAtiva ? (
                          <button
                            onClick={() => handleDarBaixa(r.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#00874c] border border-emerald-300 font-medium text-xs rounded-lg transition-colors shadow-2xs font-sans"
                          >
                            Dar Baixa
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3 py-1.5 bg-slate-100 text-slate-400 font-medium text-xs rounded-lg cursor-not-allowed font-sans"
                          >
                            Regularizada
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ModalNovaRestricaoGlobal
        aberto={modalAberto}
        clientes={clientes}
        onFechar={() => setModalAberto(false)}
        onSucesso={() => carregarDados()}
      />
    </div>
  );
};