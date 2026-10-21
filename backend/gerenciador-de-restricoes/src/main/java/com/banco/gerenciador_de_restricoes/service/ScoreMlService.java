package com.banco.gerenciador_de_restricoes.service;

import ai.onnxruntime.*;
import com.banco.gerenciador_de_restricoes.domain.enums.TipoPessoa;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.FloatBuffer;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class ScoreMlService {

    private OrtEnvironment env;
    private OrtSession sessionPf;
    private OrtSession sessionPj;

    @PostConstruct
    public void inicializarModelos() {
        try {
            this.env = OrtEnvironment.getEnvironment();
            OrtSession.SessionOptions options = new OrtSession.SessionOptions();

            InputStream isPf = new ClassPathResource("models/modelo_pf.onnx").getInputStream();
            this.sessionPf = env.createSession(isPf.readAllBytes(), options);

            InputStream isPj = new ClassPathResource("models/modelo_pj.onnx").getInputStream();
            this.sessionPj = env.createSession(isPj.readAllBytes(), options);

            System.out.println(">>> [ScoreMlService] Modelos ONNX carregados com sucesso!");
        } catch (Exception e) {
            System.err.println(">>> [ScoreMlService] Falha ao carregar modelos ONNX: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public record ResultadoScore(int score, double probabilidadeDefault, String faixaRisco, String modeloUtilizado) {}

    public ResultadoScore calcularScore(
            TipoPessoa tipoPessoa, 
            int diasAtrasoMax, 
            int qtdRestricoesAtivas, 
            double valorTotalInadimplencia, 
            int totalBaixadas,
            boolean temFraude,
            boolean temBloqueioJudicial
    ) {
        OrtSession sessionAtiva = (tipoPessoa == TipoPessoa.PJ) ? sessionPj : sessionPf;
        String rotuloModelo = (tipoPessoa == TipoPessoa.PJ) ? "Modelo Preditivo (PJ)" : "Modelo Preditivo (PF)";

        if (sessionAtiva == null) {
            return gerarFallback(qtdRestricoesAtivas, temFraude, temBloqueioJudicial, rotuloModelo);
        }

        try {
            String inputName = sessionAtiva.getInputNames().iterator().next();
            NodeInfo inputInfo = sessionAtiva.getInputInfo().get(inputName);
            long[] shapeEsperado = ((TensorInfo) inputInfo.getInfo()).getShape();
            int dimFeatures = (int) shapeEsperado[shapeEsperado.length - 1];

            float[] features = (dimFeatures == 6)
                ? new float[] {
                    (float) diasAtrasoMax,
                    (float) qtdRestricoesAtivas,
                    (float) valorTotalInadimplencia,
                    (float) totalBaixadas,
                    temFraude ? 1.0f : 0.0f,
                    temBloqueioJudicial ? 1.0f : 0.0f
                }
                : new float[] {
                    (float) diasAtrasoMax,
                    (float) qtdRestricoesAtivas,
                    (float) valorTotalInadimplencia,
                    (float) totalBaixadas
                };

            OnnxTensor tensor = OnnxTensor.createTensor(env, FloatBuffer.wrap(features), new long[]{1, features.length});

            try (OrtSession.Result result = sessionAtiva.run(Collections.singletonMap(inputName, tensor))) {
                double pd = 0.0;
                OnnxValue outputProbValue = result.get(1);

                // Caso A: Matriz tensorial direta float[][] (sem ZipMap)
                if (outputProbValue instanceof OnnxTensor probTensor) {
                    Object tensorVal = probTensor.getValue();
                    if (tensorVal instanceof float[][] matriz && matriz.length > 0) {
                        pd = matriz[0].length > 1 ? matriz[0][1] : matriz[0][0];
                    }
                } 
                // Caso B: Sequência ONNX com OnnxMap interno (padrão com ZipMap)
                else if (outputProbValue instanceof OnnxSequence sequence) {
                    List<?> lista = sequence.getValue();
                    if (!lista.isEmpty()) {
                        Object item = lista.get(0);
                        Map<?, ?> mapa = null;
                        if (item instanceof OnnxMap onnxMap) {
                            mapa = onnxMap.getValue(); // Desempacota o mapa Java nativo
                        } else if (item instanceof Map<?, ?> m) {
                            mapa = m;
                        }

                        if (mapa != null) {
                            Object probObj = mapa.get(1L) != null ? mapa.get(1L) : (mapa.get(1) != null ? mapa.get(1) : mapa.get("1"));
                            if (probObj instanceof Number num) {
                                pd = num.doubleValue();
                            }
                        }
                    }
                }

                // Cálculo proporcional do Credit Score (0 a 1000)
                int score = (int) Math.round((1.0 - pd) * 1000);
                score = Math.max(0, Math.min(1000, score));
                String faixa = score >= 700 ? "BAIXO RISCO" : (score >= 400 ? "MÉDIO RISCO" : "ALTO RISCO");

                System.out.printf(">>> [Score ML] Tipo: %s | Atraso: %dd | Ativas: %d | Fraude: %b | PD: %.4f | Score: %d (%s)%n",
                        tipoPessoa, diasAtrasoMax, qtdRestricoesAtivas, temFraude, pd, score, faixa);

                return new ResultadoScore(score, pd, faixa, rotuloModelo);
            }
        } catch (Exception e) {
            System.err.println(">>> [ScoreMlService] Erro na inferência: " + e.getMessage());
            e.printStackTrace();
            return gerarFallback(qtdRestricoesAtivas, temFraude, temBloqueioJudicial, rotuloModelo);
        }
    }

    private ResultadoScore gerarFallback(int ativas, boolean fraude, boolean judicial, String rotulo) {
        if (ativas == 0 && !fraude && !judicial) {
            return new ResultadoScore(980, 0.02, "BAIXO RISCO", rotulo);
        }
        return new ResultadoScore(30, 0.97, "ALTO RISCO (FALLBACK)", rotulo);
    }

    @PreDestroy
    public void finalizarSessoes() throws Exception {
        if (sessionPf != null) sessionPf.close();
        if (sessionPj != null) sessionPj.close();
        if (env != null) env.close();
    }
}