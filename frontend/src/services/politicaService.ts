export interface PoliticaRiscoDTO {
    id: string;
    versao: string;
    tetoInadimplencia: number;
    diasAtrasoMaximo: number;
    vigenciaInicio: string; // ISO String
    vigenciaFim?: string | null;
    justificativa: string;
    criadoPor: string;
    ativo: boolean;
  }
  
  const STORAGE_KEY = 'bantestes_politicas_risco';
  
  // Dados padrão iniciais (v1.0 estabelecida)
  const politicasIniciais: PoliticaRiscoDTO[] = [
    {
      id: 'pol-1',
      versao: 'v1.0',
      tetoInadimplencia: 5000.0,
      diasAtrasoMaximo: 90,
      vigenciaInicio: '2026-01-01T00:00:00.000Z',
      vigenciaFim: null,
      justificativa: 'Norma de apetite a risco inicial homologada pelo Comitê de Compliance.',
      criadoPor: 'analista@bantestes.com.br',
      ativo: true,
    },
  ];
  
  export const politicaService = {
    async listarTodas(): Promise<PoliticaRiscoDTO[]> {
      const dados = localStorage.getItem(STORAGE_KEY);
      if (!dados) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(politicasIniciais));
        return politicasIniciais;
      }
      return JSON.parse(dados);
    },
  
    async obterVigente(): Promise<PoliticaRiscoDTO> {
      const lista = await this.listarTodas();
      const vigente = lista.find((p) => p.ativo && p.vigenciaFim === null);
      return vigente || lista[0];
    },
  
    async cadastrarNovaVersao(dados: {
      tetoInadimplencia: number;
      diasAtrasoMaximo: number;
      justificativa: string;
      criadoPor: string;
    }): Promise<PoliticaRiscoDTO> {
      const lista = await this.listarTodas();
      const agora = new Date().toISOString();
  
      // Encerra a vigência da regra anterior a partir do momento atual
      const listaAtualizada = lista.map((p) => {
        if (p.ativo && p.vigenciaFim === null) {
          return {
            ...p,
            ativo: false,
            vigenciaFim: agora,
          };
        }
        return p;
      });
  
      const proximaVersaoNum = lista.length + 1;
      const novaPolitica: PoliticaRiscoDTO = {
        id: `pol-${Date.now()}`,
        versao: `v1.${proximaVersaoNum - 1}`,
        tetoInadimplencia: dados.tetoInadimplencia,
        diasAtrasoMaximo: dados.diasAtrasoMaximo,
        vigenciaInicio: agora,
        vigenciaFim: null,
        justificativa: dados.justificativa,
        criadoPor: dados.criadoPor,
        ativo: true,
      };
  
      listaAtualizada.unshift(novaPolitica);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(listaAtualizada));
      return novaPolitica;
    },
  };