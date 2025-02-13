'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('iot_devices_history', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sensor_name: Sequelize.STRING,
      deveui: Sequelize.STRING,
      battery: Sequelize.STRING,
      co2: Sequelize.STRING,
      humidity: Sequelize.STRING,
      temperature: Sequelize.STRING,
      leak: Sequelize.STRING,
      pir: Sequelize.STRING,
      light_level: Sequelize.STRING,
      hcho: Sequelize.STRING,
      pm2_5: Sequelize.STRING,
      pm10: Sequelize.STRING,
      o3: Sequelize.STRING,
      tvoc: Sequelize.STRING,
      pressure: Sequelize.STRING,
      magnet_status: Sequelize.BIGINT,
      tamper_status: Sequelize.BIGINT,
      daylight: Sequelize.STRING,
      image: Sequelize.STRING,
      wind_direction: Sequelize.STRING,
      wind_speed: Sequelize.STRING,
      rainfall_total: Sequelize.STRING,
      rainfall_counter: Sequelize.STRING,
      power: Sequelize.STRING,
      total_current: Sequelize.STRING,
      current: Sequelize.STRING,
      alarm: Sequelize.STRING,
      press_short: Sequelize.STRING,
      press_long: Sequelize.STRING,
      press_double: Sequelize.STRING,
      'adc-1': Sequelize.INTEGER,
      'adc-1-avg': Sequelize.INTEGER,
      'adc-1-max': Sequelize.INTEGER,
      'adc-1-min': Sequelize.INTEGER,
      'adc-2': Sequelize.INTEGER,
      'adc-2-avg': Sequelize.INTEGER,
      'adc-2-max': Sequelize.INTEGER,
      'adc-2-min': Sequelize.INTEGER,
      'adv-1': Sequelize.INTEGER,
      'adv-2': Sequelize.INTEGER,
      'counter-1': Sequelize.INTEGER,
      'counter-2': Sequelize.INTEGER,
      'counter-3': Sequelize.INTEGER,
      'counter-4': Sequelize.INTEGER,
      'gpio-in-1': Sequelize.STRING,
      'gpio-in-2': Sequelize.STRING,
      'gpio-in-3': Sequelize.STRING,
      'gpio-in-4': Sequelize.STRING,
      'gpio-out-1': Sequelize.STRING,
      'gpio-out-2': Sequelize.STRING,
      'pt100-1': Sequelize.INTEGER,
      'pt100-2': Sequelize.INTEGER,
      'people_count_all': Sequelize.INTEGER,
      'people_count_max': Sequelize.INTEGER,
      'people_in': Sequelize.INTEGER,
      'people_out': Sequelize.INTEGER,
      'people_total_in': Sequelize.INTEGER,
      'people_total_out': Sequelize.INTEGER,
      'region_1': Sequelize.INTEGER,
      'region_2': Sequelize.INTEGER,
      'region_3': Sequelize.INTEGER,
      'region_4': Sequelize.INTEGER,
      'region_5': Sequelize.INTEGER,
      'region_6': Sequelize.INTEGER,
      'region_7': Sequelize.INTEGER,
      'region_8': Sequelize.INTEGER,
      'region_9': Sequelize.INTEGER,
      'region_10': Sequelize.INTEGER,
      'region_11': Sequelize.INTEGER,
      'region_12': Sequelize.INTEGER,
      'region_13': Sequelize.INTEGER,
      'region_14': Sequelize.INTEGER,
      'region_15': Sequelize.INTEGER,
      'region_16': Sequelize.INTEGER,
      'a_to_a': Sequelize.INTEGER,
      'a_to_b': Sequelize.INTEGER,
      'a_to_c': Sequelize.INTEGER,
      'a_to_d': Sequelize.INTEGER,
      'b_to_a': Sequelize.INTEGER,
      'b_to_b': Sequelize.INTEGER,
      'b_to_c': Sequelize.INTEGER,
      'b_to_d': Sequelize.INTEGER,
      'c_to_a': Sequelize.INTEGER,
      'c_to_b': Sequelize.INTEGER,
      'c_to_c': Sequelize.INTEGER,
      'c_to_d': Sequelize.INTEGER,
      'd_to_a': Sequelize.INTEGER,
      'd_to_b': Sequelize.INTEGER,
      'd_to_c': Sequelize.INTEGER,
      'd_to_d': Sequelize.INTEGER,
      date: Sequelize.DATE
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('iot_devices_history');
  }
};
