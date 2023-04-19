FROM node:14
RUN mkdir -p /usr/src/d3work

WORKDIR /usr/src/d3work

COPY package*.json ./

RUN npm ci

COPY . ./

RUN npm run webpack-prod-build

EXPOSE 3000

CMD ["node", "./bin/www"]
