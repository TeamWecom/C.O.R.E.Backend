import express from "express";

const FlicRouter = express.Router();

FlicRouter.post("/button", async (req, res) => {
  try {
	console.log("Requisição do Flic recebido")

    console.log("Requisição do Flic recebido:"+ JSON.stringify(req.body));
    res.status(200).send([]);
  }catch(e){
    console.log("Requisição do Flic recebido:"+ e);
  }
})

export default FlicRouter;