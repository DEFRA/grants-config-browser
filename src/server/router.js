import inert from '@hapi/inert'

import { home } from './home/index.js'
import { about } from './about/index.js'
import { health } from './health/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { grant } from './grant/index.js'
import { version } from './version/index.js'
import { viewfile } from './viewfile/index.js'
import { notifications } from './notifications/index.js'
import { api } from './api/index.js'
import Scalar from 'hapi-scalar'
import yaml from 'js-yaml'
import fs from 'node:fs'
import path from 'node:path'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([home, about, grant, version, viewfile, notifications, api])

      // Static assets
      await server.register([serveStaticFiles])

      const swaggerPath = path.resolve(process.cwd(), 'src/docs/swagger.yaml')
      const swaggerFile = fs.readFileSync(swaggerPath, 'utf8')
      const swaggerDocument = yaml.load(swaggerFile)

      await server.register([
        {
          plugin: Scalar,
          options: {
            scalarConfig: {
              content: swaggerDocument
            },
            routePrefix: '/documentation',
            routeConfig: {
              auth: false
            }
          }
        }
      ])
    }
  }
}
