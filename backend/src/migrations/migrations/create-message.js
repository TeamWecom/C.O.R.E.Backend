'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tbl_messages', {
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
        from_from: {
            type: Sequelize.STRING(120)
        },
        to_guid: {
            type: Sequelize.STRING(120)
        },
        date: {
            type: Sequelize.TEXT
        },
        msg: {
            type: Sequelize.TEXT
        },
        delivered: {
            type: Sequelize.TEXT
        },
        read: {
            type: Sequelize.TEXT
        }
        
    });
},
async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tbl_activities');
  }
};