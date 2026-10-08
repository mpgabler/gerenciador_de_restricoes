import React, { useState, useEffect } from 'react';
import { clienteService, type Cliente } from '../services/clienteService';
import { ModalCliente } from '../components/modals/ModalCliente';

interface ClientesPageProps {
  onAvaliarCliente: (clienteId: string) => void;
}

export const ClientesPage: React.FC<ClientesPageProps> = ({ onAvaliarCliente }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    setCarregando(true);
    try {
      const lista = await clienteService.listarTodos();
      setClientes(lista);
    } catch (e) {
      console.error('Falha ao listar clientes:', e);
    } finally {
      setCarregando(false);
    }
  };

  const clientesFiltrados = clientes.filter((c) => {
    const termo = busca.trim().toLowerCase();
    const digitos = busca.replace(/\D/g, '');
    const docDigitos = (c.documento || '').replace(/\D/g, '');

    const matchNome = (c.nome || '').toLowerCase().includes(termo);
    const matchDoc =
      (c.documento || '').toLowerCase().includes(termo) ||
      (digitos.length > 0 && docDigitos.includes(digitos));

    return matchNome || matchDoc;
  });

  return (
    <div className="space-y-6 font-sans">
      <section className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        {/* CABEÇALHO */}
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">Gestão de Clientes</h3>
            <p className="text-sm text-slate-500">
              Total: <strong className="text-[#081c30] font-semibold">{clientes.length}</strong> clientes cadastrados.
            </p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="px-4 py-2 bg-[#004b87] hover:bg-[#003a6b] text-white font-poppins font-medium text-sm rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs active:scale-[0.99]"
          >
            <svg className="w-4 h-4 text-[#009ee3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Novo Cliente
          </button>
        </div>

        {/* BARRA DE PESQUISA */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 text-left">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF/CNPJ..."
            className="w-full sm:w-96 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] transition-all"
          />
        </div>

        {/* TABELA DE CLIENTES */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5 font-poppins">Nome / Razão Social</th>
                <th className="px-6 py-3.5 font-poppins">Documento</th>
                <th className="px-6 py-3.5 font-poppins">Tipo</th>
                <th className="px-6 py-3.5 font-poppins">E-mail</th>
                <th className="px-6 py-3.5 text-right font-poppins">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {carregando ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-[#004b87] border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-xs font-medium">Carregando clientes...</p>
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-sans">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-[#e8f3fa]/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{c.nome}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{c.documento}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 text-xs font-semibold bg-[#e8f3fa] text-[#004b87] rounded-md border border-[#004b87]/20">
                        {c.tipoPessoa || 'PF'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{c.email || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onAvaliarCliente(c.id)}
                        className="px-3 py-1.5 bg-[#e8f3fa] hover:bg-[#004b87] text-[#004b87] hover:text-white border border-[#004b87]/30 font-medium text-xs rounded-lg transition-all duration-150 inline-flex items-center gap-1.5 shadow-2xs font-sans"
                      >
                        Avaliar Risco
                        <svg className="w-3.5 h-3.5 text-[#009ee3]" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ModalCliente
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSucesso={() => carregarClientes()}
      />
    </div>
  );
};