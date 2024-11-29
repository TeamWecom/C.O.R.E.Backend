import {log} from '../utils/log.js';
import db from '../managers/databaseSequelize.js'
import { sendHttpGetRequest } from '../managers/httpClient.js';
import OpenAIApi from 'openai';
const openaiParamters = [
    'openaiKey',
    'openaiOrg',
    'openaiProj'
];
import fs from "fs";

/**
 * Função para Verificar no ChatGPT se a imagem está de acordo com as definições necessárias
 * @param {string} customPrompt - Seu prompt customizado
 * @param {string} image - A url da imagem 
 * @returns {Promise<object>} - {status:2, msg: error}
 */
export async function openAIRequestImagemAnaliser(customPrompt, image) {
    // Faz uma consulta ao banco de dados para pegar todas as entradas correspondentes
    const configs = await db.config.findAll({
        where: {
        entry: openaiParamters
        }
    });
    // Transforma o resultado em um objeto chave-valor
    const openaiConfigObj = {};
    configs.forEach(config => {
    openaiConfigObj[config.entry] = config.value;
    });
    log(`openAiUtils:openAIRequest: openaiConfigObj ${JSON.stringify(openaiConfigObj)}`)

    const openai = new OpenAIApi({
        apiKey: openaiConfigObj.openaiKey,
        organization: openaiConfigObj.openaiOrg,
        project: openaiConfigObj.openaiProj,
    });

    let systemPrompt;
    if(customPrompt){
        systemPrompt = `Você é um engenheiro de segurança do trabalho e deve analisar as imagens de trabalhadores em seu dia a dia de trabalho, retornando como resposta:
        0 = Com EPIs adequados, 1 = sem EPI adequado ou 2 = não identificado.
        
        Pergunta: "${customPrompt}"
    
        As respostas devem ser exclusivamente:
        {"status":0, "msg": "ok"}, {"status":1, "msg": "<motivo da reprovação>"} ou {"status":2, "msg": "<motivo da incerteza>"}.
      `;

    }else{
        systemPrompt = `Você é um engenheiro de segurança do trabalho e deve analisar as imagens de trabalhadores em seu dia a dia de trabalho, retornando como resposta:
        0 = Com EPIs adequados, 1 = sem EPI adequado ou 2 = não identificado.
        
        Pergunta: "O funcionário da empresa que está desempanhando o trabalho está usando os EPIs básicos para a execução daquela atividade em questão?"
    
        As respostas devem ser exclusivamente:
        {"status":0, "msg": "ok"}, {"status":1, "msg": <motivo da reprovação>} ou {"status":2, "msg": <motivo da incerteza>}.
      `;
    }
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: systemPrompt },
                  {
                    type: "image_url",
                    image_url: {
                      "url": image,
                    },
                  },
                ],
              },
            ],
          });
        
        const result = await response.choices[0].message.content;
        log('actionController:imagemAnaliser: Resultado da análise:'+ result);
        return JSON.parse(result);
    } catch (error) {
      log('actionController:imagemAnaliser: Erro na análise da imagem:' + error);
      return {status:2, msg: error}
    }
}
/**
 * Função para Verificar no ChatGPT se os dados da API estão corretos 
 * @returns {Promise<object>} - {status:"NOK", text: error}
 */
export async function openAIRequestTestCredits() {
    // Faz uma consulta ao banco de dados para pegar todas as entradas correspondentes
    const configs = await db.config.findAll({
        where: {
        entry: openaiParamters
        }
    });
    // Transforma o resultado em um objeto chave-valor
    const openaiConfigObj = {};
    configs.forEach(config => {
    openaiConfigObj[config.entry] = config.value;
    });
    log(`openAiUtils:openAIRequestTestCredits: openaiConfigObj ${JSON.stringify(openaiConfigObj)}`)

    const openai = new OpenAIApi({
        apiKey: openaiConfigObj.openaiKey,
        organization: openaiConfigObj.openaiOrg,
        project: openaiConfigObj.openaiProj,
    });

    let systemPrompt = "Responda isto é um teste!";

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: systemPrompt }
                ],
              },
            ],
          });
        
        const result = await response.choices[0].message.content;
        log('openAiUtils:openAIRequestTestCredits: Resultado da análise '+ result);
        return {status:"OK", text: "OK"};
    } catch (error) {
      log('openAiUtils:openAIRequestTestCredits: Erro ' + error);
      return {status:"NOK", text: error}
    }
}
/**
 * Função para transcrever audios no ChatGPT
 * @param {string} audio - O path do audio
 * @returns {Promise<object>} - {status:"NOK", text: error}
 */
export async function openAIRequestTranscription(audio) {
  // Faz uma consulta ao banco de dados para pegar todas as entradas correspondentes
  const configs = await db.config.findAll({
      where: {
      entry: openaiParamters
      }
  });
  // Transforma o resultado em um objeto chave-valor
  const openaiConfigObj = {};
  configs.forEach(config => {
  openaiConfigObj[config.entry] = config.value;
  });
  //log(`openAiUtils:openAIRequestTranscription: openaiConfigObj ${JSON.stringify(openaiConfigObj)}`)

  const openai = new OpenAIApi({
      apiKey: openaiConfigObj.openaiKey,
      organization: openaiConfigObj.openaiOrg,
      project: openaiConfigObj.openaiProj,
  });

  try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audio),
        model: "whisper-1",
      });
      log('openAiUtils:openAIRequestTranscription: Resultado da transcrição '+ JSON.stringify(transcription));
      return {status:"OK", text: transcription.text};
  } catch (error) {
    log('openAiUtils:openAIRequestTranscription: Erro ' + error);
    return {status:"NOK", text: error}
  }
}