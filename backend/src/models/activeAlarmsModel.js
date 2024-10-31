'use strict';
import { Model, DataTypes } from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class ActiveAlarms extends Model {
  static associate(models) {
    // Defina as associações aqui, se houver
    this.belongsTo(models.button, { foreignKey: 'btn_id', targetKey: 'id' });
  }
}

ActiveAlarms.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    from: DataTypes.STRING,
    prt: DataTypes.STRING,
    btn_id: DataTypes.BIGINT,
    date: DataTypes.STRING,
  }, {
    sequelize: db.sequelize,
    modelName: 'activeAlarms',
    tableName: 'list_active_alarms', // Defina o nome da tabela aqui
    timestamps: false
  });

export default ActiveAlarms;