'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: Sequelize.STRING,
      guid: {
        type: Sequelize.TEXT,
        unique: true,  // A constraint UNIQUE é refletida no Sequelize
        allowNull: false,
      },
      email: Sequelize.STRING,
      sip: Sequelize.STRING,
      password: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
      type : Sequelize.STRING,
      mobileToken: Sequelize.STRING
    });

    // Inserir os dados na tabela 'users'
    await queryInterface.bulkInsert('users', [
      {
        name: 'Administrador',
        email: 'admin@wecom.com.br',
        password: '$2a$15$OFM4/8HzxjsFvzVz57T1ie6CwLWroYkDtSE1v4mttNcx993CU2xCW',
        createdAt: new Date(),
        updatedAt: new Date(),
        type: 'admin',
        guid: '6969696969696969696'
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};