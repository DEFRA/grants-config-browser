# grants-config-browser

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_grants-config-browser&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_grants-config-browser)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_grants-config-browser&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_grants-config-browser)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_grants-config-browser&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_grants-config-browser)

Created from the core delivery platform Node.js Frontend Template.

- [Overview](#overview)
- [Architecture](#architecture)
- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Local Development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Production](#production)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Overview

This application is a browser-based interface for the grants-config-broker.
It is intended to be used by producers and consumers of configuration published by the grants-config-broker to allow users
to browse and view the configuration of grants.

There is currently no authentication or authorisation in this application as all information is read-only and publicly
available.

## Architecture

This application is built using JavaScript and Node.js. The server framework used is Hapi.js.
The frontend is built using nunjucks templates, and based on the GOV.UK Design System (GDS), including
components from the Ministry of Justice (MOJ) components library.

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= 24` and [npm](https://nodejs.org/) `>= v11.10`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd grants-config-browser
nvm use
```

## Server-side Caching

We use Catbox for server-side caching. By default the service will use CatboxRedis when deployed and CatboxMemory for
local development.
You can override the default behaviour by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or
`memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each
instance of the service and it will not persist between restarts.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to the same Redis key-value store similar
to how services might have a database (or MongoDB). All frontend services are given access to a namespaced prefixed that
matches the service name. e.g. `my-service` will have access to everything in Redis that is prefixed with `my-service`.

If your service does not require a session cache to be shared between instances or if you don't require Redis, you can
disable setting `SESSION_CACHE_ENGINE=false` or changing the default value in `src/config/index.js`.

## Local Development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
docker-compose up -d
```

This will allow the browser to run with a pre-existing setup running for the config-broker, which will supply
the backend to connect to, as well as the AWS infrastructure, and redis cache that the config-browser will use.
Changes made to the source code will be picked up by nodemon and the browser will be automatically reloaded.

If you prefer to run just the browser in standalone mode locally, without using the broker, then you can instead run:

```bash
docker-compose -f compose-standalone.yml up -d
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## Docker

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to the `docker run` command to ensure
> compatibility fEx: `docker build --platform=linux/arm64 --no-cache --tag grants-config-browser`

Build:

```bash
docker build --target development --no-cache --tag grants-config-browser:development .
```

Run:

```bash
docker run -p 3000:3000 grants-config-browser:development
```

### Production image

Build:

```bash
docker build --no-cache --tag grants-config-browser .
```

Run:

```bash
docker run -p 3000:3000 grants-config-browser
```

### Dependabot

Dependabot is enabled in this repository. Minor dependency updates will be checked weekly, and grouped automatically
into a single pull request. Major dependency updates will be checked weekly, and opened as separate pull requests.

### SonarCloud

Sonarcloud is enabled in this repository. Pull requests will be checked for code quality issues. The DEFRA software
quality standards are defined in the [DEFRA Software Engineering Standards](https://github.com/DEFRA/software-engineering-standards).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
