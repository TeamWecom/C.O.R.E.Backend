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
        chat_id: {
            type: Sequelize.STRING(120),
            allowNull: false
        },
        from_guid: {
            type: Sequelize.TEXT
        },
        to_guid: {
            type: Sequelize.TEXT
        },
        date: {
            type: Sequelize.DATE
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
    await queryInterface.dropTable('tbl_messages');
  }
};