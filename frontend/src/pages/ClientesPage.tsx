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

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.documento.includes(busca)
  );

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Gestão de Clientes</h3>
            <p className="text-sm text-slate-500">
              Total: <strong className="text-slate-700">{clientes.length}</strong> clientes cadastrados.
            </p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Novo Cliente
          </button>
        </div>

        {/* BARRA DE PESQUISA */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-200">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF/CNPJ..."
            className="w-full sm:w-96 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* TABELA */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Nome / Razão Social</th>
                <th className="px-6 py-3.5">Documento</th>
                <th className="px-6 py-3.5">Tipo</th>
                <th className="px-6 py-3.5">E-mail</th>
                <th className="px-6 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {carregando ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Carregando clientes...</td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum cliente encontrado.</td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{c.nome}</td>
                    <td className="px-6 py-4 text-slate-600">{c.documento}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {c.tipoPessoa || 'PF'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{c.email || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onAvaliarCliente(c.id)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium text-xs rounded-lg transition-colors"
                      >
                        Avaliar Risco
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