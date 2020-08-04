FROM node

RUN npm i -g firebase-tools
RUN apt-get update -y && apt-get install -y yarn
ADD firebase.bash /usr/bin
RUN chmod +x /usr/bin/firebase.bash
