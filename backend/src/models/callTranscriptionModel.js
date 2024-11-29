'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class Transcription extends Model {
    static associate(models) {
      this.hasMany(models.Call, { foreignKey: 'id', sourceKey: 'call_id' });
    }
  }
  Transcription.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
      call_id : DataTypes.INTEGER,
      text : DataTypes.STRING,
      create_user : DataTypes.STRING,
      createdAt : DataTypes.DATE,
      updatedAt : DataTypes.DATE
    }, {
      sequelize: db.sequelize,
      modelName: 'callTranscription',
      tableName: 'tbl_calls_transcription', // Defina o nome da tabela aqui
      timestamps: true
    });

    // Definir a associação no próprio modelo
    Transcription.associate = (models) => {
        Transcription.belongsTo(models.Call, { foreignKey: 'id' });
    };
    Transcription.associate = (models) => {
        Transcription.belongsTo(models.User, { foreignKey: 'guid' });
    };

export default Transcription;