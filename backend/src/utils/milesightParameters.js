import { log } from './log.js';
const devices = {
    'UC300': [
        { name: "Digital Input 1", parameter: "gpio-in-1" },
        { name: "Digital Input 2", parameter: "gpio-in-2" },
        { name: "Digital Input 3", parameter: "gpio-in-3" },
        { name: "Digital Input 4", parameter: "gpio-in-4" },
        { name: "Digital Input as Counter 1", parameter: "counter-1" },
        { name: "Digital Input as Counter 2", parameter: "counter-2" },
        { name: "Digital Input as Counter 3", parameter: "counter-3" },
        { name: "Digital Input as Counter 4", parameter: "counter-4" },
        { name: "Digital Output 1", parameter: "gpio-out-1" },
        { name: "Digital Output 2", parameter: "gpio-out-2" },
        { name: "PT100 1", parameter: "pt100-1" },
        { name: "PT100 2", parameter: "pt100-2" },
        { name: "Analog to Digital (current) 1", parameter: "adc-1" },
        { name: "Analog to Digital (current) 2", parameter: "adc-2" },
        { name: "Analog to Digital (voltage) 1", parameter: "adv-1" },
        { name: "Analog to Digital (voltage) 2", parameter: "adv-2" },
        { name: "PT100 1(max)", parameter: "pt100-1-max" },
        { name: "PT100 1(min)", parameter: "pt100-1-min" },
        { name: "PT100 1(avg)", parameter: "pt100-1-avg" },
        { name: "PT100 2(max)", parameter: "pt100-2-max" },
        { name: "PT100 2(min)", parameter: "pt100-2-min" },
        { name: "PT100 2(avg)", parameter: "pt100-2-avg" },
        { name: "Analog to Digital (current) 1(max)", parameter: "adc-1-max" },
        { name: "Analog to Digital (current) 1(min)", parameter: "adc-1-min" },
        { name: "Analog to Digital (current) 1(avg)", parameter: "adc-1-avg" },
        { name: "Analog to Digital (current) 2(max)", parameter: "adc-2-max" },
        { name: "Analog to Digital (current) 2(min)", parameter: "adc-2-min" },
        { name: "Analog to Digital (current) 2(avg)", parameter: "adc-2-avg" },
        { name: "Analog to Digital (voltage) 1(max)", parameter: "adv-1-max" },
        { name: "Analog to Digital (voltage) 1(min)", parameter: "adv-1-min" },
        { name: "Analog to Digital (voltage) 1(avg)", parameter: "adv-1-avg" },
        { name: "Analog to Digital (voltage) 2(max)", parameter: "adv-2-max" },
        { name: "Analog to Digital (voltage) 2(min)", parameter: "adv-2-min" },
        { name: "Analog to Digital (voltage) 2(avg)", parameter: "adv-2-avg" }
    ],
    'UC50X': [
        { name: "Digital Input 1", parameter: "gpio-in-1" },
        { name: "Digital Input 2", parameter: "gpio-in-2" },
        { name: "Digital Input 3", parameter: "gpio-in-3" },
        { name: "Digital Input 4", parameter: "gpio-in-4" },
        { name: "Digital Input as Counter 1", parameter: "counter-1" },
        { name: "Digital Input as Counter 2", parameter: "counter-2" },
        { name: "Digital Input as Counter 3", parameter: "counter-3" },
        { name: "Digital Input as Counter 4", parameter: "counter-4" },
        { name: "Digital Output 1", parameter: "gpio-out-1" },
        { name: "Digital Output 2", parameter: "gpio-out-2" },
        { name: "PT100 1", parameter: "pt100-1" },
        { name: "PT100 2", parameter: "pt100-2" },
        { name: "Analog to Digital (current) 1", parameter: "adc-1" },
        { name: "Analog to Digital (current) 2", parameter: "adc-2" },
        { name: "Analog to Digital (voltage) 1", parameter: "adv-1" },
        { name: "Analog to Digital (voltage) 2", parameter: "adv-2" },
        { name: "PT100 1(max)", parameter: "pt100-1-max" },
        { name: "PT100 1(min)", parameter: "pt100-1-min" },
        { name: "PT100 1(avg)", parameter: "pt100-1-avg" },
        { name: "PT100 2(max)", parameter: "pt100-2-max" },
        { name: "PT100 2(min)", parameter: "pt100-2-min" },
        { name: "PT100 2(avg)", parameter: "pt100-2-avg" },
        { name: "Analog to Digital (current) 1(max)", parameter: "adc-1-max" },
        { name: "Analog to Digital (current) 1(min)", parameter: "adc-1-min" },
        { name: "Analog to Digital (current) 1(avg)", parameter: "adc-1-avg" },
        { name: "Analog to Digital (current) 2(max)", parameter: "adc-2-max" },
        { name: "Analog to Digital (current) 2(min)", parameter: "adc-2-min" },
        { name: "Analog to Digital (current) 2(avg)", parameter: "adc-2-avg" },
        { name: "Analog to Digital (voltage) 1(max)", parameter: "adv-1-max" },
        { name: "Analog to Digital (voltage) 1(min)", parameter: "adv-1-min" },
        { name: "Analog to Digital (voltage) 1(avg)", parameter: "adv-1-avg" },
        { name: "Analog to Digital (voltage) 2(max)", parameter: "adv-2-max" },
        { name: "Analog to Digital (voltage) 2(min)", parameter: "adv-2-min" },
        { name: "Analog to Digital (voltage) 2(avg)", parameter: "adv-2-avg" }
    ],
    'AM103': [
        { name: "Battery", parameter: "battery" },
        { name: "Temperature", parameter: "temperature" },
        { name: "Humidity", parameter: "humidity" }
    ],
    'AM103': [
        { name: "Battery", parameter: "battery" },
        { name: "Temperature", parameter: "temperature" },
        { name: "Humidity", parameter: "humidity" },
        { name: "CO2", parameter: "co2" }
    ],
    'AM104': [
        { name: "Battery", parameter: "battery" },
        { name: "Temperature", parameter: "temperature" },
        { name: "Humidity", parameter: "humidity" },
        { name: "Illumination", parameter: "illumination" },
        { name: "Activity", parameter: "activity" },

    ],
    'AM107': [
        { name: "Battery", parameter: "battery" },
        { name: "Temperature", parameter: "temperature" },
        { name: "Humidity", parameter: "humidity" },
        { name: "CO2", parameter: "co2" },
        { name: "tVOC", parameter: "tvoc" },
        { name: "Pressure", parameter: "pressure" },
        { name: "Illumination", parameter: "illumination" },
        { name: "Activity", parameter: "activity" },

    ],
    'AM300': [
        { name: "Battery", parameter: "battery" },
        { name: "Temperature", parameter: "temperature" },
        { name: "Humidity", parameter: "humidity" },
        { name: "PIR", parameter: "pir" },
        { name: "Light Level", parameter: "light_level" },
        { name: "CO2", parameter: "co2" },
        { name: "tVOC", parameter: "tvoc" },
        { name: "Pressure", parameter: "pressure" },
        { name: "HCHO", parameter: "hcho" },
        { name: "PM2.5", parameter: "pm2_5" },
        { name: "PM10", parameter: "pm10" },
        { name: "O3", parameter: "o3" },
        { name: "Beep", parameter: "beep" }
    ],
    'AM307': [
        { name: "Battery", parameter: "battery" },
        { name: "Temperature", parameter: "temperature" },
        { name: "Humidity", parameter: "humidity" },
        { name: "PIR", parameter: "pir" },
        { name: "Light Level", parameter: "light_level" },
        { name: "CO2", parameter: "co2" },
        { name: "tVOC", parameter: "tvoc" },
        { name: "Pressure", parameter: "pressure" },
        { name: "HCHO", parameter: "hcho" },
        { name: "PM2.5", parameter: "pm2_5" },
        { name: "PM10", parameter: "pm10" },
        { name: "O3", parameter: "o3" },
        { name: "Beep", parameter: "beep" }
    ],
    'CT101': [
        { name: "Power Status", parameter: "power" },
        { name: "Total Current", parameter: "total_ah" },
        { name: "Current", parameter: "current" }
    ],
    'CT103': [
        { name: "Power Status", parameter: "power" },
        { name: "Total Current", parameter: "total_ah" },
        { name: "Current", parameter: "current" }
    ],
    'WS202': [
        { name: "Battery", parameter: "battery" },
        { name: "Pir", parameter: "pir" },
        { name: "Daylight", parameter: "daylight" }
    ],
    'WS301': [
        { name: "Battery", parameter: "battery" },
        { name: "Magnet Status", parameter: "magnet_status" },
        { name: "Tamper Status", parameter: "tamper_status" }
    ],
    'WS101': [
        { name: "Battery", parameter: "battery" },
        { name: "Button Press", parameter: "press_short" },
        { name: "Long Button Press", parameter: "press_long" },
        { name: "Double Button Press", parameter: "press_double" }
    ],
    'WS156': [
        { name: "Battery", parameter: "battery" },
        { name: "Button Press", parameter: "short_press" },
        { name: "Long Button Press", parameter: "long_press" },
        { name: "Double Button Press", parameter: "double_press" }
    ],
    'EM300-SLD': [
        { name: "Battery", parameter: "battery" },
        { name: "Temperature", parameter: "temperature" },
        { name: "Humidity", parameter: "humidity" },
        { name: "Leakage Status", parameter: "leak" }
    ],
    'EM300-TH': [
        { name: "Battery", parameter: "battery" },
        { name: "Temperature", parameter: "temperature" },
        { name: "Humidity", parameter: "humidity" }
    ],
    'WTS506': [
        { name: "Battery", parameter: "battery" },
        { name: "Temperature", parameter: "temperature" },
        { name: "Humidity", parameter: "humidity" },
        { name: "Wind Direction", parameter: "wind_direction" },
        { name: "Pressure", parameter: "pressure" },
        { name: "Wind Speed", parameter: "wind_speed" },
        { name: "Rainfall Total", parameter: "rainfall_total" },
        { name: "Rainfall Counter", parameter: "rainfall_counter" }
    ]

};

export const getParametersByDeviceName = (devName) =>{
    try{
        //log('milesightParamters:getParamtersByDeviceName:: test to identify the correct parameter for this device name '+devName)
        return devices[devName] || [];
    }catch(e){
        log('milesightParamters:getParamtersByDeviceName:: error '+e)
        return e
    }
}
