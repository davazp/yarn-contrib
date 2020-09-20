# Yarn Plugin Production Install

This plugin will create a minimal yarn install for a workspace.
`yarn prod-install outDir`
The resulting installation will include only `dependencies` required for production.
It excludes `devDependencies`. The yarn cache will be copied and trimmed accordingly.
Yarn settings and plugins are included.

## Install instructions

```
TODO
```

## Example Dockerfile

This example dockerfile is expected to be built with `docker buildx build`

```dockerfile
# syntax = docker/dockerfile:experimental

##
## Base
##
FROM node:12 as install-prep

ARG BUILD_DIR=packages/demo

WORKDIR /opt/demo

COPY ${BUILD_DIR}/package.json ${BUILD_DIR}/
COPY package.json .
COPY yarn.lock .

##
## Only include non stateful files from yarn
## If your set has files elsewhere you may need to change this
## to include or exclude yarn files as needed.
##
## .yarn/*
## !.yarn/cache
## !.yarn/releases
## !.yarn/plugins
##
COPY .yarn/ /opt/demo/.yarn/
COPY .yarnrc.yml /opt/demo/.yarnrc.yml

##
## If your workspace depends on any other workspace
## include them here also
## ie: COPY packages/requiredbydemo/ /opt/demo/packages/requiredbydemo/
## You could optionly run the install out of docker however if you do
## have compiled binaries that depend on system libaries you should
## compile them with in your docker to ensure they are compatable
##
## You should also install any compile-time system libaries not included
## by defautl from your base image.
##

##
## Install build depanciyes
##
FROM install-prep as install-dev
ARG BUILD_DIR=packages/demo

WORKDIR /opt/demo

##
## This is needed as the install state will be invalid otherwise
##
RUN yarn install

WORKDIR /opt/demo/${BUILD_DIR}

##
## Install prod depanciyes
##
FROM install-prep as install-prod
ARG BUILD_DIR=packages/demo

WORKDIR /opt/demo

##
## This is needed as the install state will be invalid otherwise
##
RUN yarn install

WORKDIR /opt/demo/${BUILD_DIR}

##
## This is our secret weapon
## Our nice plugin creates a yarn install just for us
##
RUN yarn prod-install /opt/demo/prod

WORKDIR /opt/demo/prod

##
## Base
##
FROM install-dev as build
ARG BUILD_DIR=packages/demo

WORKDIR /opt/demo/${BUILD_DIR}

##
## Copy the workspace we are building here
## include any files outside of the workspace that maybe needed to build also
## ie. a project root tsconfig.json
##
COPY ${BUILD_DIR}/. .

RUN yarn run build

##
## Final Image
##
FROM node:12
ARG BUILD_DIR=packages/demo
WORKDIR /opt/demo

##
## The installing of gosu, dumb-init and the use of --chown are optional
## This is just showing a best practice docker
## It will run as a non root account the user `node` is provided by the node base image
## gosu proformes the stepdown from root
## dumb-init handles pid 0 signal handling
##

##
## Any run-time system libaries should be installed now
##

RUN --mount=type=cache,sharing=locked,target=/var/cache/apt \
  --mount=type=cache,target=/var/lib/apt\
  apt-get update && apt-get install -y \
  gosu \
  dumb-init \
  && gosu node true

##
## This includes our yarn install (like grabbing node_modules of old)
## Then includes the built code
##
COPY --chown=node:node --from=install-prod /opt/demo/prod/ /opt/demo/
COPY --chown=node:node --from=build /opt/demo/${BUILD_DIR}/dist/ /opt/demo/

##
## How you start and build your app is up to you this is just an example
##

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["gosu", "node", "yarn", "node", "index.js"]
```
