'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('list_buttons', {
      id: {
        allowNull: false,
        autoIncrement: true,
        unique: true,
        primaryKey: true,
        type: Sequelize.BIGSERIAL
      },
      button_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      button_prt: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      button_prt_user: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      button_user: {
        allowNull: false,
        type: Sequelize.STRING
      },
      button_type: {
        allowNull: false,
        type: Sequelize.STRING
      },
      action_prt: {
        allowNull: false,
        type: Sequelize.STRING
      },
      button_type_1: {
        allowNull: true,
        type: Sequelize.STRING
      },
      button_type_2: {
        allowNull: true,
        type: Sequelize.STRING
      },
      button_type_3: {
        allowNull: true,
        type: Sequelize.STRING
      },
      button_type_4: {
        allowNull: true,
        type: Sequelize.STRING
      },
      button_device: {
        allowNull: true,
        type: Sequelize.STRING
      },
      sensor_min_threshold: {
        allowNull: true,
        type: Sequelize.STRING
      },
      sensor_max_threshold: {
        allowNull: true,
        type: Sequelize.STRING
      },
      sensor_type: {
        allowNull: true,
        type: Sequelize.STRING
      },
      create_user: {
        allowNull: true,
        type: Sequelize.STRING
      },
      page: {
        allowNull: true,
        type: Sequelize.STRING
      },
      position_x: {
        allowNull: true,
        type: Sequelize.STRING
      },
      position_y: {
        allowNull: true,
        type: Sequelize.STRING
      },
      img: {
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
    await queryInterface.dropTable('list_buttons');
  }
};