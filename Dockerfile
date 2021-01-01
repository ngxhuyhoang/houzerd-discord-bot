FROM arm64v8/node

COPY package*.json ./

RUN set -x && add-apt-repository ppa:mc3man/trusty-media && apt-get update && apt-get dist-upgrade && apt-get install -y --no-install-recommends ffmpeg

RUN npm install

COPY . .

CMD ["node", "index"]