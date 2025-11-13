const bcrypt = require('bcrypt');


module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    username: {
      field: 'usuari', // Mapeja al camp 'usuari' de la BDD
      type: DataTypes.STRING(25),
      allowNull: false,
      unique: true
    },
    email: {
      field: 'correu', // Mapeja al camp 'correu' de la BDD
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      field: 'contrasenya', // Mapeja al camp 'contrasenya' de la BDD
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    tableName: 'Usuaris', // Nom de la taula a la BDD
    timestamps: false, // No tenim timestamps a la taula Usuaris
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });


  // Mètode per verificar password
  User.prototype.validPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  return User;
};
