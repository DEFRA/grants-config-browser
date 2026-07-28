import { featuresController } from './controller.js'

export const features = {
  plugin: {
    name: 'features',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/features',
          ...featuresController
        }
      ])
    }
  }
}
