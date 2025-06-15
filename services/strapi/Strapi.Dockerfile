# FROM node:20-alpine
# # Installing libvips-dev for sharp Compatibility
# RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev git
# ARG NODE_ENV=development
# ENV NODE_ENV=${NODE_ENV}

# WORKDIR /opt/
# COPY package.json package-lock.json ./
# RUN npm install -g node-gyp
# RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install
# ENV PATH /opt/node_modules/.bin:$PATH

# WORKDIR /opt/app
# COPY . .
# RUN chown -R node:node /opt/app
# # USER node
# RUN ["npm", "run", "build"]
# EXPOSE 1337
# CMD ["npm", "run", "develop"]

FROM node:20-slim

# Instalar dependencias necesarias y limpiar para reducir tamaño
RUN apt-get update && apt-get install -y \
  build-essential \
  python3 \
  git \
  libvips-dev \
  curl \
  bash \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

WORKDIR /opt
COPY package.json package-lock.json ./

RUN npm install -g node-gyp
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install
ENV PATH /opt/node_modules/.bin:$PATH

WORKDIR /opt/app
COPY . .
RUN chown -R node:node /opt/app
RUN ["npm", "run", "build"]

EXPOSE 1337
CMD ["npm", "run", "develop"]