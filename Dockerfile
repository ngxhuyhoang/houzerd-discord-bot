FROM dockcross/linux-armv8

FROM node:15.5.0-alpine

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["node", "build/index"]