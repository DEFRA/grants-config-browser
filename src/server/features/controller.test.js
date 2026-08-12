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

  test('Should provide expected response with features list', async () => {
    const mockFeatures = {
      items: [
        {
          name: 'FEATURE_ONE',
          displayName: 'Feature One',
          value: true,
          description: 'Description for feature one',
          scopes: 'Scope A',
          lastUpdated: '2024-01-01T12:00:00Z',
          status: 'active'
        },
        {
          name: 'FEATURE_TWO',
          displayName: 'Feature Two',
          value: 'some-value',
          description: 'Description for feature two',
          scopes: 'Scope B',
          lastUpdated: '2024-01-02T12:00:00Z',
          status: 'active'
        }
      ],
      uniqueScopes: ['Scope A', 'Scope B']
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

    const checkboxLabel = $('.govuk-checkboxes__label')
    expect(checkboxLabel.text()).toContain('Include inactive')
    expect(checkboxLabel.hasClass('inactive-highlight')).toBe(true)

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
    expect(firstRow.find('td').eq(2).text().trim()).toBe('true')

    // Check row one expanded details
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

  test('Should call API with name filter from query params', async () => {
    const mockFeatures = { items: [] }
    requestFromApi.mockResolvedValueOnce({ response: mockFeatures })

    const nameFilter = 'TEST_FEATURE'
    await server.inject({
      method: 'GET',
      url: `/features?name=${nameFilter}`,
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(requestFromApi).toHaveBeenCalledWith(`feature-controls?name=${nameFilter}&status=active`, expect.anything())
  })

  test('Should call API with displayName filter from query params', async () => {
    const mockFeatures = { items: [] }
    requestFromApi.mockResolvedValueOnce({ response: mockFeatures })

    const displayNameFilter = 'Test Feature'
    await server.inject({
      method: 'GET',
      url: `/features?displayName=${encodeURIComponent(displayNameFilter)}`,
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(requestFromApi).toHaveBeenCalledWith(
      `feature-controls?displayName=Test+Feature&status=active`,
      expect.anything()
    )
  })

  test('Should call API with all filters from query params', async () => {
    const mockFeatures = { items: [], uniqueScopes: [] }
    requestFromApi.mockResolvedValueOnce({ response: mockFeatures })

    const nameFilter = 'TEST_FEATURE'
    const displayNameFilter = 'Test Feature'
    const scopeFilter = 'Scope A'
    await server.inject({
      method: 'GET',
      url: `/features?name=${nameFilter}&displayName=${encodeURIComponent(displayNameFilter)}&scope=${scopeFilter}`,
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(requestFromApi).toHaveBeenCalledWith(
      `feature-controls?name=${nameFilter}&displayName=Test+Feature&scope=Scope+A&status=active`,
      expect.anything()
    )
  })

  test('Should include filter form in the response', async () => {
    requestFromApi.mockResolvedValueOnce({ response: { items: [], uniqueScopes: ['Scope A'] } })

    const { result } = await server.inject({
      method: 'GET',
      url: '/features',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    const $ = load(result)
    const form = $('form')
    expect(form.attr('method')).toBe('GET')
    expect(form.find('input[name="name"]')).toHaveLength(1)
    expect(form.find('input[name="displayName"]')).toHaveLength(1)
    expect(form.find('select[name="scope"]')).toHaveLength(1)
    expect(form.find('select[name="scope"] option')).toHaveLength(2) // "All scopes" + "Scope A"
    expect(form.find('button[type="submit"]').text().trim()).toBe('Filter')
  })

  test('Should populate filter form with current filter values', async () => {
    requestFromApi.mockResolvedValueOnce({ response: { items: [], uniqueScopes: ['Scope A', 'Scope B'] } })

    const nameFilter = 'some-feature'
    const displayNameFilter = 'Some Feature'
    const scopeFilter = 'Scope B'
    const { result } = await server.inject({
      method: 'GET',
      url: `/features?name=${nameFilter}&displayName=${encodeURIComponent(displayNameFilter)}&scope=${scopeFilter}&status=`,
      auth: {
        strategy: 'session',
        credentials
      }
    })

    const $ = load(result)
    expect($('input[name="name"]').val()).toBe(nameFilter)
    expect($('input[name="displayName"]').val()).toBe(displayNameFilter)
    expect($('select[name="scope"]').val()).toBe(scopeFilter)
    expect($('input[name="status"]').is(':checked')).toBe(true)
  })

  test('Should truncate long feature value', async () => {
    const mockFeatures = {
      items: [
        {
          name: 'LONG_FEATURE',
          displayName: 'Long Feature',
          value: 'this_is_a_very_long_value_that_should_be_truncated',
          lastUpdated: '2024-01-03T12:00:00Z',
          status: 'active'
        },
        {
          name: 'ANOTHER_FEATURE',
          displayName: 'Another Feature',
          value: 'val',
          lastUpdated: '2024-01-01T12:00:00Z',
          status: 'active'
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
    expect(firstRow.find('td').eq(2).text().trim()).toBe('this_is_a_ve...')
  })

  test('Should handle array values correctly', async () => {
    const mockFeatures = {
      items: [
        {
          name: 'ARRAY_FEATURE',
          displayName: 'Array Feature',
          value: ['val1', 'val2'],
          lastUpdated: '2024-01-01T12:00:00Z',
          status: 'active'
        },
        {
          name: 'ANOTHER_FEATURE',
          displayName: 'Another Feature',
          value: 'val',
          lastUpdated: '2024-01-01T12:00:00Z',
          status: 'active'
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
    expect(row.find('td').eq(2).text().trim()).toBe('val1,val2')

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

  test('Should call API with empty status when checkbox is unchecked', async () => {
    const mockFeatures = { items: [] }
    requestFromApi.mockResolvedValueOnce({ response: mockFeatures })

    await server.inject({
      method: 'GET',
      url: '/features?status=',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(requestFromApi).toHaveBeenCalledWith('feature-controls', expect.anything())
  })

  test('Should handle inactive features correctly', async () => {
    const mockFeatures = {
      items: [
        {
          name: 'EXPIRED_FEATURE',
          displayName: 'Expired Feature',
          value: 'expired-val',
          description: 'Expired description',
          scopes: 'Scope C',
          lastUpdated: '2024-01-01T12:00:00Z',
          status: 'expired'
        }
      ],
      uniqueScopes: ['Scope C']
    }
    requestFromApi.mockResolvedValueOnce({ response: mockFeatures })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/features?status=',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    const rows = $('tbody tr')
    expect(rows).toHaveLength(1)

    // Check Expired Feature (inactive-highlight and strikethrough should be applied)
    const expiredRow = rows.eq(0)
    expect(expiredRow.find('td').eq(0).hasClass('inactive-highlight')).toBe(true)
    expect(expiredRow.find('td').eq(1).hasClass('inactive-highlight')).toBe(true)
    expect(expiredRow.find('td').eq(1).hasClass('strikethrough')).toBe(true)

    // Check the status tag in the Feature column summary
    const expiredStatusTag = expiredRow.find('td').eq(0).find('.govuk-tag')
    expect(expiredStatusTag.text().trim()).toBe('EXPIRED')
    expect(expiredStatusTag.hasClass('govuk-tag--grey')).toBe(true)
  })

  test('Should exercise all filter branches in buildEndpointWithQueryParams', async () => {
    requestFromApi.mockResolvedValue({ response: { items: [], uniqueScopes: [] } })

    // Test each filter individually to cover branches in buildEndpointWithQueryParams
    const filterCombos = [
      { params: 'name=feat', expected: 'feature-controls?name=feat&status=active' },
      { params: 'displayName=display', expected: 'feature-controls?displayName=display&status=active' },
      { params: 'scope=ScopeA', expected: 'feature-controls?scope=ScopeA&status=active' },
      { params: 'status=active', expected: 'feature-controls?status=active' },
      { params: '', expected: 'feature-controls?status=active' }
    ]

    for (const combo of filterCombos) {
      await server.inject({
        method: 'GET',
        url: `/features?${combo.params}`,
        auth: {
          strategy: 'session',
          credentials
        }
      })
      expect(requestFromApi).toHaveBeenCalledWith(combo.expected, expect.anything())
    }
  })
})
