import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { requestFromApi } from '../helpers/request-from-api.js'
import { load } from 'cheerio'

vi.mock('../helpers/request-from-api.js')

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    requestFromApi.mockResolvedValueOnce({ response: [] })
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(result).toEqual(expect.stringContaining('Home |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should show tables of grants in alphabetical ordering, with max 3 entries', async () => {
    requestFromApi.mockResolvedValueOnce({
      response: [
        {
          grant: 'grant1|',
          versions: [
            { version: '3.0.0', status: 'active', lastUpdated: '2023-01-03' },
            { version: '2.0.0', status: 'active', lastUpdated: '2023-01-02' },
            { version: '1.0.0', status: 'active', lastUpdated: '2023-01-01' }
          ]
        },
        {
          grant: 'agrant|',
          versions: [
            { version: '4.0.0', status: 'active', lastUpdated: '2023-01-04' },
            { version: '3.0.0', status: 'active', lastUpdated: '2023-01-03' },
            { version: '2.0.0', status: 'active', lastUpdated: '2023-01-02' },
            { version: '1.0.0', status: 'active', lastUpdated: '2023-01-01' }
          ]
        },
        {
          grant: 'zgrant|',
          versions: [
            { version: '3.0.0', status: 'active', lastUpdated: '2023-01-03' },
            { version: '2.0.0', status: 'active', lastUpdated: '2023-01-02' },
            { version: '1.0.0', status: 'active', lastUpdated: '2023-01-01' }
          ]
        }
      ],
      status: 200
    })
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    const $ = load(result)

    const orderedGrants = $('h2.govuk-heading-m a').text().trim().split('|').filter(Boolean)
    expect(orderedGrants).toHaveLength(3)
    expect(orderedGrants).toEqual(['agrant', 'grant1', 'zgrant'])

    const heading = $('h2').filter((_, el) => {
      return $(el).find('a').text().trim() === 'agrant|'
    })

    const table = heading.next('div').find('table')

    const versions = table
      .find('tbody tr')
      .map((_, row) => $(row).find('td').eq(0).text().trim())
      .get()

    expect(versions).toEqual(['4.0.0', '3.0.0', '2.0.0'])
    expect(statusCode).toBe(statusCodes.ok)
  })
})
