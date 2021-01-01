FROM arm64v8/node

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["node", "build/index"]