FROM node:18-alpine3.15

ENV IN_CONTAINER='true'

WORKDIR /app

COPY . .

RUN yarn install 

RUN yarn global add pm2

CMD ["sh", "-c", "/usr/local/bin/pm2 start --name=forta_exporter index.js && /usr/local/bin/pm2 logs"]