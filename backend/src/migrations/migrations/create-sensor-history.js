'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('list_sensors_history', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.BIGSERIAL
        },
        sensor_name: {
            type: DataTypes.TEXT
        },
        battery: {
            type: DataTypes.TEXT
        },
        co2: {
            type: DataTypes.TEXT
        },
        humidity: {
            type: DataTypes.TEXT
        },
        temperature: {
            type: DataTypes.TEXT
        },
        leak: {
            type: DataTypes.TEXT
        },
        pir: {
            type: DataTypes.TEXT
        },
        light: {
            type: DataTypes.TEXT
        },
        tvoc: {
            type: DataTypes.TEXT
        },
        pressure: {
            type: DataTypes.TEXT
        },
        date: {
            type: DataTypes.DATE
        }

        
    });
},
async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('list_sensors_history');
  }
};