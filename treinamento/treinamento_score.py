# export_models.py
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from skl2onnx import to_onnx

np.random.seed(42)

def gerar_base_sintetica(n_amostras, eh_pj=False):
    # Features: [dias_atraso, qtd_ativas, valor_inad, total_baixadas, tem_fraude, tem_judicial]
    X = []
    y = []

    for _ in range(n_amostras):
        tem_fraude = 1 if np.random.rand() < 0.08 else 0
        tem_judicial = 1 if np.random.rand() < 0.06 else 0
        
        # Casos com restrição crítica: risco de default compulsoriamente 1
        if tem_fraude or tem_judicial:
            dias = int(np.random.choice([0, 15, 60, 120]))
            qtd = int(np.random.randint(1, 6))
            valor = float(np.random.choice([0.0, 5000.0, 25000.0]))
            bx = int(np.random.randint(0, 5))
            X.append([dias, qtd, valor, bx, tem_fraude, tem_judicial])
            y.append(1)
            continue

        # Casos regulares: 50% clientes excelentes, 30% moderados, 20% inadimplentes
        perfil = np.random.rand()
        if perfil < 0.50:  # Perfil Excelente (Júlio, Bento, Ada)
            dias = 0
            qtd = 0
            valor = 0.0
            bx = int(np.random.randint(0, 15))
            classe = 0
        elif perfil < 0.80:  # Perfil Moderado / Alerta
            dias = int(np.random.randint(5, 45))
            qtd = int(np.random.randint(1, 3))
            mult = 5.0 if eh_pj else 1.0
            valor = float(np.random.randint(500, 3000) * mult)
            bx = int(np.random.randint(1, 8))
            classe = 0 if dias < 30 else 1
        else:  # Perfil Crítico / Inadimplente
            dias = int(np.random.randint(60, 180))
            qtd = int(np.random.randint(2, 7))
            mult = 10.0 if eh_pj else 1.0
            valor = float(np.random.randint(6000, 25000) * mult)
            bx = int(np.random.randint(0, 3))
            classe = 1

        X.append([dias, qtd, valor, bx, 0, 0])
        y.append(classe)

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)

# Treina modelo PF
X_pf, y_pf = gerar_base_sintetica(600, eh_pj=False)
clf_pf = RandomForestClassifier(n_estimators=40, max_depth=6, max_features=None, random_state=42)
clf_pf.fit(X_pf, y_pf)

onx_pf = to_onnx(clf_pf, X_pf[:1], target_opset=17, options={'zipmap': False})
with open("modelo_pf.onnx", "wb") as f:
    f.write(onx_pf.SerializeToString())

# Treina modelo PJ
X_pj, y_pj = gerar_base_sintetica(600, eh_pj=True)
clf_pj = RandomForestClassifier(n_estimators=40, max_depth=6, max_features=None, random_state=42)
clf_pj.fit(X_pj, y_pj)

onx_pj = to_onnx(clf_pj, X_pj[:1], target_opset=17, options={'zipmap': False})
with open("modelo_pj.onnx", "wb") as f:
    f.write(onx_pj.SerializeToString())

print("Modelos calibrados 'modelo_pf.onnx' e 'modelo_pj.onnx' exportados com sucesso!")