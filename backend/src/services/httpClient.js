import axios from'axios';


export const sendHttpGetRequest = async (endpoint, customHeaders) => {
    try {
        const response = await axios.get(endpoint, { headers: JSON.parse(customHeaders) });
        console.log(`GET request to ${endpoint} successful:`, response.data);
        return response.data
    } catch (error) {
        console.error(`Error sending GET request to ${endpoint}:`, error.message);
        return error.message
    }
}

export const sendHttpPostRequest = async (endpoint, data, customHeaders) =>{
    try {
        console.log(`POST request to ${endpoint} data:`, data);
        const response = await axios.post(endpoint, data, { headers: JSON.parse(customHeaders) });
        console.log(`POST request to ${endpoint} successful:`, response.data);
        return response
    } catch (error) {
        console.error(`Error sending POST request to ${endpoint}:`, error.message);
        return error.message
    }
}

export const sendHttpPutRequest = async (endpoint, data, customHeaders) =>{
    try {
        const response = await axios.put(endpoint, data, { headers: JSON.parse(customHeaders) });
        console.log(`PUT request to ${endpoint} successful:`, response.data);
    } catch (error) {
        console.error(`Error sending PUT request to ${endpoint}:`, error.message);
    }
}

export const sendHttpDeleteRequest = async (endpoint, customHeaders) =>{
    try {
        const response = await axios.delete(endpoint, { headers: JSON.parse(customHeaders) });
        console.log(`DELETE request to ${endpoint} successful:`, response.data);
    } catch (error) {
        console.error(`Error sending DELETE request to ${endpoint}:`, error.message);
    }
}
