# Usa una imagen base oficial para Node.js
FROM node:20-alpine

# Crea y establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos package.json y package-lock.json (si existe)
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de tu código de aplicación
COPY . .

# Expone los puertos que usa tu aplicación
EXPOSE 3000
EXPOSE 8080

# Comando para arrancar la aplicación
CMD ["npm", "start"]
# O si usas node directamente:
# CMD ["node", "server.js"]