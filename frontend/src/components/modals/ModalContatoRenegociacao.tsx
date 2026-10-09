import React from 'react';
import type { Cliente } from '../../services/clienteService';
import type { RestricaoResponseDTO } from '../../services/restricaoService';
import { formatarTelefone } from './ModalCliente';
import { formatarCpfCnpj } from '../../pages/ClientesPage';

interface ModalContatoRenegociacaoProps {
  aberto: boolean;
  cliente: Cliente | null;
  restricao: RestricaoResponseDTO | null;
  onFechar: () => void;
}

export const ModalContatoRenegociacao: React.FC<ModalContatoRenegociacaoProps> = ({
  aberto,
  cliente,
  restricao,
  onFechar,
}) => {
  if (!aberto || !cliente) return null;

  const isBaixada = restricao?.status === 'BAIXADA';

  const telFormatado = formatarTelefone(cliente.telefone || '');
  const telNumeros = (cliente.telefone || '').replace(/\D/g, '');

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

  const valorFormatado = formatarMoeda(restricao?.valor || 0);

  // Mensagem contextual para o WhatsApp dependendo do status
  const textoMensagem = isBaixada
    ? `Olá ${cliente.nome}, aqui é do Banestes. Confirmamos que a sua restrição de ${restricao?.tipoCodigo || 'pendência'} no valor de ${valorFormatado} consta como REGULARIZADA/QUITADA em nosso sistema. Caso necessite do termo de quitação ou de suporte adicional, estamos à disposição.`
    : `Olá ${cliente.nome}, aqui é do setor de Negociação e Risco do Banestes. Constatamos um apontamento de ${restricao?.tipoCodigo || 'pendência'} no valor de ${valorFormatado} e temos condições especiais para regularização imediata do seu cadastro. Como podemos prosseguir?`;

  const linkWhatsApp = `https://wa.me/55${telNumeros}?text=${encodeURIComponent(textoMensagem)}`;

  // Montagem estruturada do endereço
  const enderecoPartes = [
    cliente.logradouro ? `${cliente.logradouro}${cliente.numero ? `, ${cliente.numero}` : ''}` : '',
    cliente.complemento,
    cliente.bairro,
    cliente.cidade && cliente.uf ? `${cliente.cidade} - ${cliente.uf}` : cliente.cidade,
    cliente.cep ? `CEP: ${cliente.cep}` : '',
  ].filter(Boolean);

  const enderecoCompleto = enderecoPartes.length > 0 ? enderecoPartes.join(', ') : 'Endereço não cadastrado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      <div className="fixed inset-0 bg-[#081c30]/75 backdrop-blur-xs transition-opacity" onClick={onFechar} />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 text-left">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-poppins mb-1 ${
                isBaixada
                  ? 'bg-emerald-100 text-[#00874c]'
                  : 'bg-[#004b87]/10 text-[#004b87]'
              }`}
            >
              {isBaixada ? 'Histórico de Quitação & Atendimento' : 'Central de Cobrança & Negociação'}
            </div>
            <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
              Dados do Proponente para Contato
            </h3>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Card Resumo do Débito Selecionado */}
          {restricao && (
            <div
              className={`p-3.5 border rounded-xl flex items-center justify-between ${
                isBaixada
                  ? 'bg-emerald-50/80 border-emerald-200/90'
                  : 'bg-amber-50/80 border-amber-200/90'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider font-poppins ${
                      isBaixada ? 'text-[#00874c]' : 'text-amber-800'
                    }`}
                  >
                    {isBaixada ? 'Apontamento Liquidado' : 'Apontamento Ativo'}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      isBaixada
                        ? 'bg-emerald-200/70 text-[#00703f]'
                        : 'bg-amber-200/70 text-amber-900'
                    }`}
                  >
                    {restricao.status}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                  {restricao.tipoCodigo} • {restricao.dataOcorrencia || 'Sem data'}
                </span>
              </div>

              <div className="text-right">
                <span
                  className={`text-[10px] block font-medium ${
                    isBaixada ? 'text-[#00874c]' : 'text-amber-700'
                  }`}
                >
                  {isBaixada ? 'Valor Quitado' : 'Valor Pendente'}
                </span>
                <span
                  className={`text-sm font-bold font-poppins ${
                    isBaixada ? 'text-[#00703f]' : 'text-amber-900'
                  }`}
                >
                  {valorFormatado}
                </span>
              </div>
            </div>
          )}

          {/* Dados Cadastrais */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-poppins">
                Nome / Razão Social
              </span>
              <p className="text-sm font-bold text-slate-800">{cliente.nome}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-poppins">
                  Documento
                </span>
                <p className="text-xs font-mono text-slate-700 font-semibold">{formatarCpfCnpj(cliente.documento)}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-poppins">
                  Tipo de Cadastro
                </span>
                <p className="text-xs text-slate-700 font-semibold">{cliente.tipoPessoa || 'PF'}</p>
              </div>
            </div>
          </div>

          {/* Canais de Comunicação */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-poppins font-bold uppercase tracking-wider text-[#004b87]">
              Canais Diretos de Acionamento
            </h4>

            {/* Telefone / WhatsApp */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#00874c] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Telefone</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">{telFormatado || 'Não cadastrado'}</span>
                </div>
              </div>

              {telNumeros && (
                <a
                  href={linkWhatsApp}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-[#00874c] hover:bg-[#00703f] text-white rounded-lg text-xs font-bold font-poppins transition-all flex items-center gap-1.5 shadow-xs"
                >
                  {isBaixada ? 'Notificar Quitação' : 'Acionar WhatsApp'}
                </a>
              )}
            </div>

            {/* E-mail */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#e8f3fa] text-[#004b87] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">E-mail</span>
                  <span className="text-xs font-medium text-slate-800 truncate max-w-[220px] block" title={cliente.email || ''}>
                    {cliente.email || 'Não cadastrado'}
                  </span>
                </div>
              </div>

              {cliente.email && (
                <a
                  href={`mailto:${cliente.email}?subject=${encodeURIComponent(
                    isBaixada ? 'Banestes - Comprovante de Quitação' : 'Banestes - Regularização de Restrição'
                  )}`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold font-poppins transition-colors"
                >
                  Enviar E-mail
                </a>
              )}
            </div>

            {/* Endereço */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Endereço Residencial/Comercial</span>
                <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{enderecoCompleto}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onFechar}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors font-poppins"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};