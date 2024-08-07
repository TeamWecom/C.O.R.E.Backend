import { log } from '../log.js';

import atob from 'atob'; // Decode base64 string
import { Buffer } from 'buffer'; // Node.js Buffer for binary data
import {readInt16LE, readInt32LE} from '../typeHelpers.js'


function decodeBytes(bytes) {
    const decoded = {};
    
    for (i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];

        // POWER STATE
        if (channel_id === 0xff && channel_type === 0x0b) {
            decoded.power = "on";
            i += 1;
        }
        // TOTAL CURRENT
        else if (channel_id === 0x03 && channel_type === 0x97) {
            decoded.total_current = readUInt32LE(bytes.slice(i, i + 4)) / 100;
            i += 4;
        }
        // CURRENT
        else if (channel_id === 0x04 && channel_type === 0x98) {
            var value = readUInt16LE(bytes.slice(i, i + 2));
            if (value === 0xffff) {
                decoded.alarm = "read failed";
            } else {
                decoded.current = value / 100;
            }
            i += 2;
        }
        else {
            break;
        }
    }

    return decoded;
}

export const decodePayloadCT100 = async (payload, encoded = "base64") => {
    log("CT10xDecode:decodePayload payload received ");
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

/* ******************************************
 * bytes to number
 ********************************************/
function readUInt8(bytes) {
    return bytes & 0xff;
}

function readInt8(bytes) {
    var ref = readUInt8(bytes);
    return ref > 0x7f ? ref - 0x100 : ref;
}

function readFloatLE(bytes) {
    // JavaScript bitwise operators yield a 32 bits integer, not a float.
    // Assume LSB (least significant byte first).
    var bits = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
    var sign = bits >>> 31 === 0 ? 1.0 : -1.0;
    var e = (bits >>> 23) & 0xff;
    var m = e === 0 ? (bits & 0x7fffff) << 1 : (bits & 0x7fffff) | 0x800000;
    var f = sign * m * Math.pow(2, e - 150);
    return f;
}

function readProtocolVersion(bytes) {
    var major = (bytes & 0xf0) >> 4;
    var minor = bytes & 0x0f;
    return "v" + major + "." + minor;
}

function readHardwareVersion(bytes) {
    var major = bytes[0] & 0xff;
    var minor = (bytes[1] & 0xff) >> 4;
    return "v" + major + "." + minor;
}

function readFirmwareVersion(bytes) {
    var major = bytes[0] & 0xff;
    var minor = bytes[1] & 0xff;
    return "v" + major + "." + minor;
}

function readSerialNumber(bytes) {
    var temp = [];
    for (var idx = 0; idx < bytes.length; idx++) {
        temp.push(("0" + (bytes[idx] & 0xff).toString(16)).slice(-2));
    }
    return temp.join("");
}

function readCurrentAlarm(type) {
    var alarm = [];
    if ((type >> 0) & 0x01) {
        alarm.push("threshold alarm");
    }
    if ((type >> 1) & 0x01) {
        alarm.push("threshold alarm release");
    }
    if ((type >> 2) & 0x01) {
        alarm.push("over range alarm");
    }
    if ((type >> 3) & 0x01) {
        alarm.push("over range alarm release");
    }
    return alarm;
}
