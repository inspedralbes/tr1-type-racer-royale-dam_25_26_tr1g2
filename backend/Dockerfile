# Usar la imagen oficial de Node
FROM node:20-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del proyecto
COPY . .

# Exponer puerto
EXPOSE 9000

# Comando para iniciar la app
CMD ["npm", "start"]