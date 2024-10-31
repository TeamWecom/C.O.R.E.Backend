'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class User extends Model {
    static associate(models) {
    }
}

User.init({  
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
    name: DataTypes.STRING,
    guid: {
      type: DataTypes.TEXT,
      unique: true,  // A constraint UNIQUE é refletida no Sequelize
      allowNull: false,
    },
    email: DataTypes.STRING,
    sip: DataTypes.STRING,
    password: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    type : DataTypes.STRING
  }, {
    sequelize:db.sequelize,
    modelName: 'user',
  });
  // Definir o relacionamento entre User e UserPreferences
// Definir a associação no próprio modelo
User.associate = (models) => {
  User.hasOne(models.Preference, { foreignKey: 'guid' });
};
// Hook para criar automaticamente o user_preferences ao criar um novo user
User.afterCreate(async (user, options) => {
  const { preference } = db.sequelize.models;
  await preference.create({ guid: user.guid });
});

export default User;