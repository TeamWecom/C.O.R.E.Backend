'use strict';
import { Model, DataTypes } from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class Availabilitiy extends Model {
  static associate(models) {
    // Defina as associações aqui, se houver
  }
}

Availabilitiy.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
    guid: DataTypes.STRING,
    name: DataTypes.STRING,
    date: DataTypes.DATE,
    status: DataTypes.STRING,
    details: DataTypes.STRING
}, {
    sequelize: db.sequelize,
    modelName: 'availability',
    tableName: 'tbl_availability', // Defina o nome da tabela aqui
    timestamps: false
});
export default Availabilitiy;