'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class Gateway extends Model {
    static associate(models) {
    }
}

Gateway.init({
    host: DataTypes.STRING,
    userapi: DataTypes.STRING,
    password: DataTypes.STRING,
    nickname: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize:db.sequelize,
    tableName: 'iot_gateways', // Defina o nome da tabela aqui
    modelName: 'gateway',
  });
export default Gateway;