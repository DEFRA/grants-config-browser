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
        manifest: ['file1', 'file2', 'file3'],
        status: 'active'
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
    expect($('th.govuk-table__header').text()).toEqual('Config files')

    const files = $('table')
      .find('tbody tr')
      .map((_, row) => $(row).find('td').eq(0).text().trim())
      .get()

    expect(files).toEqual(['file1', 'file2', 'file3'])

    expect(statusCode).toBe(statusCodes.ok)
  })
})
