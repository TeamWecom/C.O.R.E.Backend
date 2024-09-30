import express from "express";
import { getLatestTemperatureByDevEUI } from "../controllers/alexaController.js";

const router = express.Router();

router.post("/TemperaturaIntent", async (req, res) => {
  try {
	
    console.log("Requisição da Alexa recebida:", req.body);
    const requestType = req.body.request.type;

    if (requestType === "LaunchRequest") {
      // Tratar o caso em que a skill é iniciada sem um comando específico
      res.json({
        version: "1.0",
        response: {
          outputSpeech: {
            type: "PlainText",
            text: "Bem-vindo ao Monitoramento de Sensores do Core. Você pode perguntar a temperatura da sala.",
          },
          shouldEndSession: false, // manter a sessão aberta para mais interações
        },
      });
    } else if (requestType === "IntentRequest" && req.body.request.intent) {
      const devEUIStatic = "24e124725d487636";
      const intentName = req.body.request.intent.name;

      if (intentName === "TemperaturalIntent") {
        const temperature = await getLatestTemperatureByDevEUI(
          devEUIStatic.toLowerCase()
        );
        if (temperature) {
          res.json({
            version: "1.0",
            response: {
              outputSpeech: {
                type: "PlainText",
                text: `A temperatura da sala é ${temperature} graus.`,
              },
              shouldEndSession: true,
            },
          });
        } else {
          res.json({
            version: "1.0",
            response: {
              outputSpeech: {
                type: "PlainText",
                text: `Não há dados de temperatura para a sala.`,
              },
              shouldEndSession: true,
            },
          });
        }
      } else {
        res.status(400).json({
          version: "1.0",
          response: {
            outputSpeech: {
              type: "PlainText",
              text: "Intent desconhecido.",
            },
            shouldEndSession: true,
          },
        });
      }
    } else if (requestType === "SessionEndedRequest") {
      console.log("Sessão encerrada:", req.body.request.reason);
      res.json({});
    } else {
      res.status(400).json({
        version: "1.0",
        response: {
          outputSpeech: {
            type: "PlainText",
            text: "Tipo de requisição desconhecido.",
          },
          shouldEndSession: true,
        },
      });
    }
  } catch (error) {
    console.error("Erro no endpoint da ALEXA:", error);
    res.status(500).json({
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Houve um erro ao processar a requisição.",
        },
        shouldEndSession: true,
      },
    });
  }
});

export default router;
