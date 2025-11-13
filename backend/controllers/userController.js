
// controllers/userController.js
const { User } = require('../models'); // importa la instància i models
const jwt = require('jsonwebtoken');


// Secret per JWT (hauries de posar-ho al .env)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '2h'; // expira en 2 hores


// Registrar un nou usuari
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;


    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Falten camps obligatoris' });
    }


    // Comprovar si ja existeix usuari amb email o username
    const existingUser = await User.findOne({
      where: { email }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'L’usuari ja existeix amb aquest email' });
    }


    const newUser = await User.create({ username, email, password });


    // Crear JWT
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });


    return res.status(201).json({
      message: 'Usuari creat correctament',
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
      token
    });
  } catch (err) {
    console.error('Error registre:', err);
    return res.status(500).json({ error: 'Error intern del servidor' });
  }
};


// Login d’usuari existent
const login = async (req, res) => {
  try {
    const { email, password } = req.body;


    if (!email || !password) {
      return res.status(400).json({ error: 'Falten camps obligatoris' });
    }


    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credencials incorrectes' });
    }


    const valid = await user.validPassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Credencials incorrectes' });
    }


    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });


    return res.status(200).json({
      message: 'Login correcte',
      user: { id: user.id, username: user.username, email: user.email },
      token
    });
  } catch (err) {
    console.error('Error login:', err);
    return res.status(500).json({ error: 'Error intern del servidor' });
  }
};


module.exports = { register, login };
