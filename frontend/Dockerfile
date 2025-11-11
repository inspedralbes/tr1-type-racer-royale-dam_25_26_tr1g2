# Usa una imagen base de Node.js, preferiblemente la versión LTS (Long-Term Support)
# para un buen equilibrio entre características y estabilidad.
FROM node:20-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de configuración del proyecto (package.json y package-lock.json o yarn.lock)
# Esto permite que la capa de instalación de dependencias se almacene en caché.
COPY package*.json ./

# Instala las dependencias. Usa --production=false para incluir las dependencias de desarrollo
# necesarias para el hot reload.
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Expone el puerto por defecto de Vite (5173).
# Es crucial exponerlo para que el host pueda acceder a la aplicación.
EXPOSE 5173

# Comando para iniciar el servidor de desarrollo.
# **IMPORTANTE:** El host debe ser 0.0.0.0 para que el servidor sea accesible desde fuera del contenedor.
# Para Vite (Vue 3), a menudo esto debe configurarse en el archivo vite.config.js,
# pero en muchos casos, el comando 'npm run dev' ya maneja esto o se puede forzar con la configuración adecuada.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]