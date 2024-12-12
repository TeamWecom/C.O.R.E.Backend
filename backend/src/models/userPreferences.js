'use strict';
import { Model, DataTypes } from 'sequelize';
import db from '../managers/databaseSequelize.js'; // Importe o sequelize configurado

class Preference extends Model {
  static associate(models) {
    Preference.belongsTo(models.User, { foreignKey: 'guid' }); // Defina a associação com User aqui
  }
}

Preference.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    guid: {
      type: DataTypes.TEXT,
      allowNull: false,
      references: {
        model: 'user', // Faz referência ao modelo User
        key: 'guid', // A coluna guid no modelo User
      },
      onDelete: 'CASCADE', // Remove as preferências se o usuário for deletado
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    pageNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pageName: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize: db.sequelize,
    tableName: 'user_preferences', // Defina o nome da tabela aqui
    modelName: 'preference',
    indexes: [
      {
        unique: true,
        fields: ['guid', 'pageNumber'], // Define a combinação como única
      },
    ],
  }
);

export default Preference;
