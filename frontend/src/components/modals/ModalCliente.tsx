import React, { useState, useEffect } from 'react';
import { clienteService, type Cliente } from '../../services/clienteService';

interface ModalClienteProps {
  aberto: boolean;
  clienteParaEditar?: Cliente | null;
  onFechar: () => void;
  onSucesso: () => void;
}

const formatarCpf = (valor: string): string => {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatarCnpjAlfanumerico = (valor: string): string => {
  const limpo = valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
  return limpo
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, '.$1/$2')
    .replace(/\/([A-Z0-9]{4})([A-Z0-9]{1,2})$/, '$1-$2');
};

export const formatarTelefone = (valor: string): string => {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 10) {
    return digitos
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digitos
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

export const ModalCliente: React.FC<ModalClienteProps> = ({
  aberto,
  clienteParaEditar,
  onFechar,
  onSucesso,
}) => {
  const [nome, setNome] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PF');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  // Endereço detalhado
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const modoEdicao = Boolean(clienteParaEditar);

  useEffect(() => {
    if (aberto) {
      if (clienteParaEditar) {
        setNome(clienteParaEditar.nome || '');
        const tipo = (clienteParaEditar.tipoPessoa || (clienteParaEditar.documento.length > 11 ? 'PJ' : 'PF')) as 'PF' | 'PJ';
        setTipoPessoa(tipo);
        setDocumento(
          tipo === 'PJ'
            ? formatarCnpjAlfanumerico(clienteParaEditar.documento || '')
            : formatarCpf(clienteParaEditar.documento || '')
        );
        setEmail(clienteParaEditar.email || '');
        setTelefone(formatarTelefone(clienteParaEditar.telefone || ''));
        setLogradouro(clienteParaEditar.logradouro || '');
        setNumero(clienteParaEditar.numero || '');
        setComplemento(clienteParaEditar.complemento || '');
        setBairro(clienteParaEditar.bairro || '');
        setCidade(clienteParaEditar.cidade || '');
        setUf(clienteParaEditar.uf || '');
        setCep(clienteParaEditar.cep || '');
      } else {
        setNome('');
        setTipoPessoa('PF');
        setDocumento('');
        setEmail('');
        setTelefone('');
        setLogradouro('');
        setNumero('');
        setComplemento('');
        setBairro('');
        setCidade('');
        setUf('');
        setCep('');
      }
      setErro(null);
      setSalvando(false);
    }
  }, [aberto, clienteParaEditar]);

  if (!aberto) return null;

  const lidarComMudancaDocumento = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (tipoPessoa === 'PF') {
      const digitos = raw.replace(/\D/g, '').slice(0, 11);
      setDocumento(formatarCpf(digitos));
    } else {
      const limpo = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
      setDocumento(formatarCnpjAlfanumerico(limpo));
    }
  };

  const lidarComMudancaTipo = (novoTipo: 'PF' | 'PJ') => {
    setTipoPessoa(novoTipo);
    if (novoTipo === 'PF') {
      const digitos = documento.replace(/\D/g, '').slice(0, 11);
      setDocumento(formatarCpf(digitos));
    } else {
      const limpo = documento.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
      setDocumento(formatarCnpjAlfanumerico(limpo));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const docLimpo = documento.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (tipoPessoa === 'PF' && docLimpo.length !== 11) {
      setErro('O CPF deve conter exatamente 11 dígitos numéricos.');
      return;
    }
    if (tipoPessoa === 'PJ' && docLimpo.length !== 14) {
      setErro('O CNPJ deve conter exatamente 14 caracteres.');
      return;
    }

    setSalvando(true);

    const payload = {
      nome: nome.trim(),
      documento: docLimpo,
      tipoPessoa,
      email: email.trim() || null,
      telefone: telefone.replace(/\D/g, '').trim() || null,
      logradouro: logradouro.trim() || null,
      numero: numero.trim() || null,
      complemento: complemento.trim() || null,
      bairro: bairro.trim() || null,
      cidade: cidade.trim() || null,
      uf: uf.trim().toUpperCase() || null,
      cep: cep.replace(/\D/g, '').trim() || null,
    };

    try {
      if (modoEdicao && clienteParaEditar?.id) {
        await clienteService.atualizar(clienteParaEditar.id, payload);
      } else {
        await clienteService.criar(payload);
      }

      onSucesso();
      onFechar();
    } catch (err: any) {
      console.error('Falha ao salvar cliente:', err);
      const data = err.response?.data;
      const msg = data?.message || data?.error || 'Erro ao registrar cliente. Verifique se o backend está aceitando o método PUT e os campos informados.';
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#081c30]/70 backdrop-blur-xs transition-opacity" onClick={onFechar} />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl max-h-[90vh] overflow-y-auto font-sans z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="sticky top-0 bg-white/95 backdrop-blur-xs p-5 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
              {modoEdicao ? 'Atualizar Dados do Proponente' : 'Novo Cliente'}
            </h3>
            <p className="text-xs text-slate-500">
              Dados cadastrais e canais de contato para negociação no Banestes.
            </p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {tipoPessoa === 'PJ' ? 'Razão Social / Nome Fantasia' : 'Nome Completo'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={tipoPessoa === 'PJ' ? 'Ex.: Comercial Vitória LTDA' : 'Ex.: Maria Souza'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                value={tipoPessoa}
                onChange={(e) => lidarComMudancaTipo(e.target.value as 'PF' | 'PJ')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-sans"
              >
                <option value="PF">Pessoa Física (PF)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                {tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={documento}
                onChange={lidarComMudancaDocumento}
                placeholder={tipoPessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-mono tracking-wide"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Telefone / WhatsApp (Negociação)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={telefone}
                onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                placeholder="(27) 99999-9999"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@dominio.com.br"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-sans"
              />
            </div>
          </div>

          {/* DADOS DE ENDEREÇO ESTRUTURADO */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-poppins font-bold uppercase tracking-wider text-[#004b87] mb-2.5">
              Endereço Residencial / Comercial
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  Logradouro (Rua, Av.)
                </label>
                <input
                  type="text"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Ex.: Av. Princesa Isabel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex.: 574"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Ex.: Apto 302, Bloco B"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex.: Centro"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex.: Vitória"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  UF
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  placeholder="ES"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  maxLength={9}
                  value={cep}
                  onChange={(e) => {
                    const digitos = e.target.value.replace(/\D/g, '').slice(0, 8);
                    const formatado = digitos.replace(/^(\d{5})(\d)/, '$1-$2');
                    setCep(formatado);
                  }}
                  placeholder="29010-904"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !nome.trim() || !documento.trim()}
              className="px-5 py-2 bg-[#004b87] hover:bg-[#003a6b] text-white rounded-xl text-xs font-semibold font-poppins transition-all shadow-xs disabled:opacity-50 active:scale-[0.99] flex items-center gap-1.5"
            >
              {salvando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : modoEdicao ? (
                'Salvar Alterações'
              ) : (
                'Cadastrar Proponente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};