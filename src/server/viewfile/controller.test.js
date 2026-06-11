import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { getS3SignedUrl } from '../common/helpers/s3/s3-interactions.js'

vi.mock('../common/helpers/s3/s3-interactions.js')

describe('#viewFileController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    getS3SignedUrl.mockResolvedValue('some-signed-url.html')
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should redirect to home page if invalid query parameters supplied', async () => {
    const {
      headers: { location },
      statusCode
    } = await server.inject({
      method: 'GET',
      url: '/viewfile?filename=some-grant.yml'
    })

    expect(statusCode).toBe(statusCodes.moved)
    expect(location).toBe('/')
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/viewfile?filename=some-grant.yml&bucket=my-bucket'
    })

    expect(result).toEqual(expect.stringContaining(''))
    expect(statusCode).toBe(statusCodes.moved)
  })
})
