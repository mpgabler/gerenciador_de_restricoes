# export_models.py
# Pipeline de calibração, treinamento e exportação ONNX de modelos preditivos de risco de crédito (PF e PJ)

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from skl2onnx import to_onnx

# Fixação da semente pseudoaleatória para assegurar reprodutibilidade estatística exata dos dados e das árvores
np.random.seed(42)

def gerar_base_sintetica(n_amostras, eh_pj=False):
    """
    Gera uma massa sintética supervisionada e balanceada para treinamento de risco de crédito.
    
    Matriz de entrada X (6 features contínuas e binárias):
      0. dias_atraso: Dias de mora da obrigação mais antiga
      1. qtd_ativas: Quantidade total de restrições em aberto
      2. valor_inad: Volume financeiro total acumulado em mora (R$)
      3. total_baixadas: Histórico positivo de obrigações liquidadas/pagas
      4. tem_fraude: Indicador binário de suspeita/confirmação de fraude (1=Sim, 0=Não)
      5. tem_judicial: Indicador binário de penhora/bloqueio judicial ativo (1=Sim, 0=Não)
      
    Vetor de saída y:
      0 = Adimplente / Baixo Risco (Concessão recomendada)
      1 = Inadimplente / Alto Risco (Default provável ou impedimento)
    """
    X = []
    y = []

    for _ in range(n_amostras):
        # 1. Simulação estocástica de apontamentos de alta severidade regulatória
        # 8% de probabilidade de fraude ativa e 6% de mandado judicial
        tem_fraude = 1 if np.random.rand() < 0.08 else 0
        tem_judicial = 1 if np.random.rand() < 0.06 else 0
        
        # Casos com restrição crítica: Risco de Default mandatório (Classe 1)
        # Garante que o modelo correlacione diretamente crimes e bloqueios a alto risco
        if tem_fraude or tem_judicial:
            dias = int(np.random.choice([0, 15, 60, 120]))
            qtd = int(np.random.randint(1, 6))
            valor = float(np.random.choice([0.0, 5000.0, 25000.0]))
            bx = int(np.random.randint(0, 5))
            X.append([dias, qtd, valor, bx, tem_fraude, tem_judicial])
            y.append(1)
            continue

        # 2. Segmentação estratificada para perfis regulares de proponentes
        perfil = np.random.rand()
        
        if perfil < 0.50:  
            # [50% da base] Perfil Excelente / Sem apontamentos impeditivos
            # Proponentes com zero débitos ativos e histórico positivo de pontualidade
            dias = 0
            qtd = 0
            valor = 0.0
            bx = int(np.random.randint(0, 15)) # Demonstra capacidade prévia de quitação
            classe = 0                        # Baixo Risco
            
        elif perfil < 0.80:  
            # [30% da base] Perfil Moderado / Alerta Operacional
            # Atrasos pontuais ou rotatividade comum de fluxo de caixa
            dias = int(np.random.randint(5, 45))
            qtd = int(np.random.randint(1, 3))
            
            # PJs suportam valores nominais maiores decorrentes do giro de duplicatas
            mult = 5.0 if eh_pj else 1.0
            valor = float(np.random.randint(500, 3000) * mult)
            bx = int(np.random.randint(1, 8))
            
            # Tolerância temporal: atrasos abaixo de 30 dias mantêm o risco sob controle
            classe = 0 if dias < 30 else 1
            
        else:  
            # [20% da base] Perfil Crítico / Inadimplência Severa
            # Débitos de longo curso e descontrole de passivos
            dias = int(np.random.randint(60, 180))
            qtd = int(np.random.randint(2, 7))
            
            # Multiplicador financeiro elevado para simular dívidas empresariais
            mult = 10.0 if eh_pj else 1.0
            valor = float(np.random.randint(6000, 25000) * mult)
            bx = int(np.random.randint(0, 3))
            classe = 1 # Alto Risco / Default

        # Adiciona o registro à base com as flags de fraude e judicial zeradas
        X.append([dias, qtd, valor, bx, 0, 0])
        y.append(classe)

    # Conversão estrita de tipos para compatibilidade com os tipos primitivos do C++/ONNX Runtime
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)

# ==============================================================================
# 1. TREINAMENTO E EXPORTAÇÃO: MODELO PESSOA FÍSICA (PF)
# ==============================================================================
X_pf, y_pf = gerar_base_sintetica(600, eh_pj=False)

# Configuração dos hiperparâmetros de governança:
# - n_estimators=40: Resolução granular de 2.5% por voto na PD (1/40)
# - max_depth=6: Previne sobreajuste (overfitting) e suaviza a curva do score (0 a 1000)
# - max_features=None: Força cada nó a enxergar as 6 variáveis, impedindo cegueira a fraudes
clf_pf = RandomForestClassifier(n_estimators=40, max_depth=6, max_features=None, random_state=42)
clf_pf.fit(X_pf, y_pf)

# Exportação para ONNX:
# - target_opset=17: Alinha a versão dos operadores para suporte nativo na runtime da JVM
# - options={'zipmap': False}: Suprime a saída em mapas de dicionário, emitindo float[][] puro
onx_pf = to_onnx(clf_pf, X_pf[:1], target_opset=17, options={'zipmap': False})
with open("modelo_pf.onnx", "wb") as f:
    f.write(onx_pf.SerializeToString())

# ==============================================================================
# 2. TREINAMENTO E EXPORTAÇÃO: MODELO PESSOA JURÍDICA (PJ)
# ==============================================================================
X_pj, y_pj = gerar_base_sintetica(600, eh_pj=True)

# Treinamento do modelo corporativo com tolerância financeira adaptada a empresas
clf_pj = RandomForestClassifier(n_estimators=40, max_depth=6, max_features=None, random_state=42)
clf_pj.fit(X_pj, y_pj)

# Exportação binária serializada do modelo PJ
onx_pj = to_onnx(clf_pj, X_pj[:1], target_opset=17, options={'zipmap': False})
with open("modelo_pj.onnx", "wb") as f:
    f.write(onx_pj.SerializeToString())

print("Modelos calibrados 'modelo_pf.onnx' e 'modelo_pj.onnx' exportados com sucesso!")