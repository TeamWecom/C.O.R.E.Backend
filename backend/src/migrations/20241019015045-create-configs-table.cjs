'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('configs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      entry: Sequelize.STRING,
      value: Sequelize.TEXT,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    // Verificar e inserir dados na tabela 'configs' se ainda não existirem
    const records = [
      { id: 1, entry: 'urlalarmserver', value: '' },
      { id: 2, entry: 'urlEnable', value: 'false' },
      { id: 3, entry: 'urlalarmserver', value: '' },
      { id: 4, entry: 'googleApiKey', value: '' },
      { id: 5, entry: 'urlPbxTableUsers', value: '' },
      { id: 6, entry: 'pbxType', value: '' },
      { id: 7, entry: 'customHeaders', value: '{}' },
      { id: 8, entry: 'licenseKey', value: '' },
      { id: 9, entry: 'licenseFile', value: '' },
      { id: 10, entry: 'chatNotification', value: '/src/assets/sounds/bleep' },
      { id: 11, entry: 'alarmNotification', value: '/src/assets/sounds/mobil' },
      { id: 12, entry: 'sensorNotification', value: '/src/assets/sounds/suspi' },
      { id: 13, entry: 'backupUsername', value: '' },
      { id: 14, entry: 'backupPassword', value: '' },
      { id: 15, entry: 'backupMethod', value: '' },
      { id: 16, entry: 'backupDay', value: '' },
      { id: 17, entry: 'backupFrequency', value: '' },
      { id: 18, entry: 'backupHour', value: '' },
      { id: 19, entry: 'backupHost', value: '' },
      { id: 20, entry: 'backupPath', value: '' },
      { id: 21, entry: 'smtpUsername', value: '' },
      { id: 22, entry: 'smtpPassword', value: '' },
      { id: 23, entry: 'smtpSecure', value: '' },
      { id: 24, entry: 'smtpHost', value: '' },
      { id: 25, entry: 'smtpPort', value: '' },
      { id: 26, entry: 'theme', value: '' },
      { id: 27, entry: 'openaiKey', value: '' },
      { id: 28, entry: 'openaiOrg', value: '' },
      { id: 29, entry: 'openaiProj', value: '' },
      { id: 30, entry: 'flicSecretApi', value: '' },
      { id: 31, entry: 'googleClientId', value: '' },
      { id: 32, entry: 'googleClientSecret', value: '' },
      { id: 33, entry: 'awsSnsKey', value: '' },
      { id: 34, entry: 'awsSnsSecret', value: '' },
      { id: 35, entry: 'awsSnsRegion', value: '' }
    ];

    for (const record of records) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO configs (id, entry, value, createdAt, updatedAt)
        VALUES (:id, :entry, :value, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
        `,
        { replacements: record }
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('configs');
  }
};
