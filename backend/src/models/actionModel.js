import { Model, DataTypes } from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado

class Action extends Model {
  static associate(models) {
    // Defina as associações aqui, se houver
  }
}

Action.init({
  action_name: DataTypes.STRING,
  action_start_prt: DataTypes.STRING,
  action_start_type: DataTypes.STRING,
  action_start_device: DataTypes.STRING,
  action_start_device_parameter: DataTypes.STRING,
  action_exec_prt: DataTypes.STRING,
  action_exec_user: DataTypes.STRING,
  action_exec_type: DataTypes.STRING,
  action_exec_type_command_mode: DataTypes.STRING,
  action_exec_device: DataTypes.STRING,
  create_user: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, {
  sequelize: db.sequelize,
  modelName: 'action', // Nome do modelo com letra maiúscula conforme convenção
  tableName: 'list_actions', // Defina o nome da tabela aqui
  timestamps: true,
});

export default Action;
