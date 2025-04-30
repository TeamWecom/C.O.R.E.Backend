'use strict';
import {Model, DataTypes} from 'sequelize';
import db  from '../managers/databaseSequelize.js'; // Importe o sequelize configurado
class CallParts extends Model {
    static associate(models) {
      this.hasMany(models.Call, { foreignKey: 'record_id', sourceKey: 'record_id' });
    }
  }
  CallParts.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        record_id : DataTypes.INTEGER,
        ssrc : DataTypes.STRING,
        srcIP: DataTypes.STRING,
        srcPort : DataTypes.STRING,
        destIP: DataTypes.STRING,
        destPort : DataTypes.STRING,
        startTime : DataTypes.TEXT,
        endTime: DataTypes.TEXT,
        lostPkts: DataTypes.TEXT,
        payload: DataTypes.STRING,
        pktsCount: DataTypes.TEXT,
        maxJitter: DataTypes.TEXT,
        createdAt : DataTypes.DATE,
        updatedAt : DataTypes.DATE
    }, 
    {
        sequelize: db.sequelize,
        modelName: 'callParts',
        tableName: 'tbl_calls_parts', // Defina o nome da tabela aqui
        timestamps: true
    });

    // Definir a associação no próprio modelo
    CallParts.associate = (models) => {
        //CallParts.belongsTo(models.Call, { foreignKey: 'record_id' });
        CallParts.belongsTo(models.Call, { foreignKey: 'record_id', sourceKey: 'record_id' });
    };

export default CallParts;