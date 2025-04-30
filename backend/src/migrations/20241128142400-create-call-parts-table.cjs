'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tbl_calls_parts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      record_id: Sequelize.STRING,
      ssrc : Sequelize.STRING,
      srcIP: Sequelize.STRING,
      srcPort : Sequelize.STRING,
      destIP: Sequelize.STRING,
      destPort : Sequelize.STRING,
      startTime : Sequelize.TEXT,
      endTime: Sequelize.TEXT,
      lostPkts: Sequelize.TEXT,
      payload: Sequelize.STRING,
      pktsCount: Sequelize.TEXT,
      maxJitter: Sequelize.TEXT,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tbl_calls_parts');
  }
};

