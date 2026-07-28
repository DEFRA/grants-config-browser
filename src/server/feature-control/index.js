import { featureControlController } from './controller.js'

export const featureControl = {
  plugin: {
    name: 'featureControl',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/feature-control/detail',
          ...featureControlController
        }
      ])
    }
  }
}
