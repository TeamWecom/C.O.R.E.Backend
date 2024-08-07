import { log } from '../log.js';
import { readInt16LE, readUInt16LE } from '../typeHelpers.js'
import atob from 'atob'; // Decode base64 string
import { Buffer } from 'buffer'; // Node.js Buffer for binary data


function decodeBytes(bytes) {
    const decoded = {};
    for (var i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];
        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // TEMPERATURE
        else if (channel_id === 0x03 && channel_type === 0x67) {
            // ℃
            decoded.temperature = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;

            // ℉
            // decoded.temperature = readInt16LE(bytes.slice(i, i + 2)) / 10 * 1.8 + 32;
            // i +=2;
        }
        // HUMIDITY
        else if (channel_id === 0x04 && channel_type === 0x68) {
            decoded.humidity = bytes[i] / 2;
            i += 1;
        }
        // Wind Direction, unit degree
        else if (channel_id === 0x05 && channel_type === 0x84) {
            decoded.wind_direction = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // Barometric Pressure, unit hPa
        else if (channel_id === 0x06 && channel_type === 0x73) {
            decoded.pressure = readUInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // Wind Speed, unit m/s
        else if (channel_id === 0x07 && channel_type === 0x92) {
            decoded.wind_speed = readUInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // rainfall_total, unit mm, Frame counter to define whether device enters the new rainfall accumulation phase, it will plus 1 every upload, range: 0~255
        else if (channel_id === 0x08 && channel_type === 0x77) {
            decoded.rainfall_total = readUInt16LE(bytes.slice(i, i + 2)) / 100;
            decoded.rainfall_counter = bytes[i + 2];
            i += 3;
        } else {
            break;
        }
    }
    return decoded;
}

export const decodePayloadWTS506 = async (payload, encoded = "base64") => {
    log("WTS506Decode:decodePayload payload received ");
    let bytes;
    if (encoded === "base64") {
        const binaryString = atob(payload);
        bytes = Buffer.from(binaryString, 'binary');
    } else if (encoded === "hex") {
        bytes = Buffer.from(payload, 'hex');
    } else {
        log("Unsupported encode type");
        return;
    }

    return decodeBytes(bytes);
}
