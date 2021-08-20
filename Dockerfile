FROM node:latest
RUN mkdir -p /usr/src/d3work

WORKDIR /usr/src/d3work

COPY package*.json ./

RUN npm ci

COPY . ./

EXPOSE 3000

CMD ["/bin/sh", "script.sh"]
