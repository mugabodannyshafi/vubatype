FROM ubuntu:24.04
ARG NODE_VERSION=24
WORKDIR /home/app
RUN apt-get update
RUN apt install -y curl git \
    && curl -sLS https://deb.nodesource.com/setup_$NODE_VERSION.x | bash - \
    && apt-get install -y nodejs \
    && apt-get install -y postgresql-client \
    && apt-get -y autoremove \
    && apt-get -y clean
RUN npm i -g @nestjs/cli
CMD ["npm", "run", "start:dev"]