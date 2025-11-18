-- Usuaris Registrats
-- Tablas sin dependencias externas

-- Usuaris Registrats
CREATE TABLE Usuaris (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuari VARCHAR(25) UNIQUE NOT NULL,
    correu VARCHAR(200) UNIQUE NOT NULL,
    contrasenya VARCHAR(100) NOT NULL
);

-- Solo
CREATE TABLE Rutines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuari INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    descripcio TEXT,
    data_creacio DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuari) REFERENCES Usuaris(id) ON DELETE CASCADE
);

-- Mode 2v2
CREATE TABLE SessionsVersus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codi_acces VARCHAR(10) UNIQUE,
    estat VARCHAR(20) DEFAULT 'oberta',
    data_creacio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creador_id INT,
    FOREIGN KEY (creador_id) REFERENCES Usuaris(id) ON DELETE CASCADE
);

CREATE TABLE Exercicis_Rutina (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_rutina INT,
    nom_exercicis VARCHAR(100) NOT NULL,
    n_repeticions VARCHAR(100),
    FOREIGN KEY (id_rutina) REFERENCES Rutines(id) ON DELETE CASCADE
);

-- Showdown
CREATE TABLE Boss_Sessions (
    id INT NOT NULL PRIMARY KEY,
    creadorId INT,
    jefe_vida_max INT DEFAULT 300,
    jefe_vida_actual INT,
    max_participants INT DEFAULT 10,
    estat VARCHAR(20) DEFAULT 'oberta',
    data_creacio DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creadorId) REFERENCES Usuaris(id) ON DELETE CASCADE
);

CREATE TABLE Boss_Participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_boss_sessio INT,
    id_usuari INT,
    damage INT DEFAULT 8,
    FOREIGN KEY (id_boss_sessio) REFERENCES Boss_Sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuari) REFERENCES Usuaris(id) ON DELETE CASCADE
);