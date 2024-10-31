'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class Call extends Model {
    static associate(models) {
    }
}
Call.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
    guid: DataTypes.STRING,
    number: DataTypes.STRING,
    call_started: DataTypes.STRING,
    call_ringing: DataTypes.DATE,
    call_connected: DataTypes.STRING,
    call_ended: DataTypes.STRING,
    status: DataTypes.INTEGER,
    direction: DataTypes.STRING,
    record_id: DataTypes.STRING,
    btn_id: DataTypes.STRING,
    call_innovaphone: DataTypes.INTEGER,
    device: DataTypes.STRING,
  }, {
    sequelize:db.sequelize,
    modelName: 'call',
    tableName: 'tbl_calls', // Defina o nome da tabela aqui
    timestamps: false
  });

export default Call;