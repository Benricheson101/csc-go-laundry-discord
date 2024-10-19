FROM node:slim

ARG GIT_COMMIT
ENV GIT_COMMIT=${GIT_COMMIT}

WORKDIR /app
RUN corepack enable
COPY ./package.json ./pnpm-lock.yaml ./tsconfig.json ./LICENSE ./
RUN pnpm i
COPY . .
RUN pnpm tsc
ENTRYPOINT ["node", "--enable-source-maps", "./build/src/index.js"]
