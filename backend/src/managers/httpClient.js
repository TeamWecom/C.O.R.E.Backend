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
        const response = await axiosInstance.get(endpoint, { headers: JSON.parse(customHeaders), timeout: 20000 });
        log(`httpClient:sendHttpGetRequest: GET request to ${endpoint} result status:${response.status}`);
        return response;
    } catch (error) {
        log(`httpClient:sendHttpGetRequest: Error sending GET request to ${endpoint}:${JSON.stringify(error.message)}`);
        return error.response;
    }
}

export const sendHttpPostRequest = async (endpoint, data, customHeaders) => {
    try {
        log(`httpClient:sendHttpPostRequest: POST request to ${endpoint} data:`, data);
        const response = await axiosInstance.post(endpoint, data, { headers: JSON.parse(customHeaders), timeout: 20000});
        log(`httpClient:sendHttpPostRequest: POST request to ${endpoint} result status:${response.status}`);
        return response;
    } catch (error) {
        log(`httpClient:sendHttpPostRequest: Error sending POST request to ${endpoint}:`, error.message);
        return error.message;
    }
}

export const sendHttpPutRequest = async (endpoint, data, customHeaders) =>{
    try {
        const response = await axios.put(endpoint, data, { headers: JSON.parse(customHeaders), timeout: 20000 });
        log(`httpClient:sendHttpPutRequest: PUT request to ${endpoint} result status:${response.status}`);
        return response;
    } catch (error) {
        log(`httpClient:sendHttpPutRequest: Error sending PUT request to ${endpoint}:`, error.message);
    }
}

export const sendHttpDeleteRequest = async (endpoint, customHeaders) =>{
    try {
        const response = await axios.delete(endpoint, { headers: JSON.parse(customHeaders), timeout: 20000 });
        log(`httpClient:sendHttpDeleteRequest: DELETE request to ${endpoint} result status:${response.status}`);
        return response;
    } catch (error) {
        log(`httpClient:sendHttpDeleteRequest: Error sending DELETE request to ${endpoint}:`, error.message);
    }
}
