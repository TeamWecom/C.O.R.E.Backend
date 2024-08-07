'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado

class iotDevicesHistory extends Model {
    static associate(models) {
    }
}

iotDevicesHistory.init({
    sensor_name: DataTypes.STRING,
    deveui: DataTypes.STRING,
    battery: DataTypes.STRING,
    co2: DataTypes.STRING,
    humidity: DataTypes.STRING,
    temperature: DataTypes.STRING,
    leak: DataTypes.STRING,
    pir: DataTypes.STRING,
    light_level: DataTypes.STRING,
    hcho: DataTypes.STRING,
    pm2_5: DataTypes.STRING,
    pm10: DataTypes.STRING,
    o3: DataTypes.STRING,
    tvoc: DataTypes.STRING,
    pressure: DataTypes.STRING,
    magnet_status: DataTypes.BIGINT,
    tamper_status: DataTypes.BIGINT,
    daylight: DataTypes.STRING,
    image: DataTypes.STRING,
    wind_direction: DataTypes.STRING,
    wind_speed: DataTypes.STRING,
    rainfall_total: DataTypes.STRING,
    rainfall_counter: DataTypes.STRING,
    power: DataTypes.STRING,
    total_current: DataTypes.STRING,
    current: DataTypes.STRING,
    alarm: DataTypes.STRING,
    press: DataTypes.STRING,
    'adc-1': DataTypes.INTEGER,
    'adc-1-avg': DataTypes.NUMBER,
    'adc-1-max': DataTypes.INTEGER,
    'adc-1-min': DataTypes.INTEGER,
    'adc-2': DataTypes.INTEGER,
    'adc-2-avg': DataTypes.NUMBER,
    'adc-2-max': DataTypes.INTEGER,
    'adc-2-min': DataTypes.INTEGER,
    'adv-1': DataTypes.INTEGER,
    'adv-2': DataTypes.INTEGER,
    'counter-1': DataTypes.INTEGER,
    'counter-2': DataTypes.INTEGER,
    'counter-3': DataTypes.INTEGER,
    'counter-4': DataTypes.INTEGER,
    'gpio-in-1': DataTypes.STRING,
    'gpio-in-2': DataTypes.STRING,
    'gpio-in-3': DataTypes.STRING,
    'gpio-in-4': DataTypes.STRING,
    'gpio-out-1': DataTypes.STRING,
    'gpio-out-2': DataTypes.STRING,
    'pt100-1': DataTypes.INTEGER,
    'pt100-2': DataTypes.INTEGER,
    date: DataTypes.DATE
  }, {
    sequelize: db.sequelize,
    modelName: 'iotDevicesHistory',
    tableName: 'iot_devices_history', // Defina o nome da tabela aqui
    timestamps: false  
});
export default iotDevicesHistory;;