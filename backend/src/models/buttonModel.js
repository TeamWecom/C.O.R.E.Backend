'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class Button extends Model {
    static associate(models) {
      this.hasMany(models.activeAlarms, { foreignKey: 'btn_id', sourceKey: 'id' });
    }
  }
Button.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
      button_name : DataTypes.STRING,
      button_prt : DataTypes.STRING,
      button_user : DataTypes.STRING,
      button_type : DataTypes.STRING,
      button_type_1 : DataTypes.STRING,
      button_type_2 : DataTypes.STRING,
      button_type_3 : DataTypes.STRING,
      button_type_4 : DataTypes.STRING,
      button_device : DataTypes.STRING,
      sensor_min_threshold : DataTypes.STRING,
      sensor_max_threshold : DataTypes.STRING,
      sensor_type : DataTypes.STRING,
      gateway_id : DataTypes.BIGINT,
      create_user : DataTypes.STRING,
      page : DataTypes.STRING,
      position_x : DataTypes.STRING,
      position_y : DataTypes.STRING,
      calendar_id : DataTypes.STRING,
      img : DataTypes.STRING,
      muted: DataTypes.BOOLEAN,
      createdAt : DataTypes.DATE,
      updatedAt : DataTypes.DATE
    }, {
      sequelize: db.sequelize,
      modelName: 'button',
      tableName: 'list_buttons', // Defina o nome da tabela aqui
      timestamps: true
    });

    // Definir a associação no próprio modelo
    Button.associate = (models) => {
      Button.belongsTo(models.User, { foreignKey: 'guid' });
  };

export default Button;