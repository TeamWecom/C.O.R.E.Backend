# Usar uma imagem base do Node.js
FROM node:18-alpine

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Copiar o arquivo package.json e package-lock.json
COPY package*.json ./

# Instalar as dependências
RUN npm install

# Copiar o restante dos arquivos da aplicação
COPY . .

# Expor a porta que a aplicação utilizará
EXPOSE 4444
EXPOSE 10101
EXPOSE 1883

# Comando para iniciar a aplicação
CMD ["npm", "start"]
