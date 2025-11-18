'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BossParticipant extends Model {
    static associate(models) {
      this.belongsTo(models.BossSession, {
        foreignKey: 'id_boss_sessio',
        as: 'session'
      });
      this.belongsTo(models.Usuari, {
        foreignKey: 'id_usuari',
        as: 'user'
      });
    }
  }
  BossParticipant.init({
    id_boss_sessio: DataTypes.INTEGER,
    id_usuari: DataTypes.INTEGER,
    damage: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'BossParticipant',
    tableName: 'boss_participants',
    timestamps: false
  });
  return BossParticipant;
};