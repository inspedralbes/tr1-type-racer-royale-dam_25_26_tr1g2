'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BossSession extends Model {
    static associate(models) {
      // Define la asociación con el modelo de Usuario
      this.belongsTo(models.Usuari, {
        foreignKey: 'creador_id',
        as: 'creador'
      });
      // Define la asociación con los participantes
      this.hasMany(models.BossParticipant, {
        foreignKey: 'id_boss_sessio',
        as: 'participants'
      });
    }
  }
  BossSession.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    creador_id: DataTypes.INTEGER,
    jefe_vida_max: DataTypes.INTEGER,
    jefe_vida_actual: DataTypes.INTEGER,
    max_participants: DataTypes.INTEGER,
    estat: DataTypes.STRING,
    data_creacio: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'BossSession',
    tableName: 'boss_sessions', // Nombre exacto de la tabla en la BBDD
    timestamps: false // Desactivamos los timestamps automáticos de Sequelize
  });
  return BossSession;
};