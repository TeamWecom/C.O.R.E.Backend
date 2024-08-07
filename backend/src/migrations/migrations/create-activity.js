'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tbl_activities', {
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
        from: {
            type: Sequelize.STRING(120)
        },
        name: {
            type: Sequelize.STRING(120)
        },
        date: {
            type: Sequelize.TEXT
        },
        status: {
            type: Sequelize.TEXT
        },
        prt: {
            type: Sequelize.TEXT
        },
        details: {
            type: Sequelize.TEXT
        }
    });
},
async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tbl_activities');
  }
};