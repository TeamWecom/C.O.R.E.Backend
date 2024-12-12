import { promises as fs } from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { send } from './webSocketManager.js';
import { log } from '../utils/log.js';
import { where } from 'sequelize';
import db from './databaseSequelize.js'
import {updateButtonNameGoogleCalendar} from '../controllers/buttonController.js';
import { pbxTableUsers } from '../controllers/innovaphoneController.js';
// Configurações OAuth
let CLIENT_ID
let CLIENT_SECRET
const REDIRECT_URI = 'https://'+process.env.BACKEND_URL+'/api/google-oauth-callback'; // Substitua pelo seu redirect URI
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
// Inicializar o cliente OAuth2 
let oAuth2Client

export const initGoogleOAuth = async () => {
  try{
    // Obter valores de configuração necessários para a tarefa
    const googleCalendarEntries = [
      'googleClientId',
      'googleClientSecret'
    ];

    // Faz uma consulta ao banco de dados para pegar todas as entradas correspondentes
    const configs = await db.config.findAll({
      where: {
        entry: googleCalendarEntries
      }
    });

    // Transforma o resultado em um objeto chave-valor
    const configObj = {};
    configs.forEach(config => {
    configObj[config.entry] = config.value;
    });

    CLIENT_ID = configObj.googleClientId
    CLIENT_SECRET = configObj.googleClientSecret

    oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  }catch(e){
    log(`googleCalendarManager:initGoogleOAuth: Erro ${e}`)
  }

}
// Caminhos para salvar os tokens
const TOKEN_PATH = path.join(process.cwd(), 'token.json'); // Substitua por um armazenamento seguro no servidor



/**
 * Gera a URL de autenticação para o usuário autorizar o acesso.
 * @return {string} URL de autenticação.
 */
export const generateAuthUrl = () => {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline', // Necessário para obter o Refresh Token
    scope: SCOPES,
  });
};

/**
 * Troca o código de autorização pelo token de acesso e refresh token.
 * @param {string} code Código de autorização recebido na callback.
 * @return {Promise<Object>} Tokens recebidos.
 */
export const getTokens = async (code) => {
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  // Salvar tokens no arquivo (ou banco de dados em produção)
  await saveTokens(tokens);
  return tokens;
};

/**
 * Salva os tokens recebidos em um arquivo.
 * @param {Object} tokens Tokens recebidos do Google.
 */
const saveTokens = async (tokens) => {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8');
};

/**
 * Carrega os tokens salvos do arquivo, se existirem.
 * @return {Promise<boolean>} True se os tokens foram carregados.
 */
export const loadGoogleTokens = async () => {
  try {
    const tokenData = await fs.readFile(TOKEN_PATH, 'utf8');
    const tokens = JSON.parse(tokenData);
    oAuth2Client.setCredentials(tokens);
    // Verifica se o token precisa ser renovado
    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
        const newTokens = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(newTokens.credentials);
  
        // Salva os novos tokens
        await saveTokens(newTokens.credentials);
        log('googleCalendarManager:loadGoogleTokens: Token renovado com sucesso.');
      }
  
      log('googleCalendarManager:loadGoogleTokens: Tokens carregados com sucesso.');
    return true;
  } catch (error) {
    log('googleCalendarManager:loadGoogleTokens: Nenhum token salvo encontrado. Inicie o fluxo de autenticação.');
    return false;
  }
};

/**
 * Lista os nomes de todos os calendários do usuário autenticado.
 * @return {Promise<void>}
 */
export const listCalendars = async () => {
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
  const res = await calendar.calendarList.list();
  const calendars = res.data.items;

  if (!calendars || calendars.length === 0) {
    //log('googleCalendarManager:listCalendars: Nenhum calendário encontrado.');
    return [];
  }
  //log(`googleCalendarManager:listCalendars: ${calendars.length} Calendários encontrados`);
  return calendars // Retorna os calendários
};

/**
 * Retorna os nomes e e-mails dos convidados de um evento em andamento
 * para um determinado ID de calendário.
 * 
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {string} calendarId O ID do calendário (ex: 'primary' ou outro ID de calendário).
 * @return {Promise<Array<{name: string, email: string}>>} Lista de convidados do evento em andamento.
 */
export const getOngoingEventGuests = async (calendarId) => {
  try{
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
  
    // Obter eventos futuros e em andamento no calendário
    const now = new Date().toISOString(); // Data e hora atuais
    const res = await calendar.events.list({
      calendarId: calendarId,
      timeMin: now,
      maxResults: 10, // Pode ajustar conforme necessário
      singleEvents: true,
      orderBy: 'startTime',
    });
  
    const events = res.data.items;
  
    if (!events || events.length === 0) {
      log('googleCalendarManager:getOngoingEventsGuests: No upcoming events found calendar id.'+ calendarId);
      return [];
    }
  
    // Filtrar eventos que estão em andamento (com início no futuro)
    const ongoingEvents = events.filter(event => {
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;
      return new Date(start) <= new Date() && new Date(end) > new Date();
    });
  
    if (ongoingEvents.length === 0) {
      log('googleCalendarManager:getOngoingEventsGuests: No ongoing events found calendar id.' +calendarId);
      return [];
    }
  
    // Obter os convidados de cada evento em andamento
    const guests = [];
    ongoingEvents.forEach(event => {
      if (event.attendees) {
        event.attendees.forEach(attendee => {
          if (attendee.email) {
            guests.push({
              name: attendee.displayName || 'No name',
              email: attendee.email,
            });
          }
        });
      }
    });
  
    return guests;

  }catch(e){
    log('googleCalendarManager:getOngoingEventsGuests: Ongoing events error: '+e);

    return []
  }
    
  };  

/**
 * Executa o fluxo completo.
 * Primeiro tenta carregar os tokens salvos, se falhar, inicia o fluxo OAuth.
 */
export const startOAuthFlow = async (guid) => {
  await initGoogleOAuth()
  const tokensLoaded = await loadGoogleTokens();

  if (!tokensLoaded) {
    // Caso não haja tokens salvos, inicie o fluxo de autenticação
    const authUrl = generateAuthUrl();
    log(`googleCalendarManager:startOAuthFlow: Por favor, autorize o aplicativo visitando esta URL: ${authUrl}`);
    send(guid, {api: 'admin', mt: 'GoogleOAuthAuthorizationRequest', url: authUrl})
  } else {
    log('googleCalendarManager:startOAuthFlow: Tokens carregados com sucesso. Você está autenticado.');
    send(guid, {api: 'admin', mt: 'GoogleOAuthAuthorizationResult', result: 'ok'})
  }
};

/**
 * Remove os tokens salvos e invalida a autenticação com o Google.
 * @param {string} guid Identificador da conexão para retorno via WebSocket.
 */
export const deleteOAuthFlow = async (guid) => {
  try {
    // Carrega os tokens salvos
    const tokenData = await fs.readFile(TOKEN_PATH, 'utf8');
    const tokens = JSON.parse(tokenData);

    // Revoga o token no servidor do Google
    if (tokens.access_token) {
      await oAuth2Client.revokeToken(tokens.access_token);
      log('googleCalendarManager:deleteOAuthFlow: Token revogado com sucesso.');
    }

    // Remove o arquivo de tokens local
    await fs.unlink(TOKEN_PATH);
    log('googleCalendarManager:deleteOAuthFlow: Tokens removidos localmente.');

    // Notifica o cliente via WebSocket
    send(guid, {
      api: 'admin',
      mt: 'RequestGoogleOAuthRemoveResult',
      result: 'ok',
    });
  } catch (error) {
    log(`googleCalendarManager:deleteOAuthFlow: Erro ao remover autenticação: ${error.message}`);
    send(guid, {
      api: 'admin',
      mt: 'RequestGoogleOAuthRemoveResult',
      result: 'error',
      message: error.message,
    });
  }
};


export async function loopGetOngoingEventGuests() {
  try {
    const buttons_calendar = await db.button.findAll({where:{
      button_type: 'google_calendar'
    }});
    if(buttons_calendar.length > 0){
      log(`googleCalendarManager:loopGetOngoingEventGuests: buttons google_calendar ${buttons_calendar.length}`);
      buttons_calendar.forEach(async(b) => {
        const bJSON = b.toJSON(); 
        //const guests = await getOngoingEventGuests(b.calendar_id)
        //if(guests.length > 0){
          //const sip = guests[0].email.split('@')[0];
          //log(`googleCalendarManager:loopGetOngoingEventGuests: ${guests.length} guests for button google_calendar ${b.button_name}`);
          // const innoUsers = await pbxTableUsers();

          // const userInno = innoUsers.find((u) => u.h323 == sip)
          // if(userInno){ 
          //   bJSON.button_prt = userInno.guid;
          //   const objToUpdateResult = await db.button.update(bJSON,
          //     {
          //     where: {
          //         id: parseInt(bJSON.id),
          //     },
          //   });
          // }else{
          //   log(`googleCalendarManager:loopGetOngoingEventGuests: not found user Innovaphone for button google_calendar ${b.button_name}`);
          // }
          //bJSON.button_prt = sip;
        //}else{
          //log(`googleCalendarManager:loopGetOngoingEventGuests: no guests for button google_calendar ${bJSON.button_name}`);
        //}
        const updatedButton = await updateButtonNameGoogleCalendar(bJSON);
        send(b.button_user, { api: "user", mt: "UpdateButtonSuccess", result: updatedButton })
      })
    }else{
      log(`googleCalendarManager:loopGetOngoingEventGuests: no buttons google_calendar`);
    }
    log(`googleCalendarManager:loopGetOngoingEventGuests: start waiting`);
    setTimeout(loopGetOngoingEventGuests, 60000);
} catch (error) {
    log(`googleCalendarManager:loopGetOngoingEventGuests: Erro: ${error.message}`);
    setTimeout(loopGetOngoingEventGuests, 60000);
}
}

