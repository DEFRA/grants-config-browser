import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { requestFromApi } from '../helpers/request-from-api.js'
import { load } from 'cheerio'
import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'

vi.mock('../helpers/request-from-api.js')

const featureControl = {
  name: 'TEST_BOOLEAN',
  displayName: 'Test Boolean',
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

  describe('detail', () => {
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
      expect(location).toBe('/features')
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
      requestFromApi.mockResolvedValue({ response: featureControl })

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
      expect($('[data-testid="app-heading-title"]').text()).toBe('Test Boolean')
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
          displayName: 'Test List',
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
          displayName: 'Test Number',
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
          displayName: 'Test List Error',
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

    test('Should show Update button for string type when authenticated', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'test-string',
          displayName: 'Test String',
          type: 'string',
          value: 'some value',
          created: '2023-01-01T12:00:00Z',
          createdBy: 'User A',
          lastUpdated: '2023-01-02T12:00:00Z',
          lastUpdatedBy: 'User B'
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/detail?name=test-string',
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      const updateButton = $('a.govuk-button')
      expect(updateButton.text().trim()).toBe('Update')
      expect(updateButton.attr('href')).toBe('/feature-control/update?name=test-string')
    })

    test('Should NOT show Update button for string type when NOT authenticated', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'test-string',
          displayName: 'Test String',
          type: 'string',
          value: 'some value'
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/detail?name=test-string'
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('a.govuk-button')).toHaveLength(0)
    })

    test('Should show Update button for list-string type when authenticated', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'test-list',
          displayName: 'Test List',
          type: 'list-string',
          value: ['a', 'b']
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
      const updateButton = $('a.govuk-button')
      expect(updateButton.text().trim()).toBe('Update')
    })

    test('Should show Update button for list-number type when authenticated', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'test-list-number',
          displayName: 'Test List Number',
          type: 'list-number',
          value: [1, 2]
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
      const updateButton = $('a.govuk-button')
      expect(updateButton.text().trim()).toBe('Update')
    })

    test('Should render page for boolean type with false value', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'test-false',
          displayName: 'Test False',
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
          displayName: 'Test List Number',
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
          displayName: 'Minimal Feature',
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

    test('Should handle history entries with same dateTime', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          ...featureControl,
          history: [
            { value: true, dateTime: '2023-01-01T12:00:00Z', setBy: 'User A', note: 'A' },
            { value: false, dateTime: '2023-01-01T12:00:00Z', setBy: 'User B', note: 'B' }
          ]
        }
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/detail?name=TEST_SAME_DATE',
        auth: { strategy: 'session', credentials }
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should handle null value in formatValue', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'null-value',
          displayName: 'Null Value',
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
  })

  describe('update', () => {
    test('Should return 401 if not authenticated', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/update?name=TEST_BOOLEAN'
      })

      expect(statusCode).toBe(statusCodes.unauthorized)
    })

    test('Should redirect to features page if invalid query parameters supplied', async () => {
      const {
        headers: { location },
        statusCode
      } = await server.inject({
        method: 'GET',
        url: '/feature-control/update',
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.moved)
      expect(location).toBe('/features')
    })

    test('Should return 404 if feature control not found', async () => {
      requestFromApi.mockResolvedValue(null)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/update?name=unknown',
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    test('Should render update page for boolean type', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'TEST_BOOLEAN',
          displayName: 'Test Boolean',
          type: 'boolean',
          value: true,
          description: 'A test boolean'
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/update?name=TEST_BOOLEAN',
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('[data-testid="app-heading-title"]').text()).toBe('Update Test Boolean')
      expect($('.govuk-caption-m').text()).toBe('TEST_BOOLEAN')
      expect($('input[name="value"][value="true"]').is(':checked')).toBe(true)
      expect($('input[name="value"][value="false"]').is(':checked')).toBe(false)
    })

    test('Should render update page for list-string type', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'TEST_LIST',
          displayName: 'Test List',
          type: 'list-string',
          value: ['a', 'b'],
          description: 'A test list'
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/update?name=TEST_LIST',
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('[data-testid="app-heading-title"]').text()).toBe('Update Test List')
      expect($('input[name="value"]').eq(0).val()).toBe('a')
      expect($('input[name="value"]').eq(1).val()).toBe('b')
    })

    test('Should render update page for list-number type', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'TEST_LIST_NUMBER',
          displayName: 'Test List Number',
          type: 'list-number',
          value: [1, 2],
          description: 'A test list number'
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/update?name=TEST_LIST_NUMBER',
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('[data-testid="app-heading-title"]').text()).toBe('Update Test List Number')
      expect($('input[name="value"]').eq(0).val()).toBe('1')
      expect($('input[name="value"]').eq(1).val()).toBe('2')
    })
  })

  describe('processUpdate', () => {
    test('Should return 401 if not authenticated', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_BOOLEAN', value: 'false', note: 'Changing value' }
      })

      expect(statusCode).toBe(statusCodes.unauthorized)
    })

    test('Should return 404 if feature control not found', async () => {
      requestFromApi.mockResolvedValue(null)

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'unknown', value: 'false', note: 'Changing value' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    test('Should redirect to detail page on successful update', async () => {
      requestFromApi.mockResolvedValueOnce({ response: featureControl })
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.accepted })

      const {
        headers: { location },
        statusCode
      } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_BOOLEAN', value: 'false', note: 'Changing value' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.moved)
      expect(location).toBe('/feature-control/detail?name=TEST_BOOLEAN')
      expect(requestFromApi).toHaveBeenLastCalledWith('feature-control/value', expect.anything(), {}, 'PUT', {
        name: 'TEST_BOOLEAN',
        value: false,
        user: 'User A',
        note: 'Changing value'
      })
    })

    test('Should show error on API failure', async () => {
      requestFromApi.mockResolvedValueOnce({ response: featureControl })
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.internalServerError })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_BOOLEAN', value: 'false', note: 'Changing value' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain(
        'There was a problem communicating with the API. Please try again later.'
      )
    })

    test('Should show error if note is missing', async () => {
      requestFromApi.mockResolvedValue({ response: featureControl })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_BOOLEAN', value: 'false', note: '' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('Enter a note to explain why this change is being made')
      expect($('#note-error').text()).toContain('Enter a note to explain why this change is being made')
      expect($('input[name="value"][value="false"]').is(':checked')).toBe(true)
    })

    test('Should show error if value is same as current', async () => {
      requestFromApi.mockResolvedValue({ response: featureControl })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_BOOLEAN', value: 'true', note: 'Same value' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('The value must be different from the current value')
      expect($('#value-error').text()).toContain('The value must be different from the current value')
      expect($('textarea[name="note"]').val()).toBe('Same value')
    })

    test('Should handle non-boolean values and still validate same value', async () => {
      const stringFeature = { ...featureControl, type: 'string', value: 'old' }
      requestFromApi.mockResolvedValue({ response: stringFeature })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_STRING', value: 'old', note: 'Same value' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('The value must be different from the current value')
    })

    test('Should render update page for string type', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'TEST_STRING',
          displayName: 'Test String',
          type: 'string',
          value: 'old value',
          description: 'A test string'
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/update?name=TEST_STRING',
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('[data-testid="app-heading-title"]').text()).toBe('Update Test String')
      expect($('textarea[name="value"]').val()).toBe('old value')
    })

    test('Should show error for empty string type', async () => {
      requestFromApi.mockResolvedValue({ response: { name: 'STR', type: 'string', value: 'old' } })
      const { result } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'STR', value: ' ', note: 'Empty' },
        auth: { strategy: 'session', credentials }
      })
      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('Enter a valid value')
    })

    test('Should render update page for number type', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'TEST_NUMBER',
          displayName: 'Test Number',
          type: 'number',
          value: 123,
          description: 'A test number'
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/update?name=TEST_NUMBER',
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('[data-testid="app-heading-title"]').text()).toBe('Update Test Number')
      expect($('textarea[name="value"]').val()).toBe('123')
    })

    test('Should show Update button for number type when authenticated', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'test-number',
          displayName: 'Test Number',
          type: 'number',
          value: 456
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
      const updateButton = $('a.govuk-button')
      expect(updateButton.text().trim()).toBe('Update')
      expect(updateButton.attr('href')).toBe('/feature-control/update?name=test-number')
    })

    test('Should successfully update number type', async () => {
      requestFromApi.mockResolvedValueOnce({
        response: {
          name: 'TEST_NUMBER',
          displayName: 'Test Number',
          type: 'number',
          value: 100
        }
      })
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.accepted })

      const {
        headers: { location },
        statusCode
      } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_NUMBER', value: '200', note: 'Updating number' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.moved)
      expect(location).toBe('/feature-control/detail?name=TEST_NUMBER')
      expect(requestFromApi).toHaveBeenLastCalledWith('feature-control/value', expect.anything(), {}, 'PUT', {
        name: 'TEST_NUMBER',
        value: 200,
        user: 'User A',
        note: 'Updating number'
      })
    })

    test('Should successfully update list-string type', async () => {
      requestFromApi.mockResolvedValueOnce({
        response: {
          name: 'TEST_LIST',
          displayName: 'Test List',
          type: 'list-string',
          value: ['a', 'b']
        }
      })
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.accepted })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_LIST', value: ['a', 'b', 'c'], note: 'Adding item' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.moved)
      expect(requestFromApi).toHaveBeenLastCalledWith('feature-control/value', expect.anything(), {}, 'PUT', {
        name: 'TEST_LIST',
        value: ['a', 'b', 'c'],
        user: 'User A',
        note: 'Adding item'
      })
    })

    test('Should show error if list-string value is same as current', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'TEST_LIST',
          displayName: 'Test List',
          type: 'list-string',
          value: ['a', 'b']
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_LIST', value: ['a', 'b'], note: 'Same value' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('The value must be different from the current value')
    })

    test('Should show error if list is empty', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'TEST_LIST',
          displayName: 'Test List',
          type: 'list-string',
          value: ['a', 'b']
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_LIST', value: ['', '  '], note: 'Empty list' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('Enter at least one item')
      expect($('#value-error').text()).toContain('Enter at least one item')
    })

    test('Should handle list type with missing value in payload', async () => {
      requestFromApi.mockResolvedValue({
        response: { name: 'LSTR', type: 'list-string', value: ['a'] }
      })

      const { result } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'LSTR', note: 'Missing value' },
        auth: { strategy: 'session', credentials }
      })

      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('Enter at least one item')
    })

    test('Should successfully add an item to list', async () => {
      requestFromApi.mockResolvedValue({
        response: { name: 'LSTR', type: 'list-string', value: ['a'] }
      })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'LSTR', value: 'a', action: 'add-item', note: 'Adding' },
        auth: { strategy: 'session', credentials }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      const inputs = $('input[name="value"]')
      expect(inputs.length).toBe(2)
      expect(inputs.eq(0).val()).toBe('a')
      expect(inputs.eq(1).val()).toBe('')
    })

    test('Should successfully remove an item from list', async () => {
      requestFromApi.mockResolvedValue({
        response: { name: 'LSTR', type: 'list-string', value: ['a', 'b', 'c'] }
      })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'LSTR', value: ['a', 'b', 'c'], action: 'remove-item-1', note: 'Removing' },
        auth: { strategy: 'session', credentials }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      const inputs = $('input[name="value"]')
      expect(inputs.length).toBe(2)
      expect(inputs.eq(0).val()).toBe('a')
      expect(inputs.eq(1).val()).toBe('c')
    })

    test('Should handle list-string contains empty items', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          name: 'TEST_LIST',
          displayName: 'Test List',
          type: 'list-string',
          value: ['a', 'b']
        }
      })

      const { result } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_LIST', value: ['a', ' ', 'b'], note: 'Empty item' },
        auth: { strategy: 'session', credentials }
      })

      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('Enter a valid list of items')
    })

    test('Should successfully update list-number type', async () => {
      requestFromApi.mockResolvedValueOnce({
        response: {
          name: 'TEST_LIST_NUMBER',
          displayName: 'Test List Number',
          type: 'list-number',
          value: [1, 2]
        }
      })
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.accepted })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_LIST_NUMBER', value: ['1', '2', '3'], note: 'Adding number' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.moved)
      expect(requestFromApi).toHaveBeenLastCalledWith('feature-control/value', expect.anything(), {}, 'PUT', {
        name: 'TEST_LIST_NUMBER',
        value: [1, 2, 3],
        user: 'User A',
        note: 'Adding number'
      })
    })

    test('Should handle history entry with missing dateTime', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          ...featureControl,
          history: [{ value: true, setBy: 'User A', note: 'No date' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/detail?name=TEST_GAP',
        auth: { strategy: 'session', credentials }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('.govuk-table__cell').eq(0).text().trim()).toBe('')
    })

    test('Should handle list type with non-array value in formatValue', async () => {
      requestFromApi.mockResolvedValue({
        response: {
          ...featureControl,
          type: 'list-string',
          value: 'not-an-array',
          history: []
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/detail?name=TEST_NON_ARRAY_LIST',
        auth: { strategy: 'session', credentials }
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('.govuk-inset-text').text()).toContain('not-an-array')
    })

    test('Should show error for invalid number (empty string)', async () => {
      requestFromApi.mockResolvedValue({ response: { name: 'NUM', type: 'number', value: 1 } })
      const { result } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'NUM', value: ' ', note: 'Empty' },
        auth: { strategy: 'session', credentials }
      })
      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('Enter a valid number')
    })

    test('Should show error for invalid list-number (non-numeric item)', async () => {
      requestFromApi.mockResolvedValue({ response: { name: 'LNUM', type: 'list-number', value: [1] } })
      const { result } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'LNUM', value: ['1', 'abc', '3'], note: 'Invalid item' },
        auth: { strategy: 'session', credentials }
      })
      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('Enter a valid list of numbers')
    })

    test('Should handle list-string with single non-array value in payload', async () => {
      requestFromApi.mockResolvedValueOnce({
        response: { name: 'LSTR', type: 'list-string', value: ['a'] }
      })
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.accepted })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'LSTR', value: 'b', note: 'Single value' },
        auth: { strategy: 'session', credentials }
      })

      expect(statusCode).toBe(statusCodes.moved)
      expect(requestFromApi).toHaveBeenLastCalledWith('feature-control/value', expect.anything(), {}, 'PUT', {
        name: 'LSTR',
        value: ['b'],
        user: 'User A',
        note: 'Single value'
      })
    })

    test('Should handle list-number with single non-array value in payload', async () => {
      requestFromApi.mockResolvedValueOnce({
        response: { name: 'LNUM', type: 'list-number', value: [1] }
      })
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.accepted })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'LNUM', value: '2', note: 'Single value' },
        auth: { strategy: 'session', credentials }
      })

      expect(statusCode).toBe(statusCodes.moved)
      expect(requestFromApi).toHaveBeenLastCalledWith('feature-control/value', expect.anything(), {}, 'PUT', {
        name: 'LNUM',
        value: [2],
        user: 'User A',
        note: 'Single value'
      })
    })

    test('Should handle list-number contains empty items', async () => {
      requestFromApi.mockResolvedValue({ response: { name: 'LNUM', type: 'list-number', value: [1] } })
      const { result } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'LNUM', value: ['1', '', '3'], note: 'Empty item' },
        auth: { strategy: 'session', credentials }
      })
      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('Enter a valid list of numbers')
    })

    test('Should show error if list-number value is same as current (array comparison)', async () => {
      requestFromApi.mockResolvedValue({
        response: { name: 'LNUM', type: 'list-number', value: [1, 2] }
      })

      const { result } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'LNUM', value: ['1', '2'], note: 'Same' },
        auth: { strategy: 'session', credentials }
      })

      const $ = load(result)
      expect($('.govuk-error-summary').text()).toContain('The value must be different from the current value')
    })

    test('Should NOT show error if list-number value is different length', async () => {
      requestFromApi.mockResolvedValueOnce({
        response: { name: 'LNUM', type: 'list-number', value: [1, 2] }
      })
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.accepted })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'LNUM', value: ['1', '2', '3'], note: 'Different length' },
        auth: { strategy: 'session', credentials }
      })

      expect(statusCode).toBe(statusCodes.moved)
    })

    test('Should NOT show error if list-number value has different elements', async () => {
      requestFromApi.mockResolvedValueOnce({
        response: { name: 'LNUM', type: 'list-number', value: [1, 2] }
      })
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.accepted })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'LNUM', value: ['1', '3'], note: 'Different elements' },
        auth: { strategy: 'session', credentials }
      })

      expect(statusCode).toBe(statusCodes.moved)
    })
  })
})
