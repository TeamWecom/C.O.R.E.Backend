'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      chat_id: Sequelize.STRING,
      from_guid: Sequelize.STRING,
      to_guid: Sequelize.STRING,
      date: Sequelize.STRING,
      msg: Sequelize.STRING,
      delivered: Sequelize.STRING,
      read: Sequelize.STRING,
      type: Sequelize.STRING,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tbl_messages');
  }
};
