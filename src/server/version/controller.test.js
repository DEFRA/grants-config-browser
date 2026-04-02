import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { requestFromApi } from '../helpers/request-from-api.js'

vi.mock('../helpers/request-from-api.js')

describe('#versionController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    requestFromApi.mockResolvedValue({
      grant: 'some-grant',
      version: '1.2.3',
      manifest: []
    })
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/version?grant=some-grant&version=1.2.3'
    })

    expect(result).toEqual(expect.stringContaining('some-grant - 1.2.3 |'))
    expect(statusCode).toBe(statusCodes.ok)
  })
})
