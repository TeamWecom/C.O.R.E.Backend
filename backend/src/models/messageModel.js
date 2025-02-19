'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js';
class Message extends Model {
  static associate(models) {
  }
}
  Message.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    chat_id: DataTypes.STRING,
    from_guid: DataTypes.STRING,
    to_guid: DataTypes.STRING,
    date: DataTypes.STRING,
    msg: DataTypes.STRING,
    delivered: DataTypes.STRING,
    read: DataTypes.STRING,
    type: DataTypes.STRING,
  }, {
    sequelize:db.sequelize,
    modelName: 'message',
    tableName: 'tbl_messages', // Defina o nome da tabela aqui
    timestamps: false
  });
export default Message;