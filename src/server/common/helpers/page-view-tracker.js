import { config } from '../../../config/config.js'

export const pageViewTracker = {
  name: 'page-view-tracker',
  register(server) {
    const assetPath = config.get('assetPath')

    server.ext('onPostAuth', (request, h) => {
      const { path } = request

      if (path === '/health' || path === '/favicon.ico' || path.startsWith(`${assetPath}/`)) {
        return h.continue
      }

      const { metrics } = request
      if (metrics && typeof metrics.counter === 'function') {
        metrics.counter('page-viewed', 1, { path })
      }
      return h.continue
    })
  }
}
