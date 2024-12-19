import { Model, DataTypes } from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado

class ActionNotifies extends Model {
  static associate(models) {
    // Defina as associações aqui, se houver
    ActionNotifies.belongsTo(models.Action, { foreignKey: 'id', sourceKey: 'action_id' }); // Defina a associação com User aqui
  }
}

ActionNotifies.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  action_id: DataTypes.INTEGER,
  email_phone: DataTypes.STRING,
  parameter: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, {
  sequelize: db.sequelize,
  modelName: 'actionNotifies', // Nome do modelo com letra maiúscula conforme convenção
  tableName: 'action_user_notification', // Defina o nome da tabela aqui
  timestamps: true,
});

export default ActionNotifies;
