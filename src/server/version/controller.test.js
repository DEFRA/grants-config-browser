import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { requestFromApi } from '../helpers/request-from-api.js'
import { load } from 'cheerio'

vi.mock('../helpers/request-from-api.js')

describe('#versionController', () => {
  let server

  const versionDetail = {
    grant: 'some-grant',
    version: '1.2.3',
    manifest: ['file1', 'grants-ui-file.yaml', 'some-gas-file.json', 'grants-ui/allowlist.yaml', 'some-cw.json'],
    status: 'active',
    path: 'some-bucket'
  }

  // The version page makes two broker calls: the version detail then the full
  // version list used to work out whether this is the latest of its major.
  const mockVersion = (detail = versionDetail, allVersions = [{ version: '1.0.0', status: 'active' }]) => {
    requestFromApi.mockResolvedValueOnce({ response: detail })
    requestFromApi.mockResolvedValueOnce({ response: allVersions })
  }

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
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    requestFromApi.mockReset()
  })

  it('redirects to home page if invalid query parameters supplied', async () => {
    const {
      headers: { location },
      statusCode
    } = await server.inject({
      method: 'GET',
      url: '/version?version=1.2.3'
    })

    expect(statusCode).toBe(statusCodes.moved)
    expect(location).toBe('/')
  })

  it('renders page with expected elements', async () => {
    mockVersion()
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/version?grant=some-grant&version=1.2.3'
    })

    const $ = load(result)

    expect(result).toEqual(expect.stringContaining('some-grant - 1.2.3 |'))
    const statusTag = $('strong.govuk-tag--green').text()
    expect(statusTag).toMatch('Active')
    const headers = $('th.govuk-table__header')
      .map((_, el) => $(el).text().trim())
      .get()
    expect(headers).toContain('Config files')
    expect(headers).toContain('Actions')

    const rows = $('table tbody tr')

    // Check first file (no visualise link)
    const firstRowCells = rows.eq(0).find('td')
    expect(firstRowCells.eq(0).text().trim()).toBe('file1')
    expect(firstRowCells.eq(1).text().trim()).toBe('')

    // Check second file (with visualise link)
    const secondRowCells = rows.eq(1).find('td')
    expect(secondRowCells.eq(0).text().trim()).toBe('grants-ui-file.yaml')
    expect(secondRowCells.eq(1).text().trim()).toContain('Visualise')

    const visualiseLink = secondRowCells.eq(1).find('a.visualise-link')
    expect(visualiseLink.attr('href')).toBe(
      '/visualise-journey?filename=grants-ui-file.yaml&bucket=some-bucket&grant=some-grant&version=1.2.3'
    )
    expect(visualiseLink.find('img.visualise-icon').length).toBe(1)
    expect(visualiseLink.find('img.visualise-icon').attr('src')).toBe('/public/assets/images/visualise.svg')

    // Check third file (with visualise-gas link)
    const thirdRowCells = rows.eq(2).find('td')
    expect(thirdRowCells.eq(0).text().trim()).toBe('some-gas-file.json')
    expect(thirdRowCells.eq(1).text().trim()).toContain('Visualise')

    const visualiseGasLink = thirdRowCells.eq(1).find('a.visualise-link')
    expect(visualiseGasLink.attr('href')).toBe(
      '/visualise-gas?filename=some-gas-file.json&bucket=some-bucket&grant=some-grant&version=1.2.3'
    )

    // Check fourth file (no visualise link)
    const fourthRowCells = rows.eq(3).find('td')
    expect(fourthRowCells.eq(0).text().trim()).toBe('grants-ui/allowlist.yaml')
    expect(fourthRowCells.eq(1).text().trim()).toBe('')

    // Check fifth file (with visualise-cw link)
    const fifthRowCells = rows.eq(4).find('td')
    expect(fifthRowCells.eq(0).text().trim()).toBe('some-cw.json')
    expect(fifthRowCells.eq(1).text().trim()).toContain('Visualise')

    const visualiseCwLink = fifthRowCells.eq(1).find('a.visualise-link')
    expect(visualiseCwLink.attr('href')).toBe(
      '/visualise-cw?filename=some-cw.json&bucket=some-bucket&grant=some-grant&version=1.2.3'
    )

    expect(statusCode).toBe(statusCodes.ok)
  })

  describe('Archive and unarchive button', () => {
    const credentials = { isAuthenticated: true, displayName: 'User A', roles: ['view.only'] }
    const archiveForm = ($) => $('form[action="/version/archive"]')
    const unarchiveForm = ($) => $('form[action="/version/unarchive"]')

    const getVersion = (url) =>
      server.inject({
        method: 'GET',
        url,
        auth: { strategy: 'session', credentials },
        headers: { cookie: 'userSessionCookie=session-123' }
      })

    it('offers Archive for a non-archived version that is not the latest of its major', async () => {
      mockVersion({ ...versionDetail, version: '1.0.0', archived: false }, [
        { version: '1.1.0', status: 'active' },
        { version: '1.0.0', status: 'active' }
      ])

      const { result } = await getVersion('/version?grant=some-grant&version=1.0.0')
      const $ = load(result)
      const form = archiveForm($)

      expect(unarchiveForm($)).toHaveLength(0)
      expect(form.attr('method')).toMatch(/get/i)
      expect(form.find('button').text().trim()).toBe('Archive')
      expect(form.find('input[name="grant"]').attr('value')).toBe('some-grant')
      expect(form.find('input[name="version"]').attr('value')).toBe('1.0.0')
      expect(form.find('input[name="origin"]').attr('value')).toBe('version')
    })

    it('offers Unarchive for an archived version', async () => {
      mockVersion({ ...versionDetail, version: '1.0.0', archived: true }, [{ version: '1.1.0', status: 'active' }])

      const { result } = await getVersion('/version?grant=some-grant&version=1.0.0')
      const $ = load(result)
      const form = unarchiveForm($)

      expect(archiveForm($)).toHaveLength(0)
      expect(form.find('button').text().trim()).toBe('Unarchive')
      expect(form.find('input[name="version"]').attr('value')).toBe('1.0.0')
      expect(form.find('input[name="origin"]').attr('value')).toBe('version')
    })

    it('hides the Archive button for the latest version of a major', async () => {
      mockVersion({ ...versionDetail, version: '2.0.0', archived: false }, [
        { version: '2.0.0', status: 'active' },
        { version: '1.0.0', status: 'active' }
      ])

      const { result } = await getVersion('/version?grant=some-grant&version=2.0.0')
      const $ = load(result)

      expect(archiveForm($)).toHaveLength(0)
      expect(unarchiveForm($)).toHaveLength(0)
    })

    it('hides the Archive button when the user is not authenticated', async () => {
      mockVersion({ ...versionDetail, version: '1.0.0', archived: false }, [
        { version: '1.1.0', status: 'active' },
        { version: '1.0.0', status: 'active' }
      ])

      const { result } = await server.inject({ method: 'GET', url: '/version?grant=some-grant&version=1.0.0' })
      const $ = load(result)

      expect(archiveForm($)).toHaveLength(0)
    })

    it('hides the Unarchive button when the user is not authenticated', async () => {
      mockVersion({ ...versionDetail, version: '1.0.0', archived: true }, [{ version: '1.1.0', status: 'active' }])

      const { result } = await server.inject({ method: 'GET', url: '/version?grant=some-grant&version=1.0.0' })
      const $ = load(result)

      expect(unarchiveForm($)).toHaveLength(0)
    })
  })

  describe('Showing the archiving outcome after the redirect', () => {
    const credentials = { isAuthenticated: true, displayName: 'User A', roles: ['view.only'] }

    const getVersion = () =>
      server.inject({
        method: 'GET',
        url: '/version?grant=some-grant&version=1.2.3',
        auth: { strategy: 'session', credentials },
        headers: { cookie: 'userSessionCookie=session-123' }
      })

    it('shows a success banner and clears the outcome from the session', async () => {
      mockVersion()
      await server.session.set('session-123-archiving', { status: 'success', action: 'archive', version: '1.2.3' })

      const $ = load((await getVersion()).result)

      const banner = $('.govuk-notification-banner--success')
      expect(banner).toHaveLength(1)
      expect(banner.text()).toContain('Version 1.2.3 has been archived')
      expect(await server.session.get('session-123-archiving')).toBeNull()
    })

    it('shows a failure banner carrying the broker error', async () => {
      mockVersion()
      await server.session.set('session-123-archiving', {
        status: 'failure',
        action: 'unarchive',
        version: '1.2.3',
        error: 'Cannot unarchive the version'
      })

      const $ = load((await getVersion()).result)

      const banner = $('.govuk-notification-banner')
      expect(banner).toHaveLength(1)
      expect(banner.text()).toContain('Version 1.2.3 could not be unarchived')
      expect(banner.text()).toContain('Cannot unarchive the version')
      expect(await server.session.get('session-123-archiving')).toBeNull()
    })

    it('shows no banner when the session holds no outcome', async () => {
      mockVersion()
      const $ = load((await getVersion()).result)

      expect($('.govuk-notification-banner')).toHaveLength(0)
    })
  })
})
