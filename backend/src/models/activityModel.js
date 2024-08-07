'use strict';
import { Model, DataTypes } from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class Activity extends Model {
  static associate(models) {
    // Defina as associações aqui, se houver
  }
}

Activity.init({
    guid: DataTypes.STRING,
    from: DataTypes.STRING,
    name: DataTypes.STRING,
    date: DataTypes.DATE,
    status: DataTypes.STRING,
    prt: DataTypes.STRING,
    details: DataTypes.STRING
  }, {
    sequelize: db.sequelize,
    modelName: 'activity',
    tableName: 'tbl_activities', // Defina o nome da tabela aqui
    timestamps: false
  });

export default Activity;