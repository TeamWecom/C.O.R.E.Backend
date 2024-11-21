import express from "express";
import { receiveAlarmFromFlic } from '../controllers/flicController.js'

const FlicRouter = express.Router();

FlicRouter.post("/alarmTriggered", async (req, res) => {
  try {
    const body = await req.body;
    console.log("flicRoutes: Requisição do Flic recebido:"+ JSON.stringify(body));
    const result = await receiveAlarmFromFlic(body);
    res.status(200).send(result);
  }catch(e){
    console.log("Requisição do Flic recebido:"+ e);
  }
})

export default FlicRouter;