-- Usuaris Registrats
CREATE TABLE Usuaris (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuari VARCHAR(25) UNIQUE NOT NULL,
    correu VARCHAR(200) UNIQUE NOT NULL,
    contrasenya VARCHAR(100) NOT NULL
);

-- Solo (Rutinas)
CREATE TABLE Rutines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuari INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    descripcio TEXT,
    data_creacio DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuari) REFERENCES Usuaris(id)
);

-- Exercicis de Rutina (Relació amb Rutines)
CREATE TABLE Exercicis_Rutina (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_rutina INT,
    nom_exercicis VARCHAR(100) NOT NULL,
    n_repeticions VARCHAR(100),
    FOREIGN KEY (id_rutina) REFERENCES Rutines(id)
);

-- Mode (Versus Sessions)
CREATE TABLE SessionsVersus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codi_acces CHAR(8) UNIQUE NOT NULL,
    estat ENUM('oberta','en curs','finalitzada') DEFAULT 'oberta',
    data_creacio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creador_id INT,
    FOREIGN KEY (creador_id) REFERENCES Usuaris(id)
);

-- Showdown (Boss Sessions)
CREATE TABLE Boss_Sessions (
    id VARCHAR(255) NOT NULL PRIMARY KEY, -- Clau primària: permet BOSS-XXXXXX
    creador_id INT,
    jefe_vida_max INT DEFAULT 300,
    jefe_vida_actual INT,
    max_participants INT DEFAULT 10,
    estat ENUM('oberta','en curs','finalitzada') DEFAULT 'oberta',
    data_creacio DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creador_id) REFERENCES Usuaris(id)
);

-- Boss Participants (Relació amb Boss Sessions)
CREATE TABLE Boss_Participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- CORRECCIÓ: id_boss_sessio ara és VARCHAR(255) per coincidir amb Boss_Sessions.id
    id_boss_sessio VARCHAR(255), 
    id_usuari INT,
    damage INT DEFAULT 8,
    FOREIGN KEY (id_boss_sessio) REFERENCES Boss_Sessions(id),
    FOREIGN KEY (id_usuari) REFERENCES Usuaris(id)
);