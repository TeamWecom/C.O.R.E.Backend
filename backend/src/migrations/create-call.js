'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tbl_calls', {
      id: {
        allowNull: false,
        autoIncrement: true,
        unique: true,
        primaryKey: true,
        type: Sequelize.BIGSERIAL
      },
      guid: {
          type: Sequelize.STRING(120),
          allowNull: false,
          unique: true
      },
      number: {
          type: Sequelize.STRING(120)
      },
      call_started: {
          type: Sequelize.TEXT
      },
      call_ringing: {
          type: Sequelize.TEXT
      },
      call_connected: {
          type: Sequelize.TEXT
      },
      call_ended: {
          type: Sequelize.TEXT
      },
      status: {
          type: Sequelize.TEXT
      },
      direction: {
          type: Sequelize.TEXT
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tbl_calls');
  }
};