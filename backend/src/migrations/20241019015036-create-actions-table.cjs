'use strict';

const { Model } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('list_actions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      action_name: Sequelize.STRING,
      action_start_prt: Sequelize.STRING,
      action_start_type: Sequelize.STRING,
      action_start_device: Sequelize.STRING,
      action_start_device_parameter: Sequelize.STRING,
      action_exec_prt: Sequelize.STRING,
      action_exec_user: Sequelize.STRING,
      action_exec_type: Sequelize.STRING,
      action_exec_type_command_mode: Sequelize.STRING,
      action_exec_device: Sequelize.STRING,
      create_user: {
        type: Sequelize.TEXT,
        allowNull: false,
        references: {
          model: 'users',  // Faz referência ao modelo User
          key: 'guid',  // A coluna guid no modelo User
        },
        onDelete: 'CASCADE',  // Remove as preferências se o usuário for deletado
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('list_actions');
  }
};

