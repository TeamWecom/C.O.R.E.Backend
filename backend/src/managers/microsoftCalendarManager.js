import { promises as fs } from 'fs';
import path from 'path';
import { Client } from '@microsoft/microsoft-graph-client';
import { send } from './webSocketManager.js';
import { log } from '../utils/log.js';
import db from './databaseSequelize.js';
import { updateButtonNameMicrosoftCalendar } from '../controllers/buttonController.js';

let CLIENT_ID;
let CLIENT_SECRET;
let TENANT_ID;
const REDIRECT_URI = `https://${process.env.BACKEND_URL}/api/microsoft-oauth-callback`;
const TOKEN_PATH = path.join(process.cwd(), 'microsoft_token.json');

let msGraphClient;
let cachedTokens = null;
let isRefreshing = false;
let refreshPromise = null;

export const initMicrosoftOAuth = async () => {
  try {
    const microsoftCalendarEntries = ['microsoftClientId', 'microsoftClientSecret', 'microsoftTenantId'];

    const configs = await db.config.findAll({
      where: { entry: microsoftCalendarEntries },
    });

    const configObj = {};
    configs.forEach(config => {
      configObj[config.entry] = config.value;
    });

    CLIENT_ID = configObj.microsoftClientId;
    CLIENT_SECRET = configObj.microsoftClientSecret;
    TENANT_ID = configObj.microsoftTenantId;
  } catch (e) {
    log(`microsoftCalendarManager:initMicrosoftOAuth: Erro ${e}`);
  }
};

export const generateAuthUrl = () => {
  const scopes = [
    'Calendars.Read',
    'Calendars.ReadWrite',
    'offline_access'
  ];

  return (
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?` +
    `client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}` +
    `&response_mode=query&scope=${scopes.join('%20')}`
  );
};

export const getMicrosoftTokens = async code => {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const tokens = await response.json();
  tokens.expires_in = Date.now() + tokens.expires_in * 1000; // Calcula a nova validade do token
  await saveTokens(tokens);
  cachedTokens = tokens;
  return tokens;
};

const refreshTokens = async (refreshToken) => {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const tokens = await response.json();
  if (!response.ok) {
    log(`Erro ao renovar token: ${response.statusText}`);
    log(`Detalhes do erro: ${JSON.stringify(responseBody)}`);
    throw new Error(`microsoftCalendarManager:refreshTokens: Erro ao renovar token: ${responseBody.error_description || responseBody.error}`);
  }

  tokens.expires_in = Date.now() + tokens.expires_in * 1000;
  await saveTokens(tokens);
  return tokens;
};

const saveTokens = async tokens => {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8');
};

const getFreshTokens = async () => {
  if (isRefreshing) return refreshPromise;
  isRefreshing = true;

  refreshPromise = refreshTokens(cachedTokens.refresh_token).finally(() => {
    isRefreshing = false;
  });

  return refreshPromise;
};

export const loadMicrosoftTokens = async () => {
  try {
    const tokenData = await fs.readFile(TOKEN_PATH, 'utf8');
    const tokens = JSON.parse(tokenData);

    if (tokens.expires_in && Date.now() >= tokens.expires_in) {
      log('microsoftCalendarManager:loadMicrosoftTokens: Token expirado. Tentando renovar...');
      const newTokens = await getFreshTokens();
      cachedTokens = newTokens;
    } else {
      cachedTokens = tokens;
    }

    msGraphClient = Client.init({
      authProvider: async (done) => {
        try {
          if (cachedTokens.expires_in && Date.now() >= cachedTokens.expires_in) {
            log('microsoftCalendarManager:loadMicrosoftTokens: Renovando token antes da chamada API...');
            cachedTokens = await getFreshTokens();
          }

          done(null, cachedTokens.access_token);
        } catch (error) {
          log(`microsoftCalendarManager:loadMicrosoftTokens: Erro ao obter token: ${error.message}`);
          done(error, null);
        }
      },
    });
    log('microsoftCalendarManager:loadMicrosoftTokens: Tokens carregados com sucesso.');
    // Inicia o monitoramento do token
    monitorTokenValidity();
    return true;
  } catch (error) {
    log('microsoftCalendarManager:loadMicrosoftTokens: Nenhum token salvo encontrado. Inicie o fluxo de autenticação.');
    return false;
  }
};

export const listMicrosoftCalendars = async () => {
  try {
    const response = await msGraphClient.api('/me/calendars').get();
    return response.value || [];
  } catch (error) {
    log(`microsoftCalendarManager:listCalendars: Erro ao listar calendários: ${error.message}`);
    return [];
  }
};

export const getMicrosoftOngoingEventGuests = async calendarId => {
  try {
    const now = new Date().toISOString();
    const response = await msGraphClient.api(`/me/calendars/${calendarId}/events`).filter(
      `start/dateTime le '${now}' and end/dateTime gt '${now}'`
    ).get();

    const events = response.value || [];
    const guests = [];

    events.forEach(event => {
      if (event.attendees) {
        event.attendees.forEach(attendee => {
          guests.push({
            name: attendee.emailAddress.name || 'No name',
            email: attendee.emailAddress.address,
          });
        });
      }
    });

    return guests;
  } catch (error) {
    log(`microsoftCalendarManager:getOngoingEventGuests: Erro: ${error.message}`);
    return [];
  }
};

export const startMicrosoftOAuthFlow = async guid => {
  await initMicrosoftOAuth();
  const tokensLoaded = await loadMicrosoftTokens();

  if (!tokensLoaded) {
    const authUrl = generateAuthUrl();
    log(`microsoftCalendarManager:startOAuthFlow: Por favor, autorize o aplicativo visitando esta URL: ${authUrl}`);
    send(guid, { api: 'admin', mt: 'MicrosoftOAuthAuthorizationRequest', url: authUrl });
  } else {
    log('microsoftCalendarManager:startOAuthFlow: Tokens carregados com sucesso. Você está autenticado.');
    send(guid, { api: 'admin', mt: 'MicrosoftOAuthAuthorizationResult', result: 'ok' });
  }
};

export const deleteMicrosoftOAuthFlow = async guid => {
  try {
    await fs.unlink(TOKEN_PATH);
    log('microsoftCalendarManager:deleteOAuthFlow: Tokens removidos localmente.');
    send(guid, {
      api: 'admin',
      mt: 'RequestMicrosoftOAuthRemoveResult',
      result: 'ok',
    });
  } catch (error) {
    log(`microsoftCalendarManager:deleteOAuthFlow: Erro ao remover autenticação: ${error.message}`);
    send(guid, {
      api: 'admin',
      mt: 'RequestMicrosoftOAuthRemoveResult',
      result: 'error',
      message: error.message,
    });
  }
};

export async function loopGetMicrosoftOngoingEventGuests() {
  try {
    const buttons_calendar = await db.button.findAll({where:{
      button_type: 'microsoft_calendar'
    }});
    if(buttons_calendar.length > 0){
      log(`microsoftCalendarManager:loopGetOngoingEventGuests: buttons microsoft_calendar ${buttons_calendar.length}`);
      buttons_calendar.forEach(async(b) => {
        const bJSON = b.toJSON(); 
        const updatedButton = await updateButtonNameMicrosoftCalendar(bJSON);
        send(b.button_user, { api: "user", mt: "UpdateButtonSuccess", result: updatedButton })
      })
    }else{
      log(`microsoftCalendarManager:loopGetOngoingEventGuests: no buttons microsoft_calendar`);
    }
    log(`microsoftCalendarManager:loopGetOngoingEventGuests: start waiting`);
    setTimeout(loopGetMicrosoftOngoingEventGuests, 60000);
} catch (error) {
    log(`microsoftCalendarManager:loopGetMicrosoftOngoingEventGuests: Erro: ${error.message}`);
    setTimeout(loopGetMicrosoftOngoingEventGuests, 60000);
}
}

const monitorTokenValidity = async () => {
    try {
        cachedTokens = await getFreshTokens();
        if (cachedTokens.expires_in && Date.now() >= cachedTokens.expires_in - 60000) { 
            log('microsoftCalendarManager:monitorTokenValidity: Token próximo de expirar. Tentando renovar...');
            cachedTokens = await getFreshTokens();
            log('microsoftCalendarManager:monitorTokenValidity: Token renovado com sucesso.');
        }
    } catch (error) {
        log(`microsoftCalendarManager:monitorTokenValidity: Erro ao monitorar/renovar token: ${error.message}`);
    }finally{
        setTimeout(monitorTokenValidity, 60000);
    }

};
  
  
  
