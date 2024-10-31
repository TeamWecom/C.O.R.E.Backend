'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('list_buttons', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      button_name: Sequelize.STRING,
      button_prt: Sequelize.STRING,
      button_user: {
        type: Sequelize.TEXT,
        allowNull: false,
        references: {
          model: 'users',  // Faz referência ao modelo User
          key: 'guid',  // A coluna guid no modelo User
        },
        onDelete: 'CASCADE',  // Remove as preferências se o usuário for deletado
      },
      button_type: Sequelize.STRING,
      button_type_1 : Sequelize.STRING,
      button_type_2 : Sequelize.STRING,
      button_type_3 : Sequelize.STRING,
      button_type_4 : Sequelize.STRING,
      button_device: Sequelize.STRING,
      sensor_min_threshold: Sequelize.STRING,
      sensor_max_threshold: Sequelize.STRING,
      sensor_type: Sequelize.STRING,
      gateway_id: {
        type: Sequelize.BIGINT,
        references: {
          model: 'iot_gateways', // Nome da tabela referenciada
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      create_user: Sequelize.STRING,
      page: Sequelize.STRING,
      position_x: Sequelize.STRING,
      position_y: Sequelize.STRING,
      img: Sequelize.STRING,
      muted: Sequelize.BOOLEAN,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('list_buttons');
  }
};

