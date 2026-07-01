import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { requestFromApi } from '../helpers/request-from-api.js'
import { load } from 'cheerio'

vi.mock('../helpers/request-from-api.js')

describe('#versionController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    requestFromApi.mockResolvedValue({
      response: {
        grant: 'some-grant',
        version: '1.2.3',
        manifest: ['file1', 'grants-ui-file.yaml', 'file3'],
        status: 'active',
        path: 'some-bucket'
      }
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
      url: '/version?version=1.2.3'
    })

    expect(statusCode).toBe(statusCodes.moved)
    expect(location).toBe('/')
  })

  test('Should render page with expected elements', async () => {
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
    expect(visualiseLink.attr('href')).toBe('/visualise-journey?filename=grants-ui-file.yaml&bucket=some-bucket')
    expect(visualiseLink.find('img.visualise-icon').length).toBe(1)
    expect(visualiseLink.find('img.visualise-icon').attr('src')).toBe('/public/assets/images/visualise.svg')

    // Check third file (no visualise link)
    const thirdRowCells = rows.eq(2).find('td')
    expect(thirdRowCells.eq(0).text().trim()).toBe('file3')
    expect(thirdRowCells.eq(1).text().trim()).toBe('')

    expect(statusCode).toBe(statusCodes.ok)
  })
})
