import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { requestFromApi } from '../helpers/request-from-api.js'
import { load } from 'cheerio'

vi.mock('../helpers/request-from-api.js')

describe('#grantController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    // The real cookie is iron-encrypted; mimic hapi decoding it onto request.state.
    server.ext('onPreAuth', (request, h) => {
      const sessionId = request.headers.cookie?.match(/userSessionCookie=([^;]+)/)?.[1]
      if (sessionId) {
        request.state.userSessionCookie = { sessionId }
      }
      return h.continue
    })
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

  it('redirects to home page if invalid query parameters supplied', async () => {
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

    it('responds with 200 OK', () => {
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('renders the versions table', () => {
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

    it('defaults to sorting by Version descending', () => {
      const headerCells = $('table').eq(0).find('thead th')
      expect(headerCells.eq(0).text().trim()).toBe('Version')
      expect(headerCells.eq(0).attr('aria-sort')).toBe('descending')
      expect(headerCells.eq(2).text().trim()).toBe('Last Updated')
      expect(headerCells.eq(2).attr('aria-sort')).toBe('none')
    })

    it('gives each Version cell a numeric semver sort value', () => {
      const versionCells = $('table')
        .eq(0)
        .find('tbody tr')
        .map((_, row) => $(row).find('td').eq(0).attr('data-sort-value'))
        .get()

      expect(versionCells).toEqual(['2000000', '1000000'])
    })

    it('renders the related feature controls table', () => {
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

    it('responds with 200 OK', () => {
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('renders an empty feature controls table', () => {
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

    it('responds with 200 OK', () => {
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('renders an empty versions table', () => {
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

    it('responds  with 200 OK', () => {
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('renders  a single versions table row', () => {
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

    it('responds  with 200 OK', () => {
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('passs  archived=included through to the broker', () => {
      expect(allVersionsUrl).toEqual(expect.stringContaining('archived=included'))
    })

    it('renders  every version regardless of archived state', () => {
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

    it('renders  an "include archived" checkbox, unticked, when the param is absent', async () => {
      const $ = await render('/grant?grant=some-grant')

      expect(archivedCheckbox($)).toHaveLength(1)
      expect(archivedCheckbox($).is(':checked')).toBe(false)
    })

    it('ticks  the checkbox when archived=include is in the URL', async () => {
      const $ = await render('/grant?grant=some-grant&archived=include')

      expect(archivedCheckbox($).is(':checked')).toBe(true)
    })

    it('sits  in a GET form that reloads /grant preserving the grant', async () => {
      const $ = await render('/grant?grant=some-grant')
      const form = archivedCheckbox($).closest('form')

      expect(form.attr('method')).toMatch(/get/i)
      expect(form.find('input[type="hidden"][name="grant"]').attr('value')).toBe('some-grant')
    })

    it('provides  an Apply button to submit the filter', async () => {
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
          { version: '2.0.0', status: 'active', lastUpdated: '2023-01-03', archived: true },
          { version: '1.1.0', status: 'active', lastUpdated: '2023-01-02' },
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

    it('shows  an Unarchive button for an archived version', () => {
      expect(rowButtonText(0)).toBe('Unarchive')
    })

    it('shows  an Archive button for a non-latest non-archived version', () => {
      expect(rowButtonText(2)).toBe('Archive')
    })

    const rowForm = (index) => $('table').eq(0).find('tbody tr').eq(index).find('form')

    it('links  the Archive button to the archive confirmation page', () => {
      const form = rowForm(2)

      expect(form.attr('method')).toMatch(/get/i)
      expect(form.attr('action')).toBe('/version/archive')
      expect(form.find('input[name="grant"]').attr('value')).toBe('some-grant')
      expect(form.find('input[name="version"]').attr('value')).toBe('1.0.0')
    })

    it('links  the Unarchive button to the unarchive confirmation page', () => {
      const form = rowForm(0)

      expect(form.attr('method')).toMatch(/get/i)
      expect(form.attr('action')).toBe('/version/unarchive')
      expect(form.find('input[name="version"]').attr('value')).toBe('2.0.0')
    })
  })

  describe('Hiding the Archive button for the latest of a major line', () => {
    let $

    beforeAll(async () => {
      requestFromApi.mockResolvedValueOnce({
        response: [
          { version: '2.0.0', status: 'active', lastUpdated: '2023-01-05' },
          { version: '1.2.0', status: 'active', lastUpdated: '2023-01-04', archived: true },
          { version: '1.1.0', status: 'active', lastUpdated: '2023-01-03' },
          { version: '1.0.0', status: 'active', lastUpdated: '2023-01-02' }
        ]
      })
      requestFromApi.mockResolvedValueOnce({ response: {} })

      const { result } = await server.inject({
        method: 'GET',
        url: '/grant?grant=some-grant&archived=include'
      })

      $ = load(result)
    })

    const rowButton = (version) =>
      $(`a[href="/version?grant=some-grant&version=${version}"]`).closest('tr').find('button').text().trim()

    it('hides the Archive button on the highest non-archived version of a major', () => {
      expect(rowButton('2.0.0')).toBe('')
    })

    it('still offers Archive on lower versions of a major', () => {
      expect(rowButton('1.0.0')).toBe('Archive')
    })

    it('treats the highest non-archived version as the latest when a higher one is archived', () => {
      expect(rowButton('1.1.0')).toBe('')
    })

    it('still offers Unarchive on an archived version', () => {
      expect(rowButton('1.2.0')).toBe('Unarchive')
    })
  })

  describe('Showing the archiving outcome after the redirect', () => {
    const credentials = { isAuthenticated: true, displayName: 'User A', roles: ['view.only'] }

    const getGrant = () =>
      server.inject({
        method: 'GET',
        url: '/grant?grant=some-grant',
        auth: { strategy: 'session', credentials },
        headers: { cookie: 'userSessionCookie=session-123' }
      })

    beforeEach(() => {
      requestFromApi.mockResolvedValueOnce({
        response: [{ version: '1.0.0', status: 'active', lastUpdated: '2023-01-01' }]
      })
      requestFromApi.mockResolvedValueOnce({ response: {} })
    })

    it('shows a success banner and clears the outcome from the session', async () => {
      await server.session.set('session-123-archiving', { status: 'success', action: 'archive', version: '1.0.0' })

      const $ = load((await getGrant()).result)

      const banner = $('.govuk-notification-banner--success')
      expect(banner).toHaveLength(1)
      expect(banner.text()).toContain('Version 1.0.0 has been archived')
      expect(await server.session.get('session-123-archiving')).toBeNull()
    })

    it('shows a failure banner carrying the broker error', async () => {
      await server.session.set('session-123-archiving', {
        status: 'failure',
        action: 'unarchive',
        version: '2.0.0',
        error: 'Cannot unarchive the version'
      })

      const $ = load((await getGrant()).result)

      const banner = $('.govuk-notification-banner')
      expect(banner).toHaveLength(1)
      expect(banner.text()).toContain('Version 2.0.0 could not be unarchived')
      expect(banner.text()).toContain('Cannot unarchive the version')
      expect(await server.session.get('session-123-archiving')).toBeNull()
    })

    it('shows no banner when the session holds no outcome', async () => {
      const $ = load((await getGrant()).result)

      expect($('.govuk-notification-banner')).toHaveLength(0)
    })
  })

  describe('Archiving confirmation page', () => {
    it('asks the user to confirm archiving a version', async () => {
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

    it('asks the user to confirm unarchiving and preserve the archived filter', async () => {
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

    it('redirects  to home when the confirmation query is invalid', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/version/archive?grant=some-grant'
      })

      expect(statusCode).toBe(statusCodes.moved)
      expect(headers.location).toBe('/')
    })

    it('cancels back to the version page and carry the origin when launched from it', async () => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/version/archive?grant=some-grant&version=1.0.0&origin=version'
      })
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('form').find('input[name="origin"]').attr('value')).toBe('version')
      expect($('a:contains("Cancel")').attr('href')).toBe('/version?grant=some-grant&version=1.0.0')
    })
  })

  describe('Archiving and unarchiving a version', () => {
    const credentials = { isAuthenticated: true, displayName: 'User A', roles: ['view.only'] }

    const post = (url, payload) =>
      server.inject({
        method: 'POST',
        url,
        payload,
        auth: { strategy: 'session', credentials },
        headers: { cookie: 'userSessionCookie=session-123' }
      })

    describe('on archiving', () => {
      let statusCode
      let headers

      beforeEach(async () => {
        requestFromApi.mockResolvedValueOnce({ status: statusCodes.ok })

        const response = await post('/version/archive', { grant: 'some-grant', version: '1.0.0' })
        statusCode = response.statusCode
        headers = response.headers
      })

      it('calls the archive endpoint', () => {
        expect(requestFromApi).toHaveBeenCalledWith(
          'version/archive',
          expect.anything(),
          {},
          'POST',
          { grant: 'some-grant', version: '1.0.0', user: 'User A' },
          true
        )
      })

      it('stores the result on the session', async () => {
        expect(await server.session.get('session-123-archiving')).toEqual({
          status: 'success',
          action: 'archive',
          version: '1.0.0'
        })
      })

      it('redirects to the grant page', () => {
        expect(statusCode).toBe(statusCodes.moved)
        expect(headers.location).toBe('/grant?grant=some-grant')
      })
    })

    describe('on unarchiving', () => {
      let statusCode
      let headers

      beforeEach(async () => {
        requestFromApi.mockResolvedValueOnce({ status: statusCodes.ok })

        const response = await post('/version/unarchive', {
          grant: 'some-grant',
          version: '1.0.0',
          archived: 'include'
        })
        statusCode = response.statusCode
        headers = response.headers
      })

      it('calls the unarchive endpoint', () => {
        expect(requestFromApi).toHaveBeenCalledWith(
          'version/unarchive',
          expect.anything(),
          {},
          'POST',
          { grant: 'some-grant', version: '1.0.0', user: 'User A' },
          true
        )
      })

      it('stores the result on the session', async () => {
        expect(await server.session.get('session-123-archiving')).toEqual({
          status: 'success',
          action: 'unarchive',
          version: '1.0.0'
        })
      })

      it('redirects to the grant page preserving the archived filter', () => {
        expect(statusCode).toBe(statusCodes.moved)
        expect(headers.location).toBe('/grant?grant=some-grant&archived=include')
      })
    })

    describe('on archiving from the version page', () => {
      let statusCode
      let headers

      beforeEach(async () => {
        requestFromApi.mockResolvedValueOnce({ status: statusCodes.ok })

        const response = await post('/version/archive', {
          grant: 'some-grant',
          version: '1.0.0',
          origin: 'version'
        })
        statusCode = response.statusCode
        headers = response.headers
      })

      it('stores the result on the session', async () => {
        expect(await server.session.get('session-123-archiving')).toEqual({
          status: 'success',
          action: 'archive',
          version: '1.0.0'
        })
      })

      it('redirects back to the version page', () => {
        expect(statusCode).toBe(statusCodes.moved)
        expect(headers.location).toBe('/version?grant=some-grant&version=1.0.0')
      })
    })

    describe('when the broker rejects the archive', () => {
      let statusCode
      let headers

      beforeEach(async () => {
        requestFromApi.mockResolvedValueOnce({
          status: statusCodes.badRequest,
          href: 'http://broker/api/version/archive',
          error: 'Cannot archive the latest version'
        })

        const response = await post('/version/archive', { grant: 'some-grant', version: '1.0.0' })
        statusCode = response.statusCode
        headers = response.headers
      })

      it('stores the broker error message on the session', async () => {
        expect(await server.session.get('session-123-archiving')).toEqual({
          status: 'failure',
          action: 'archive',
          version: '1.0.0',
          error: 'Cannot archive the latest version'
        })
      })

      it('redirects to the grant page', () => {
        expect(statusCode).toBe(statusCodes.moved)
        expect(headers.location).toBe('/grant?grant=some-grant')
      })
    })

    describe('when the broker returns no message', () => {
      beforeEach(async () => {
        requestFromApi.mockResolvedValueOnce(null)

        await post('/version/archive', { grant: 'some-grant', version: '1.0.0' })
      })

      it('stores a generic error on the session', async () => {
        expect(await server.session.get('session-123-archiving')).toEqual({
          status: 'failure',
          action: 'archive',
          version: '1.0.0',
          error: 'The request could not be completed'
        })
      })
    })

    describe('on an invalid payload', () => {
      let statusCode
      let headers

      beforeEach(async () => {
        const response = await post('/version/archive', { grant: 'some-grant' })
        statusCode = response.statusCode
        headers = response.headers
      })

      it('stores a validation failure on the session', async () => {
        const stored = await server.session.get('session-123-archiving')
        expect(stored.status).toBe('failure')
        expect(stored.action).toBe('archive')
        expect(stored.error).toBeTruthy()
      })

      it('redirects to home', () => {
        expect(statusCode).toBe(statusCodes.moved)
        expect(headers.location).toBe('/')
      })
    })

    describe('without authentication', () => {
      it('rejects an archive request', async () => {
        const { statusCode } = await server.inject({
          method: 'POST',
          url: '/version/archive',
          payload: { grant: 'some-grant', version: '1.0.0' }
        })

        expect(statusCode).toBe(statusCodes.unauthorized)
      })

      it('rejects an unarchive request', async () => {
        const { statusCode } = await server.inject({
          method: 'POST',
          url: '/version/unarchive',
          payload: { grant: 'some-grant', version: '1.0.0' }
        })

        expect(statusCode).toBe(statusCodes.unauthorized)
      })
    })
  })
})
