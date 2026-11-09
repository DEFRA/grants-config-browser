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

  describe('When there are multiple versions all non-archived', () => {
    let statusCode
    let $

    beforeAll(async () => {
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

      const response = await server.inject({
        method: 'GET',
        url: '/grant?grant=some-grant'
      })

      const result = response.result
      statusCode = response.statusCode
      $ = load(result)
    })

    test('Should respond with 200 OK', () => {
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should render the versions table', () => {
      expect($('title').text()).toEqual(expect.stringContaining('All versions of some-grant |'))
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
    })

    test('Should render the related feature controls table', () => {
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
    })
  })

  describe('When there are no related feature controls', () => {
    let statusCode
    let $

    beforeAll(async () => {
      requestFromApi.mockResolvedValueOnce({
        response: [{ version: '1.0.0', status: 'active', lastUpdated: '2023-01-01' }]
      })
      requestFromApi.mockResolvedValueOnce({ response: {} })

      const response = await server.inject({
        method: 'GET',
        url: '/grant?grant=some-grant'
      })

      statusCode = response.statusCode
      $ = load(response.result)
    })

    test('Should respond with 200 OK', () => {
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should render an empty feature controls table', () => {
      const featureRows = $('table').eq(1).find('tbody tr').get()

      expect(featureRows).toHaveLength(0)
    })
  })

  describe('When the grant has no versions', () => {
    let statusCode
    let $

    beforeAll(async () => {
      requestFromApi.mockResolvedValueOnce({ response: [] })
      requestFromApi.mockResolvedValueOnce({ response: {} })

      const response = await server.inject({
        method: 'GET',
        url: '/grant?grant=some-grant'
      })

      statusCode = response.statusCode
      $ = load(response.result)
    })

    test('Should respond with 200 OK', () => {
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should render an empty versions table', () => {
      const versionRows = $('table').eq(0).find('tbody tr').get()

      expect(versionRows).toHaveLength(0)
    })
  })

  describe('When the grant has a single version', () => {
    let statusCode
    let $

    beforeAll(async () => {
      requestFromApi.mockResolvedValueOnce({
        response: [{ version: '1.0.0', status: 'active', lastUpdated: '2023-01-01' }]
      })
      requestFromApi.mockResolvedValueOnce({ response: {} })

      const response = await server.inject({
        method: 'GET',
        url: '/grant?grant=some-grant'
      })

      statusCode = response.statusCode
      $ = load(response.result)
    })

    test('Should respond with 200 OK', () => {
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should render a single versions table row', () => {
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

      expect(versionRows).toEqual(['1.0.0 Active 01/01/2023'])
    })
  })

  describe('When archived versions are included', () => {
    let statusCode
    let $
    let allVersionsUrl

    beforeAll(async () => {
      requestFromApi.mockResolvedValueOnce({
        response: [
          { version: '2.0.0', status: 'active', lastUpdated: '2023-01-02', archived: true },
          { version: '1.0.0', status: 'draft', lastUpdated: '2023-01-01' }
        ]
      })
      requestFromApi.mockResolvedValueOnce({ response: {} })

      const response = await server.inject({
        method: 'GET',
        url: '/grant?grant=some-grant&archived=include'
      })

      statusCode = response.statusCode
      $ = load(response.result)
      allVersionsUrl = requestFromApi.mock.calls[0][0]
    })

    test('Should respond with 200 OK', () => {
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should pass archived=included through to the broker', () => {
      expect(allVersionsUrl).toEqual(expect.stringContaining('archived=included'))
    })

    test('Should render every version regardless of archived state', () => {
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
    })
  })
})
