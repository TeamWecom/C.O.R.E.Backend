'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class Camera extends Model {
    static associate(models) {
    }
}

Camera.init({
    mac: DataTypes.STRING,
    nickname: DataTypes.STRING,
    create_user: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize:db.sequelize,
    tableName: 'iot_cameras', // Defina o nome da tabela aqui
    modelName: 'camera',
  });
export default Camera;