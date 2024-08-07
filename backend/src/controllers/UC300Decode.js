import { log } from '../utils/log.js';

import atob from 'atob'; // Decode base64 string
import { Buffer } from 'buffer'; // Node.js Buffer for binary data

const gpio_in_chns = [0x03, 0x04, 0x05, 0x06];
const gpio_out_chns = [0x07, 0x08];
const pt100_chns = [0x09, 0x0A];
const ai_chns = [0x0B, 0x0C];
const av_chns = [0x0D, 0x0E];

function decodeBytes(bytes) {
    log("bytes:", bytes.toString('hex'));
    const decoded = {};
    let i = 0;

    while (i < bytes.length) {
        const channel_id = bytes[i];
        const channel_type = bytes[i + 1];
        i += 2;

        // GPIO Input
        if (gpio_in_chns.includes(channel_id) && channel_type === 0x00) {
            const id = channel_id - gpio_in_chns[0] + 1;
            const channel_name = `gpio_in_${id}`;
            decoded[channel_name] = bytes[i] === 0 ? "off" : "on";
            i += 1;
        }
        // GPIO Output
        else if (gpio_out_chns.includes(channel_id) && channel_type === 0x01) {
            const id = channel_id - gpio_out_chns[0] + 1;
            const channel_name = `gpio_out_${id}`;
            decoded[channel_name] = bytes[i] === 0 ? "off" : "on";
            i += 1;
        }
        // GPIO as counter
        else if (gpio_in_chns.includes(channel_id) && channel_type === 0xC8) {
            const id = channel_id - gpio_in_chns[0] + 1;
            const channel_name = `counter_${id}`;
            decoded[channel_name] = bytes.readUInt32LE(i);
            i += 4;
        }
        // PT100
        else if (pt100_chns.includes(channel_id) && channel_type === 0x67) {
            const id = channel_id - pt100_chns[0] + 1;
            const channel_name = `pt100_${id}`;
            decoded[channel_name] = bytes.readInt16LE(i) / 10;
            i += 2;
        }
        // ADC Channel
        else if (ai_chns.includes(channel_id) && channel_type === 0x02) {
            const id = channel_id - ai_chns[0] + 1;
            const channel_name = `adc_${id}`;
            decoded[channel_name] = bytes.readUInt32LE(i) / 100;
            i += 4;
        }
        // ADC Channel for Voltage
        else if (av_chns.includes(channel_id) && channel_type === 0x02) {
            const id = channel_id - av_chns[0] + 1;
            const channel_name = `adv_${id}`;
            decoded[channel_name] = bytes.readUInt32LE(i) / 100;
            i += 4;
        }
        // Modbus
        else if (channel_id === 0xFF && channel_type === 0x19) {
            const modbus_chn_id = bytes[i] + 1;
            const data_length = bytes[i + 1];
            const data_type = bytes[i + 2];
            const sign = data_type >> 7;
            i += 3;
            const chn = `chn${modbus_chn_id}`;
            switch (data_type) {
                case 0:
                    decoded[chn] = bytes[i] === 0 ? "off" : "on";
                    i += 1;
                    break;
                case 1:
                    decoded[chn] = bytes[i];
                    i += 1;
                    break;
                case 2:
                case 3:
                    decoded[chn] = bytes.readInt16LE(i);
                    i += 2;
                    break;
                case 4:
                case 6:
                    decoded[chn] = bytes.readInt32LE(i);
                    i += 4;
                    break;
                case 8:
                case 10:
                    decoded[chn] = bytes.readInt16LE(i);
                    i += 4;
                    break;
                case 9:
                case 11:
                    decoded[chn] = bytes.readInt32LE(i);
                    i += 4;
                    break;
                case 5:
                case 7:
                    decoded[chn] = bytes.readFloatLE(i);
                    i += 4;
                    break;
                default:
                    break;
            }
        }
        // Modbus Read Error
        else if (channel_id === 0xFF && channel_type === 0x15) {
            const modbus_chn_id = bytes[i] + 1;
            const channel_name = `channel_${modbus_chn_id}_error`;
            decoded[channel_name] = true;
            i += 1;
        }
        // ADC (Statistics)
        else if (ai_chns.includes(channel_id) && channel_type === 0xE2) {
            const id = channel_id - ai_chns[0] + 1;
            const channel_name = `adc_${id}`;
            if (i + 8 <= bytes.length) {
                decoded[channel_name] = bytes.readFloatLE(i);
                decoded[`${channel_name}_min`] = bytes.readFloatLE(i + 2);
                decoded[`${channel_name}_max`] = bytes.readFloatLE(i + 4);
                decoded[`${channel_name}_avg`] = bytes.readFloatLE(i + 6);
                i += 8;
            } else {
                break;
            }
        }
        // PT100 (Statistics)
        else if (pt100_chns.includes(channel_id) && channel_type === 0xE2) {
            const id = channel_id - pt100_chns[0] + 1;
            const channel_name = `pt100_${id}`;
            if (i + 8 <= bytes.length) {
                decoded[channel_name] = bytes.readFloatLE(i);
                decoded[`${channel_name}_min`] = bytes.readFloatLE(i + 2);
                decoded[`${channel_name}_max`] = bytes.readFloatLE(i + 4);
                decoded[`${channel_name}_avg`] = bytes.readFloatLE(i + 6);
                i += 8;
            } else {
                break;
            }
        }
        // Modbus History Data
        else if (channel_id === 0x20 && channel_type === 0xDC) {
            const timestamp = bytes.readUInt32LE(i);
            const channel_mask = Array.from(bytes.slice(i + 4, i + 6).toString('binary')).map(Number);
            i += 6;

            const data = { timestamp };
            for (let j = 0; j < channel_mask.length; j++) {
                if (channel_mask[j] !== 1) continue;

                // GPIO Input
                if (j < 4) {
                    const type = bytes[i];
                    // As GPIO Input
                    if (type === 0) {
                        const name = `gpio_in_${j + 1}`;
                        data[name] = bytes[i + 1] === 0 ? "off" : "on";
                        i += 2;
                    }
                    // As Counter
                    else {
                        const name = `counter_${j + 1}`;
                        data[name] = bytes.readUInt32LE(i + 1);
                        i += 5;
                    }
                }
                // GPIO Output
                else if (j < 6) {
                    const name = `gpio_out_${j - 4 + 1}`;
                    data[name] = bytes[i] === 0 ? "off" : "on";
                    i += 1;
                }
                // PT100
                else if (j < 8) {
                    const name = `pt100_${j - 6 + 1}`;
                    data[name] = bytes.readFloatLE(i);
                    i += 2;
                }
                // ADC
                else if (j < 10) {
                    const name = `adc_${j - 8 + 1}`;
                    data[name] = bytes.readFloatLE(i);
                    data[`${name}_max`] = bytes.readFloatLE(i + 2);
                    data[`${name}_min`] = bytes.readFloatLE(i + 4);
                    data[`${name}_avg`] = bytes.readFloatLE(i + 6);
                    i += 8;
                }
                // ADV
                else if (j < 12) {
                    const name = `adv_${j - 10 + 1}`;
                    data[name] = bytes.readFloatLE(i);
                    data[`${name}_max`] = bytes.readFloatLE(i + 2);
                    data[`${name}_min`] = bytes.readFloatLE(i + 4);
                    data[`${name}_avg`] = bytes.readFloatLE(i + 6);
                    i += 8;
                }
            }
            if (!decoded["channel_history_data"]) {
                decoded["channel_history_data"] = [];
            }
            decoded["channel_history_data"].push(data);
        }
    }

    log(decoded);
    return decoded;
}

export const decodePayload = async (payload, encoded = "base64") => {
    log("danilo-req UC300:decodePayload payload received ", JSON.stringify(payload));
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
