import { returnRecordLink } from '../controllers/innovaphoneController.js';
import db from '../managers/databaseSequelize.js';
import { log } from '../utils/log.js'
// Função para substituir 'details' de acordo com o parâmetro 'name'
export const getDetailsForActivity = async (activity) => {
    try{
        let model;
        switch (activity.name) {
            case 'action':
                model = db.action; // Tabela associada a 'action'
                break;
            case 'call':
                model = db.call; // Tabela associada a 'call'
                break;
            case 'message':
                model = db.message; // Tabela associada a 'message'
                break;
            default:
                model = db.button;
                break; // Se não for uma exceção de button
        }

        // Busca o detalhe específico pelo ID salvo no parâmetro 'details'
        //log(`actionsUtils: activity ${JSON.stringify(activity)}`)
        let activityDetails = await model.findOne({
            where: {
                id: parseInt(activity.details)
            }
        });
        if(activityDetails){
            log(`actionsUtils:getDetailsForActivity: detail id ${activityDetails.id} is a ${activity.name}`) 
        }
        let detail =  activityDetails.toJSON();
        if(detail && activity.name == 'call'){
            const result = await returnRecordLink([detail])
            detail = result[0];
            log(`actionsUtils:getDetailsForActivity: detail id ${activityDetails.id} detail updated ${JSON.stringify(detail)}`) 
        }
        //log(`actionsUtils: detail ${JSON.stringify(detail)}`)
        // Substitui 'details' pelo objeto retornado, se encontrado
        return {
            ...activity.toJSON(),
            details: detail ? detail : activity.details
        };
    }catch(e){
        log(`actionsUtils:getDetailsForActivity: error ${e}`)

    }
};