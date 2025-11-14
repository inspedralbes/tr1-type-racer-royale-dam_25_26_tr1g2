# Usar la imagen oficial de Node
FROM node:20-alpine

# Directorio de trabajo
WORKDIR /app

# 1. Copiar SÓLO los archivos de paquete
# Esto permite que Docker cachee la capa de instalación
COPY package*.json ./

# 2. Instalar dependencias
RUN npm install

# ¡IMPORTANTE! Hemos eliminado 'COPY . .'
# El código fuente (el resto de los archivos) será proporcionado 
# por el montaje de volumen definido en docker-compose.yml

# Exponer el puerto de desarrollo
EXPOSE 3000

# Comando para iniciar la app (usando el volumen montado)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]