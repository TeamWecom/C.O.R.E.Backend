import { log } from '../log.js';

import atob from 'atob'; // Decode base64 string
import { Buffer } from 'buffer'; // Node.js Buffer for binary data
import {readInt16LE} from '../typeHelpers.js'

function decodeBytes(bytes) {
    const decoded = {};
    for (var i = 0; i < bytes.length;) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];
        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // MAGNET STATUS (0: Close 1: Open)
        else if (channel_id === 0x03 && channel_type === 0x00) {
            decoded.magnet_status = bytes[i] //=== 0 ? "closed" : "open";;
            i += 1;
        }
        // TAMPER STATUS (0: Install 1: Removed)
        else if (channel_id === 0x04 && channel_type === 0x00) {
            decoded.tamper_status = bytes[i];
            i += 1;
        } else {
            break;
        }
    }
    return decoded;
}

export const decodePayloadWS301 = async (payload, encoded = "base64") => {
    log("WS301Decode:decodePayload payload received ");
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
