FROM arm64v8/node

COPY package*.json ./

RUN apt update && apt install ffmpeg -y

RUN npm install

COPY . .

CMD ["node", "index"]