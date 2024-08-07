'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class User extends Model {
    static associate(models) {
    }
}

User.init({
    name: DataTypes.STRING,
    guid: DataTypes.STRING,
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
export default User;