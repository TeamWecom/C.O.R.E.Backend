
import { log } from '../log.js';

import atob from 'atob'; // Decode base64 string
import { Buffer } from 'buffer'; // Node.js Buffer for binary data
import { readInt16LE,readUInt16LE } from '../typeHelpers.js'

function decodeBytes(bytes) {
    var decoded = {};

    for (var i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];

        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // PRESS STATE
        else if (channel_id === 0xff && channel_type === 0x34) {
            var id = bytes[i];
            var btn_mode_name = "button_" + id + "_mode";
            var btn_chn_event_name = "button_" + id + "_event";
            switch (bytes[i + 1]) {
                case 0x00:
                    decoded[btn_mode_name] = ["short_press"];
                    break;
                case 0x01:
                    decoded[btn_mode_name] = ["short_press", "double_press"];
                    break;
                case 0x02:
                    decoded[btn_mode_name] = ["short_press", "long_press"];
                    break;
                case 0x03:
                    decoded[btn_mode_name] = ["short_press", "double_press", "long_press"];
                    break;
                default:
                    decoded[btn_mode_name] = ["unknown"];
            }
            switch (bytes[i + 2]) {
                case 0x00:
                    decoded[btn_chn_event_name] = "short_press";
                    break;
                case 0x01:
                    decoded[btn_chn_event_name] = "double_press";
                    break;
                case 0x02:
                    decoded[btn_chn_event_name] = "long_press";
                    break;
                default:
                    decoded[btn_chn_event_name] = "unknown";
            }
            i += 3;
        } else {
            break;
        }
    }
    return decoded;
}

export const decodePayloadWS156 = async (payload, encoded = "base64") => {
    log("WS156Decode:decodePayload payload received ");
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


