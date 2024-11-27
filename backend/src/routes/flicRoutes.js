import express from "express";
import { receiveAlarmFromFlic } from '../controllers/flicController.js'
import db from '../managers/databaseSequelize.js'
import {log} from '../utils/log.js'

const FlicRouter = express.Router();

FlicRouter.post("/alarmTriggered", async (req, res) => {
  try {
    const flicSecretApi = await db.config.findOne({
      where: {
          entry: 'flicSecretApi'
      }
    });

    if (flicSecretApi && flicSecretApi.value != '') {
      const secretHeader = req.headers['secret']; // Headers são case-insensitive
      if (!secretHeader || secretHeader !== flicSecretApi.value) {
        log('flicRoutes:alarmTriggered: Header "Secret" inválido ou ausente.');
        return res.status(403).send({ error: 'Forbidden: Invalid or missing Secret header' });
      }
    }
    const body = await req.body;
    log("flicRoutes:alarmTriggered: Requisição do Flic recebido: "+ JSON.stringify(body));
    const result = await receiveAlarmFromFlic(body);
    res.status(200).send(result);
  }catch(e){
    log("flicRoutes:alarmTriggered: Erro ao tratar requisição FLIC: "+ e);
  }
})

export default FlicRouter;