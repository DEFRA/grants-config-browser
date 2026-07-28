import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { requestFromApi } from '../helpers/request-from-api.js'
import { load } from 'cheerio'
import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'

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

  const credentials = { isAuthenticated: true, displayName: 'User A' }

  test('Should return 401 if not authenticated', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/features'
    })

    expect(statusCode).toBe(statusCodes.unauthorized)
  })

  test('Should provide expected response with features list', async () => {
    const mockFeatures = {
      items: [
        {
          name: 'FEATURE_ONE',
          value: true,
          description: 'Description for feature one',
          scopes: 'Scope A',
          lastUpdated: '2024-01-01T12:00:00Z'
        },
        {
          name: 'FEATURE_TWO',
          value: 'some-value',
          description: 'Description for feature two',
          scopes: 'Scope B',
          lastUpdated: '2024-01-02T12:00:00Z'
        }
      ]
    }
    requestFromApi.mockResolvedValueOnce({ response: mockFeatures })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/features',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)

    expect($('h1').text()).toContain('Features')

    // Check breadcrumbs
    const breadcrumbs = $('.govuk-breadcrumbs__list-item')
    expect(breadcrumbs).toHaveLength(2)
    expect(breadcrumbs.eq(0).text().trim()).toBe('Home')
    expect(breadcrumbs.eq(0).find('a').attr('href')).toBe('/')
    expect(breadcrumbs.eq(1).text().trim()).toBe('Features')

    // Check the default sort
    const featureHeader = $('thead th').eq(0)
    expect(featureHeader.text().trim()).toBe('Feature')
    expect(featureHeader.attr('aria-sort')).toBe('ascending')

    // Check the expected number of rows
    const rows = $('tbody tr')
    expect(rows).toHaveLength(2)

    // Check row one contains expected data
    const firstRow = rows.eq(0)
    expect(firstRow.find('td').eq(0).text()).toContain('Feature One')
    expect(firstRow.find('td').eq(1).text()).toBe('FEATURE_ONE')
    expect(firstRow.find('td').eq(2).text()).toBe('true')

    // Check expanded details for feature one
    const details = firstRow.find('td').eq(0).find('details')
    const summaryRows = details.find('.govuk-summary-list__row')
    const descriptionRow = summaryRows.filter(
      (_, el) => $(el).find('.govuk-summary-list__key').text().trim() === 'Description'
    )
    expect(descriptionRow.find('.govuk-summary-list__value').text().trim()).toBe('Description for feature one')
    const scopesRow = summaryRows.filter((_, el) => $(el).find('.govuk-summary-list__key').text().trim() === 'Scopes')
    expect(scopesRow.find('.govuk-summary-list__value').text().trim()).toBe('Scope A')
    const valueRow = summaryRows.filter((_, el) => $(el).find('.govuk-summary-list__key').text().trim() === 'Value')
    expect(valueRow.find('.govuk-summary-list__value').text().trim()).toBe('true')
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
      url: '/features',
      auth: {
        strategy: 'session',
        credentials
      }
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
      url: '/features',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    const $ = load(result)
    expect($('tbody tr')).toHaveLength(2)

    const row = $('tbody tr').eq(0)
    expect(row.find('td').eq(2).text()).toBe('val1,val2')

    // Check expanded details for array value
    const details = row.find('td').eq(0).find('details')
    const valueRow = details.find('.govuk-summary-list__row').filter((_, el) => {
      return $(el).find('.govuk-summary-list__key').text().trim() === 'Value'
    })
    const valueContent = valueRow.find('.govuk-summary-list__value')
    expect(valueContent.find('ul').hasClass('govuk-list')).toBe(true)
    expect(valueContent.find('ul').hasClass('govuk-list--bullet')).toBe(true)
    const listItems = valueContent.find('li')
    expect(listItems).toHaveLength(2)
    expect(listItems.eq(0).text()).toBe('val1')
    expect(listItems.eq(1).text()).toBe('val2')
  })

  test('Should show "No features available" when no features are present', async () => {
    requestFromApi.mockResolvedValueOnce({ response: { items: [] } })

    const { result } = await server.inject({
      method: 'GET',
      url: '/features',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    const $ = load(result)

    expect($('p').text()).toContain('No features available')
    expect($('table')).toHaveLength(0)
  })
})
