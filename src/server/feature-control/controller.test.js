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

  test('Should redirect to home page if invalid query parameters supplied', async () => {
    const {
      headers: { location },
      statusCode
    } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail'
    })

    expect(statusCode).toBe(statusCodes.moved)
    expect(location).toBe('/')
  })

  test('Should return 404 if feature control not found', async () => {
    requestFromApi.mockResolvedValue(null)

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/feature-control/detail?name=unknown'
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
      url: '/feature-control/detail?name=TEST_BOOLEAN'
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('h1').text()).toContain('Test Boolean')
    expect($('.govuk-summary-list__value').eq(1).text().trim()).toBe('boolean')
    expect($('.govuk-summary-list__value').eq(2).text().trim()).toBe('True')
    expect($('.govuk-table__cell').eq(0).text().trim()).toBe('True')

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
      url: '/feature-control/detail?name=test-list'
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-summary-list__value').eq(2).find('ul li').length).toBe(2)
    expect($('.govuk-summary-list__value').eq(2).find('li').eq(0).text().trim()).toBe('a')
    expect($('.govuk-summary-list__value').eq(2).find('li').eq(1).text().trim()).toBe('b')
    expect($('.govuk-table__cell').eq(0).text().trim()).toBe('a, b')
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
      url: '/feature-control/detail?name=test-number'
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-summary-list__value').eq(2).text().trim()).toBe('42')
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
      url: '/feature-control/detail?name=test-list-error'
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-summary-list__value').eq(2).text().trim()).toBe('')
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
      url: '/feature-control/detail?name=test-false'
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-summary-list__value').eq(2).text().trim()).toBe('False')
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
      url: '/feature-control/detail?name=test-list-number'
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-summary-list__value').eq(2).find('li').length).toBe(3)
    expect($('.govuk-summary-list__value').eq(2).find('li').eq(0).text().trim()).toBe('1')
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
      url: '/feature-control/detail?name=minimal-feature'
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-table__cell').eq(1).text().trim()).toBe('') // Missing history dateTime
    expect($('.govuk-summary-list__value').eq(3).text().trim()).toBe('') // Scopes
    expect($('.govuk-summary-list__value').eq(6).text().trim()).toBe('') // Created (missing date)
    expect($('.govuk-summary-list__value').eq(7).text().trim()).toBe('') // Updated (missing date)
    expect($('.govuk-summary-list__value').eq(8).text().trim()).toBe('No role required') // Roles
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
      url: '/feature-control/detail?name=null-value'
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('.govuk-summary-list__value').eq(2).text().trim()).toBe('')
  })
})
