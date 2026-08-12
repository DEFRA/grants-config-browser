import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { requestFromApi } from '../helpers/request-from-api.js'
import { load } from 'cheerio'

vi.mock('../helpers/request-from-api.js')

describe('#grantController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    requestFromApi.mockResolvedValue({
      response: [
        { version: '2.0.0', status: 'active', lastUpdated: '2023-01-02' },
        { version: '1.0.0', status: 'draft', lastUpdated: '2023-01-01' }
      ]
    })
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
      url: '/grant'
    })

    expect(statusCode).toBe(statusCodes.moved)
    expect(location).toBe('/')
  })

  test('Should provide expected response', async () => {
    requestFromApi.mockResolvedValueOnce({
      response: [
        { version: '2.0.0', status: 'active', lastUpdated: '2023-01-02' },
        { version: '1.0.0', status: 'draft', lastUpdated: '2023-01-01' }
      ]
    })
    requestFromApi.mockResolvedValueOnce({
      response: {
        items: [
          {
            name: 'FEATURE_1',
            displayName: 'Feature 1',
            type: 'string',
            value: 'Value 1',
            lastUpdated: '2023-01-03T00:00:00Z'
          }
        ]
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/grant?grant=some-grant'
    })

    const $ = load(result)

    expect(result).toEqual(expect.stringContaining('All versions of some-grant |'))
    expect($('h2:contains("All versions")').length).toBe(1)

    const versionRows = $('table')
      .eq(0)
      .find('tbody tr')
      .map((_, row) =>
        $(row)
          .find('td')
          .text()
          .trim()
          .replaceAll(/[\\n\s]+/g, ' ')
      )
      .get()

    expect(versionRows).toEqual(['2.0.0 Active 02/01/2023', '1.0.0 Draft 01/01/2023'])

    expect($('h2:contains("Related feature controls")').length).toBe(1)
    const featureRows = $('table')
      .eq(1)
      .find('tbody tr')
      .map((_, row) =>
        $(row)
          .find('td')
          .text()
          .trim()
          .replaceAll(/[\\n\s]+/g, ' ')
      )
      .get()

    expect(featureRows).toEqual(['Feature 1FEATURE_1Value 103/01/2023'])

    expect(statusCode).toBe(statusCodes.ok)
  })
})
