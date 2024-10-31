'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_preferences', {
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
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
      page1 : Sequelize.STRING,
      page2 : Sequelize.STRING,
      page3 : Sequelize.STRING,
      page4 : Sequelize.STRING,
      page5 : Sequelize.STRING
    });

    // Inserir os dados na tabela 'user_preferences'
    await queryInterface.bulkInsert('user_preferences', [
      {
        guid: '6969696969696969696',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_preferences');
  }
};
