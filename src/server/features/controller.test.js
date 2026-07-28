import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { requestFromApi } from '../helpers/request-from-api.js'
import { load } from 'cheerio'

vi.mock('../helpers/request-from-api.js')

describe('#featuresController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response with features list', async () => {
    const mockFeatures = {
      items: [
        {
          name: 'FEATURE_ONE',
          value: true,
          lastUpdated: '2024-01-01T12:00:00Z'
        },
        {
          name: 'FEATURE_TWO',
          value: 'some-value',
          lastUpdated: '2024-01-02T12:00:00Z'
        }
      ]
    }
    requestFromApi.mockResolvedValueOnce({ response: mockFeatures })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/features'
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)

    expect($('h1').text()).toContain('Features')

    const rows = $('tbody tr')
    expect(rows).toHaveLength(2)

    const firstRow = rows.eq(0)
    expect(firstRow.find('td').eq(0).text()).toContain('Feature One')
    expect(firstRow.find('td').eq(1).text()).toBe('FEATURE_ONE')
    expect(firstRow.find('td').eq(2).text()).toBe('true')
  })

  test('Should truncate long feature value', async () => {
    const mockFeatures = {
      items: [
        {
          name: 'LONG_FEATURE',
          value: 'this_is_a_very_long_value_that_should_be_truncated',
          lastUpdated: '2024-01-03T12:00:00Z'
        },
        {
          name: 'ANOTHER_FEATURE',
          value: 'val',
          lastUpdated: '2024-01-01T12:00:00Z'
        }
      ]
    }
    requestFromApi.mockResolvedValueOnce({ response: mockFeatures })

    const { result } = await server.inject({
      method: 'GET',
      url: '/features'
    })

    const $ = load(result)
    const rows = $('tbody tr')

    const firstRow = rows.eq(0)
    expect(firstRow.find('td').eq(2).text()).toBe('this_is_a_ve...')
  })

  test('Should handle array values correctly', async () => {
    const mockFeatures = {
      items: [
        {
          name: 'ARRAY_FEATURE',
          value: ['val1', 'val2'],
          lastUpdated: '2024-01-01T12:00:00Z'
        },
        {
          name: 'ANOTHER_FEATURE',
          value: 'val',
          lastUpdated: '2024-01-01T12:00:00Z'
        }
      ]
    }
    requestFromApi.mockResolvedValueOnce({ response: mockFeatures })

    const { result } = await server.inject({
      method: 'GET',
      url: '/features'
    })

    const $ = load(result)
    expect($('tbody tr')).toHaveLength(2)

    const row = $('tbody tr').eq(0)
    expect(row.find('td').eq(2).text()).toBe('val1,val2')
  })

  test('Should show "No features available" when no features are present', async () => {
    requestFromApi.mockResolvedValueOnce({ response: { items: [] } })

    const { result } = await server.inject({
      method: 'GET',
      url: '/features'
    })

    const $ = load(result)

    expect($('p').text()).toContain('No features available')
    expect($('table')).toHaveLength(0)
  })
})
