require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const UserModel = require('./User');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 60000,
    },
    logging: false,
  }
);

sequelize.authenticate()
  .then(() => console.log('Connexió amb Sequelize establerta correctament.'))
  .catch(err => console.error('No s\'ha pogut connectar a la base de dades amb Sequelize:', err));


const db = {};
db.User = UserModel(sequelize, DataTypes);
db.sequelize = sequelize;
db.Sequelize = Sequelize;


module.exports = db;
