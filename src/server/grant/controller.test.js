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
            .find('td:not(:last-child)')
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
            .find('td:not(:last-child)')
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
            .find('td:not(:last-child)')
            .text()
            .trim()
            .replaceAll(/[\\n\s]+/g, ' ')
        )
        .get()

      expect(versionRows).toEqual(['2.0.0 Active 02/01/2023', '1.0.0 Draft 01/01/2023'])
    })
  })

  describe('Archived versions filter', () => {
    const archivedCheckbox = ($) => $('input[name="archived"][value="include"]')

    const render = async (url) => {
      requestFromApi.mockResolvedValueOnce({ response: [] })
      requestFromApi.mockResolvedValueOnce({ response: {} })
      const { result } = await server.inject({ method: 'GET', url })
      return load(result)
    }

    test('Should render an "include archived" checkbox, unticked, when the param is absent', async () => {
      const $ = await render('/grant?grant=some-grant')

      expect(archivedCheckbox($)).toHaveLength(1)
      expect(archivedCheckbox($).is(':checked')).toBe(false)
    })

    test('Should tick the checkbox when archived=include is in the URL', async () => {
      const $ = await render('/grant?grant=some-grant&archived=include')

      expect(archivedCheckbox($).is(':checked')).toBe(true)
    })

    test('Should sit in a GET form that reloads /grant preserving the grant', async () => {
      const $ = await render('/grant?grant=some-grant')
      const form = archivedCheckbox($).closest('form')

      expect(form.attr('method')).toMatch(/get/i)
      expect(form.find('input[type="hidden"][name="grant"]').attr('value')).toBe('some-grant')
    })

    test('Should provide an Apply button to submit the filter', async () => {
      const $ = await render('/grant?grant=some-grant')
      const form = archivedCheckbox($).closest('form')

      expect(form.find('button:contains("Apply")')).toHaveLength(1)
    })
  })

  describe('Archive and unarchive version buttons', () => {
    let $

    beforeAll(async () => {
      requestFromApi.mockResolvedValueOnce({
        response: [
          { version: '2.0.0', status: 'active', lastUpdated: '2023-01-02', archived: true },
          { version: '1.0.0', status: 'draft', lastUpdated: '2023-01-01' }
        ]
      })
      requestFromApi.mockResolvedValueOnce({ response: {} })

      const { result } = await server.inject({
        method: 'GET',
        url: '/grant?grant=some-grant&archived=include'
      })

      $ = load(result)
    })

    const rowButtonText = (index) => $('table').eq(0).find('tbody tr').eq(index).find('button').text().trim()

    test('Should show an Unarchive button for an archived version', () => {
      expect(rowButtonText(0)).toBe('Unarchive')
    })

    test('Should show an Archive button for a non-archived version', () => {
      expect(rowButtonText(1)).toBe('Archive')
    })

    const rowForm = (index) => $('table').eq(0).find('tbody tr').eq(index).find('form')

    test('Should link the Archive button to the archive confirmation page', () => {
      const form = rowForm(1)

      expect(form.attr('method')).toMatch(/get/i)
      expect(form.attr('action')).toBe('/version/archive')
      expect(form.find('input[name="grant"]').attr('value')).toBe('some-grant')
      expect(form.find('input[name="version"]').attr('value')).toBe('1.0.0')
    })

    test('Should link the Unarchive button to the unarchive confirmation page', () => {
      const form = rowForm(0)

      expect(form.attr('method')).toMatch(/get/i)
      expect(form.attr('action')).toBe('/version/unarchive')
      expect(form.find('input[name="version"]').attr('value')).toBe('2.0.0')
    })
  })

  describe('Archiving confirmation page', () => {
    test('Should ask the user to confirm archiving a version', async () => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/version/archive?grant=some-grant&version=1.0.0'
      })
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toContain('Are you sure you want to archive version 1.0.0 of grant some-grant')

      const form = $('form')
      expect(form.attr('method')).toMatch(/post/i)
      expect(form.attr('action')).toBe('/version/archive')
      expect(form.find('input[name="grant"]').attr('value')).toBe('some-grant')
      expect(form.find('input[name="version"]').attr('value')).toBe('1.0.0')
      expect(form.find('button:contains("Confirm")')).toHaveLength(1)
      expect($('a:contains("Cancel")').attr('href')).toBe('/grant?grant=some-grant')
    })

    test('Should ask the user to confirm unarchiving and preserve the archived filter', async () => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/version/unarchive?grant=some-grant&version=2.0.0&archived=include'
      })
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toContain('Are you sure you want to unarchive version 2.0.0 of grant some-grant')
      expect($('form').attr('action')).toBe('/version/unarchive')
      expect($('form').find('input[name="archived"]').attr('value')).toBe('include')
      expect($('a:contains("Cancel")').attr('href')).toBe('/grant?grant=some-grant&archived=include')
    })

    test('Should redirect to home when the confirmation query is invalid', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/version/archive?grant=some-grant'
      })

      expect(statusCode).toBe(statusCodes.moved)
      expect(headers.location).toBe('/')
    })
  })

  describe('Archiving and unarchiving a version', () => {
    const credentials = { isAuthenticated: true, displayName: 'User A', roles: ['view.only'], sessionId: 'session-123' }

    const post = (url, payload) =>
      server.inject({ method: 'POST', url, payload, auth: { strategy: 'session', credentials } })

    test('Should archive the version, store the success, and redirect back to the grant page', async () => {
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.ok })

      const { statusCode, headers } = await post('/version/archive', { grant: 'some-grant', version: '1.0.0' })

      expect(requestFromApi).toHaveBeenCalledWith(
        'version/archive',
        expect.anything(),
        {},
        'POST',
        { grant: 'some-grant', version: '1.0.0', user: 'User A' },
        true
      )
      expect(await server.session.get('session-123-archiving')).toEqual({
        status: 'success',
        action: 'archive',
        version: '1.0.0'
      })
      expect(statusCode).toBe(statusCodes.moved)
      expect(headers.location).toBe('/grant?grant=some-grant')
    })

    test('Should unarchive the version, store the success, and preserve the archived filter', async () => {
      requestFromApi.mockResolvedValueOnce({ status: statusCodes.ok })

      const { statusCode, headers } = await post('/version/unarchive', {
        grant: 'some-grant',
        version: '1.0.0',
        archived: 'include'
      })

      expect(requestFromApi).toHaveBeenCalledWith(
        'version/unarchive',
        expect.anything(),
        {},
        'POST',
        { grant: 'some-grant', version: '1.0.0', user: 'User A' },
        true
      )
      expect(await server.session.get('session-123-archiving')).toEqual({
        status: 'success',
        action: 'unarchive',
        version: '1.0.0'
      })
      expect(statusCode).toBe(statusCodes.moved)
      expect(headers.location).toBe('/grant?grant=some-grant&archived=include')
    })

    test('Should store the broker error message when archiving fails', async () => {
      requestFromApi.mockResolvedValueOnce({
        status: statusCodes.badRequest,
        href: 'http://broker/api/version/archive',
        error: 'Cannot archive the latest version'
      })

      const { statusCode, headers } = await post('/version/archive', { grant: 'some-grant', version: '1.0.0' })

      expect(await server.session.get('session-123-archiving')).toEqual({
        status: 'failure',
        action: 'archive',
        version: '1.0.0',
        error: 'Cannot archive the latest version'
      })
      expect(statusCode).toBe(statusCodes.moved)
      expect(headers.location).toBe('/grant?grant=some-grant')
    })

    test('Should store a generic error when the broker returns no message', async () => {
      requestFromApi.mockResolvedValueOnce(null)

      await post('/version/archive', { grant: 'some-grant', version: '1.0.0' })

      expect(await server.session.get('session-123-archiving')).toEqual({
        status: 'failure',
        action: 'archive',
        version: '1.0.0',
        error: 'The request could not be completed'
      })
    })

    test('Should store a validation failure and redirect to home when the payload is invalid', async () => {
      const { statusCode, headers } = await post('/version/archive', { grant: 'some-grant' })

      const stored = await server.session.get('session-123-archiving')
      expect(stored.status).toBe('failure')
      expect(stored.action).toBe('archive')
      expect(stored.error).toBeTruthy()

      expect(statusCode).toBe(statusCodes.moved)
      expect(headers.location).toBe('/')
    })

    test('Should reject an unauthenticated archive request', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/version/archive',
        payload: { grant: 'some-grant', version: '1.0.0' }
      })

      expect(statusCode).toBe(statusCodes.unauthorized)
    })

    test('Should reject an unauthenticated unarchive request', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/version/unarchive',
        payload: { grant: 'some-grant', version: '1.0.0' }
      })

      expect(statusCode).toBe(statusCodes.unauthorized)
    })
  })
})
