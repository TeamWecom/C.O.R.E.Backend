'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('list_alarm_actions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        unique: true,
        primaryKey: true,
        type: Sequelize.BIGSERIAL
      },
      action_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      action_alarm_code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      action_start_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      action_sensor_name: {
        allowNull: true,
        type: Sequelize.STRING
      },
      action_sensor_type: {
        allowNull: true,
        type: Sequelize.STRING
      },
      action_prt: {
        allowNull: false,
        type: Sequelize.STRING
      },
      action_user: {
        allowNull: false,
        type: Sequelize.STRING
      },
      action_type: {
        allowNull: false,
        type: Sequelize.STRING
      },
      action_device: {
        allowNull: true,
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        allowNull: true,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('list_alarm_actions');
  }
};