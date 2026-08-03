import { createServer } from '../../server.js'

async function startServer() {
  const server = await createServer()
  await server.start()

  server.logger.info('Server started successfully')

  return server
}

export { startServer }
