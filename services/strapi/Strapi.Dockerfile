FROM node:18-alpine

WORKDIR /opt

RUN apk add --no-cache \
    build-base \
    gcc \
    autoconf \
    automake \
    zlib-dev \
    libpng-dev \
    nasm \
    bash \
    vips-dev

COPY package.json yarn.lock ./

RUN yarn config set network-timeout 600000 -g \
 && yarn install --frozen-lockfile --production

COPY . .

# Build Strapi
RUN yarn build

EXPOSE 1337

# Launch app
CMD ["yarn", "start"]
