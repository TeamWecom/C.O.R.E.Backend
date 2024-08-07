'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado

class sensorHistory extends Model {
    static associate(models) {
    }
}

  sensorHistory.init({
    sensor_name: DataTypes.STRING,
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
    image: DataTypes.STRING,
    adc_1: DataTypes.INTEGER,
    adc_1_avg: DataTypes.NUMBER,
    adc_1_max: DataTypes.INTEGER,
    adc_1_min: DataTypes.INTEGER,
    adc_2: DataTypes.INTEGER,
    adc_2_avg: DataTypes.NUMBER,
    adc_2_max: DataTypes.INTEGER,
    adc_2_min: DataTypes.INTEGER,
    adv_1: DataTypes.INTEGER,
    adv_2: DataTypes.INTEGER,
    counter_1: DataTypes.INTEGER,
    counter_2: DataTypes.INTEGER,
    counter_3: DataTypes.INTEGER,
    counter_4: DataTypes.INTEGER,
    gpio_in_1: DataTypes.STRING,
    gpio_in_2: DataTypes.STRING,
    gpio_in_3: DataTypes.STRING,
    gpio_in_4: DataTypes.STRING,
    gpio_out_1: DataTypes.STRING,
    gpio_out_2: DataTypes.STRING,
    pt100_1: DataTypes.INTEGER,
    pt100_2: DataTypes.INTEGER,
    date: DataTypes.DATE
  }, {
    sequelize: db.sequelize,
    modelName: 'sensorHistory',
    tableName: 'list_sensors_history', // Defina o nome da tabela aqui
    timestamps: false  
});
export default sensorHistory;;