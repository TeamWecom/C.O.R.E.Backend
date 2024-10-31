'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_calls', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      guid: {
        type: Sequelize.TEXT,
        allowNull: false,
        references: {
          model: 'users',  // Faz referência ao modelo User
          key: 'guid',  // A coluna guid no modelo User
        },
        onDelete: 'CASCADE',  // Remove as preferências se o usuário for deletado
      },
      number: Sequelize.STRING,
      call_started: Sequelize.STRING,
      call_ringing: Sequelize.DATE,
      call_connected: Sequelize.STRING,
      call_ended: Sequelize.STRING,
      status: Sequelize.INTEGER,
      direction: Sequelize.STRING,
      record_id: Sequelize.STRING,
      btn_id: Sequelize.STRING,
      call_innovaphone: Sequelize.INTEGER,
      device: Sequelize.STRING,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tbl_calls');
  }
};