import { createServer } from '../server.js'
import { expect, test } from 'vitest'
import { statusCodes } from '../common/constants/status-codes.js'
import { canUserUpdate } from './helpers.js'
import { requestFromApi } from '../helpers/request-from-api.js'

vi.mock('../helpers/request-from-api.js')
vi.mock('./helpers.js')

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

describe('featureControlHandlers', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('updateHandler', () => {
    test('Should return forbidden response from update handler if user does not have correct role', async () => {
      const credentials = { isAuthenticated: true, displayName: 'User A', roles: ['view.only'] }
      canUserUpdate.mockReturnValue(false)
      requestFromApi.mockResolvedValue({ response: featureControl })
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/feature-control/update?name=TEST_BOOLEAN',
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
  describe('processUpdateHandler', () => {
    test('Should return forbidden response from process update handler if user does not have correct role', async () => {
      const credentials = { isAuthenticated: true, displayName: 'User A', roles: ['view.only'] }
      canUserUpdate.mockReturnValue(false)
      requestFromApi.mockResolvedValue({ response: featureControl })
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feature-control/update',
        payload: { name: 'TEST_BOOLEAN', value: 'false', note: 'Changing value' },
        auth: {
          strategy: 'session',
          credentials
        }
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
})
