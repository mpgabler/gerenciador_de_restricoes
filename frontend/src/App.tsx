import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, RotateCw, Check, PlusCircle } from 'lucide-react';
import { clienteService, restricaoService, motorService } from './services/api';
import { ModalNovaRestricao } from './components/ModalNovaRestricao';
import type { Cliente, Restricao, DecisaoTransacao } from './types';

export default function App() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [decisao, setDecisao] = useState<DecisaoTransacao | null>(null);
  const [restricoes, setRestricoes] = useState<Restricao[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState<boolean>(false);

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    try {
      const data: any = await clienteService.listar();
      // Extrai os dados seja uma lista direta [...] ou um Page do Spring Data (.content)
      const lista: Cliente[] = Array.isArray(data) ? data : (data?.content ?? []);
      
      setClientes(lista);
      if (lista.length > 0 && !clienteSelecionado) {
        setClienteSelecionado(lista[0].id);
      }
    } catch {
      setErro('Falha ao conectar à API Spring Boot. Verifique se o backend está rodando.');
    }
  };

  const avaliarCliente = async (id: string) => {
    if (!id) return;
    setCarregando(true);
    setErro(null);

    // 1. Carrega as restrições da tabela
    try {
      const resRestricoes = await restricaoService.listarPorCliente(id);
      setRestricoes(Array.isArray(resRestricoes) ? resRestricoes : []);
    } catch (e: any) {
      console.error('Falha ao listar restrições:', e?.response || e);
    }

    // 2. Avalia o parecer no motor de decisão
    try {
      const resDecisao = await motorService.avaliar(id);
      setDecisao(resDecisao);
    } catch (e: any) {
      console.error('Falha ao avaliar no motor:', e?.response || e);
      setErro(e.response?.data?.message || e.response?.data?.erro || 'Erro ao avaliar regras de negócio.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (clienteSelecionado) {
      avaliarCliente(clienteSelecionado);
    }
  }, [clienteSelecionado]);

  const handleBaixa = async (restricaoId: string) => {
    try {
      await restricaoService.darBaixa(restricaoId);
      if (clienteSelecionado) {
        await avaliarCliente(clienteSelecionado);
      }
    } catch {
      setErro('Erro ao realizar a baixa da restrição.');
    }
  };

  const clienteAtual = Array.isArray(clientes)
    ? clientes.find((c) => c.id === clienteSelecionado)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="text-emerald-500 w-7 h-7" />
              Sistema de Gestão de Restrições
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Motor de Decisão & Compliance Transacional
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={clienteSelecionado}
              onChange={(e) => setClienteSelecionado(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {Array.isArray(clientes) && clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.documento})
                </option>
              ))}
            </select>

            <button
              onClick={() => avaliarCliente(clienteSelecionado)}
              disabled={carregando}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
              title="Recarregar"
            >
              <RotateCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {erro && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-sm">
            {erro}
          </div>
        )}

        {/* Card do Motor de Decisão */}
        {decisao && (
          <div
            className={`border rounded-xl p-6 transition-all ${
              decisao.status === 'LIBERADO'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {decisao.status === 'LIBERADO' ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 flex-shrink-0" />
                ) : (
                  <ShieldAlert className="w-10 h-10 text-rose-400 flex-shrink-0" />
                )}
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider opacity-75">
                    Parecer do Motor
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    {decisao.status === 'LIBERADO' ? 'Transação Liberada' : 'Transação Bloqueada'}
                  </h2>
                </div>
              </div>

              <span
                className={`text-xs px-3 py-1 font-semibold rounded-full border ${
                  decisao.status === 'LIBERADO'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {decisao.status}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Justificativas & Regras Acionadas:
              </p>
              <ul className="space-y-1">
                {decisao.motivos.map((motivo, index) => (
                  <li key={index} className="text-sm flex items-center gap-2 text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                    {motivo}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Histórico de Restrições */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Ocorrências & Restrições</h3>
              <p className="text-xs text-slate-400">Total: {restricoes.length} registradas</p>
            </div>

            <button
              onClick={() => setModalAberto(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Adicionar Restrição
            </button>
          </div>

          {restricoes.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Nenhuma restrição registrada para este cliente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-800/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Data Ocorrência</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {restricoes.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{r.tipoCodigo}</td>
                      <td className="px-4 py-3">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r.valor) || 0)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{r.dataOcorrencia}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            r.status === 'ATIVA'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-700/50 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'ATIVA' && (
                          <button
                            onClick={() => handleBaixa(r.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Dar Baixa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      {/* Modal Conectado */}
      {clienteAtual && (
        <ModalNovaRestricao
          clienteId={clienteAtual.id}
          clienteNome={clienteAtual.nome}
          isOpen={modalAberto}
          onClose={() => setModalAberto(false)}
          onSuccess={() => avaliarCliente(clienteSelecionado)}
        />
      )}
    </div>
  );
}