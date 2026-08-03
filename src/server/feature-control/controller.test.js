import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { requestFromApi } from '../helpers/request-from-api.js'
import { load } from 'cheerio'
import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'

vi.mock('../helpers/request-from-api.js')

describe('#featureControlController', () => {
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
      url: '/feature-control/detail?name=TEST_BOOLEAN'
    })

    expect(statusCode).toBe(statusCodes.unauthorized)
  })

  test('Should redirect to home page if invalid query parameters supplied', async () => {
    const {
      headers: { location },
      statusCode
    } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.moved)
    expect(location).toBe('/')
  })

  test('Should return 404 if feature control not found', async () => {
    requestFromApi.mockResolvedValue(null)

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=unknown',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(404)
  })

  test('Should render page for boolean type', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'TEST_BOOLEAN',
        type: 'boolean',
        value: true,
        description: 'A test boolean',
        created: '2023-01-01T12:00:00Z',
        createdBy: 'User A',
        lastUpdated: '2023-01-02T12:00:00Z',
        lastUpdatedBy: 'User B',
        expiryDate: '2024-01-01T12:00:00Z',
        scopes: ['scope1'],
        roleRequired: ['admin'],
        history: [{ value: true, dateTime: '2023-01-01T12:00:00Z', setBy: 'User A', note: 'Initial' }]
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=TEST_BOOLEAN',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('h1').text()).toContain('Test Boolean')
    expect($('.govuk-caption-m').text()).toBe('TEST_BOOLEAN')
    expect($('.govuk-inset-text').text()).toContain('Current value')
    expect($('.govuk-inset-text').text()).toContain('True')
    expect($('.govuk-summary-list__value').eq(0).text().trim()).toBe('Toggle')
    expect($('.govuk-summary-list__value').eq(1).text().trim()).toBe('scope1')
    expect($('.govuk-table__cell').eq(0).text().trim()).toBe('01/01/2023')
    expect($('.govuk-table__cell').eq(2).text().trim()).toBe('True')

    // Check breadcrumbs
    const breadcrumbs = $('.govuk-breadcrumbs__list-item')
    expect(breadcrumbs.eq(0).text().trim()).toBe('Home')
    expect(breadcrumbs.eq(1).text().trim()).toBe('Features')
    expect(breadcrumbs.eq(2).text().trim()).toBe('Test Boolean')
  })

  test('Should render page for list-string type', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'test-list',
        type: 'list-string',
        value: ['a', 'b'],
        created: '2023-01-01T12:00:00Z',
        createdBy: 'User A',
        lastUpdated: '2023-01-02T12:00:00Z',
        lastUpdatedBy: 'User B',
        history: [{ value: ['a', 'b'], dateTime: '2023-01-01T12:00:00Z', setBy: 'User A' }]
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=test-list',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-inset-text').find('ul li')).toHaveLength(2)
    expect($('.govuk-inset-text').find('li').eq(0).text().trim()).toBe('a')
    expect($('.govuk-inset-text').find('li').eq(1).text().trim()).toBe('b')
    expect($('.govuk-table__cell').eq(0).text().trim()).toBe('01/01/2023')
    expect($('.govuk-table__cell').eq(2).text().trim()).toBe('a, b')
  })

  test('Should render page for number type', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'test-number',
        type: 'number',
        value: 42,
        created: '2023-01-01T12:00:00Z',
        createdBy: 'User A',
        lastUpdated: '2023-01-02T12:00:00Z',
        lastUpdatedBy: 'User B',
        history: [{ value: 42, dateTime: '2023-01-01T12:00:00Z', setBy: 'User A' }]
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=test-number',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-inset-text').text()).toContain('42')
  })

  test('Should handle list type with non-array value', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'test-list-error',
        type: 'list-string',
        value: null,
        created: '2023-01-01T12:00:00Z',
        createdBy: 'User A',
        lastUpdated: '2023-01-02T12:00:00Z',
        lastUpdatedBy: 'User B'
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=test-list-error',
      auth: {
        strategy: 'session',
        credentials
      }
    })
    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-inset-text').text().replace('Current value', '').trim()).toBe('')
  })

  test('Should render page for boolean type with false value', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'test-false',
        type: 'boolean',
        value: false,
        created: '2023-01-01T12:00:00Z',
        createdBy: 'User A',
        lastUpdated: '2023-01-02T12:00:00Z',
        lastUpdatedBy: 'User B'
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=test-false',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-inset-text').text()).toContain('False')
  })

  test('Should render page for list-number type', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'test-list-number',
        type: 'list-number',
        value: [1, 2, 3],
        created: '2023-01-01T12:00:00Z',
        createdBy: 'User A',
        lastUpdated: '2023-01-02T12:00:00Z',
        lastUpdatedBy: 'User B'
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=test-list-number',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-inset-text').find('li')).toHaveLength(3)
    expect($('.govuk-inset-text').find('li').eq(0).text().trim()).toBe('1')
  })

  test('Should handle missing history, scopes and roles', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'minimal-feature',
        type: 'string',
        value: 'some value',
        created: null,
        createdBy: 'User A',
        lastUpdated: null,
        lastUpdatedBy: 'User B',
        history: [{ value: 'v1', dateTime: null, setBy: 'User A' }],
        scopes: null,
        roleRequired: null
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=minimal-feature',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-table__cell').eq(0).text().trim()).toBe('') // Missing history dateTime
    expect($('.govuk-table__cell').eq(1).text().trim()).toBe('User A')
    expect($('.govuk-summary-list__value').eq(1).text().trim()).toBe('') // Scopes
    expect($('.govuk-summary-list__value').eq(4).text().trim()).toBe('') // Created (missing date)
    expect($('.govuk-summary-list__value').eq(5).text().trim()).toBe('') // Updated (missing date)
    expect($('.govuk-summary-list__value').eq(6).text().trim()).toBe('No role required') // Roles
  })

  test('Should handle null value in formatValue', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'null-value',
        type: 'string',
        value: null,
        created: '2023-01-01T12:00:00Z',
        createdBy: 'User A',
        lastUpdated: '2023-01-02T12:00:00Z',
        lastUpdatedBy: 'User B'
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=null-value',
      auth: {
        strategy: 'session',
        credentials
      }
    })
    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-inset-text').text().replace('Current value', '').trim()).toBe('')
  })

  test('Should render page for unknown type', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'unknown-type',
        type: 'unknown',
        value: 'some value',
        created: '2023-01-01T12:00:00Z',
        createdBy: 'User A',
        lastUpdated: '2023-01-02T12:00:00Z',
        lastUpdatedBy: 'User B'
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=unknown-type',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-summary-list__value').eq(0).text().trim()).toBe('Text')
  })

  test('Should handle history with multiple entries and sort them', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'TEST_SORT',
        type: 'boolean',
        value: true,
        history: [
          { value: false, dateTime: '2023-01-01T12:00:00Z', setBy: 'User A' },
          { value: true, dateTime: '2023-01-02T12:00:00Z', setBy: 'User B' },
          { value: true, dateTime: null, setBy: 'User C' }
        ]
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=TEST_SORT',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    const rows = $('.govuk-table__row')
    // Row 0 is header
    // Row 1 should be 2023-01-02
    // Row 2 should be 2023-01-01
    // Row 3 should be null/empty
    expect(rows.eq(1).find('.govuk-table__cell').eq(0).text().trim()).toBe('02/01/2023')
    expect(rows.eq(2).find('.govuk-table__cell').eq(0).text().trim()).toBe('01/01/2023')
    expect(rows.eq(3).find('.govuk-table__cell').eq(0).text().trim()).toBe('')
  })

  test('Should handle history with missing dateTime in both entries during sort', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'TEST_SORT_NULL',
        type: 'boolean',
        value: true,
        history: [
          { value: true, dateTime: null, setBy: 'User A' },
          { value: false, dateTime: null, setBy: 'User B' }
        ]
      }
    })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=TEST_SORT_NULL',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should correctly format displayName from name with underscores', async () => {
    requestFromApi.mockResolvedValue({
      response: {
        name: 'MULTIPLE_WORD_FEATURE_NAME',
        type: 'boolean',
        value: true
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=MULTIPLE_WORD_FEATURE_NAME',
      auth: {
        strategy: 'session',
        credentials
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('h1').text()).toContain('Multiple Word Feature Name')
  })
})
