FROM node:10

WORKDIR /usr/src/d3work

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD [ "node", "bin/www" ]