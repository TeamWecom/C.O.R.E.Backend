import axios from 'axios';
import https from 'https';
import {log} from '../utils/log.js'

// Cria uma instância personalizada do axios que ignora erros de certificado
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Ignora erros de certificado SSL
    })
});

export const sendHttpGetRequest = async (endpoint, customHeaders) => {
    try {
        const response = await axiosInstance.get(endpoint, { headers: JSON.parse(customHeaders) });
        log(`GET request to ${endpoint} successful:`);
        return response;
    } catch (error) {
        log(`Error sending GET request to ${endpoint}:`, error.message);
        return error.message;
    }
}

export const sendHttpPostRequest = async (endpoint, data, customHeaders) => {
    try {
        log(`POST request to ${endpoint} data:`, data);
        const response = await axiosInstance.post(endpoint, data, { headers: JSON.parse(customHeaders) });
        log(`POST request to ${endpoint} successful:`);
        return response;
    } catch (error) {
        log(`Error sending POST request to ${endpoint}:`, error.message);
        return error.message;
    }
}

export const sendHttpPutRequest = async (endpoint, data, customHeaders) =>{
    try {
        const response = await axios.put(endpoint, data, { headers: JSON.parse(customHeaders) });
        log(`PUT request to ${endpoint} successful:`);
        return response;
    } catch (error) {
        log(`Error sending PUT request to ${endpoint}:`, error.message);
    }
}

export const sendHttpDeleteRequest = async (endpoint, customHeaders) =>{
    try {
        const response = await axios.delete(endpoint, { headers: JSON.parse(customHeaders) });
        log(`DELETE request to ${endpoint} successful:`);
        return response;
    } catch (error) {
        log(`Error sending DELETE request to ${endpoint}:`, error.message);
    }
}
