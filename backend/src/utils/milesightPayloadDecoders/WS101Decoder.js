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
        // PRESS STATE
        else if (channel_id === 0xff && channel_type === 0x2e) {
            var type = bytes[i];
            i += 1;

            switch (type) {
                case 1:
                    decoded.press = "press_short";
                    break;
                case 2:
                    decoded.press = "press_long";
                    break;
                case 3:
                    decoded.press = "press_double";
                    break;
                default:
                    decoded.press = "unknown";
                    break;
            }
        } else {
            break;
        }
    }
    return decoded;
}

export const decodePayloadWS101 = async (payload, encoded = "base64") => {
    log("WS101Decode:decodePayload payload received ");
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
