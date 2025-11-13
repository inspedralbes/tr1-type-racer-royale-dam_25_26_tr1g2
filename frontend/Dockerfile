# Usar la imagen oficial de Node
FROM node:20-alpine


WORKDIR /app


# Instalar dependencias (no copiamos aún el resto de la app)
COPY package*.json ./
RUN npm install


# Copiar el resto de la app
COPY . .


# Exponer el puerto de desarrollo de Vite (o React)
EXPOSE 3000


# Comando para iniciar la app en modo desarrollo con hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
