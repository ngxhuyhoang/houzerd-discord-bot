FROM arm64v8/node

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "index"]