import { describe, it, expect, vi, beforeEach } from 'vitest'
import { visualiseGasController } from '../controller.js'
import fs from 'node:fs'
import { config as appConfig } from '../../../config/config.js'
import { getS3FileContent } from '../../common/helpers/s3/s3-interactions.js'

vi.mock('node:fs')
vi.mock('../../common/helpers/s3/s3-interactions.js')
vi.mock('../../../config/config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

describe('visualiseGasController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appConfig.get.mockReturnValue('mocked/path/woodland.json')
  })

  it('should render the visualise-gas page with correct data', async () => {
    const mockConfig = {
      code: 'woodland',
      metadata: { description: 'Woodland Management Plan' },
      phases: [
        {
          code: 'PHASE_PRE_AWARD',
          name: 'Pre-award',
          stages: [
            {
              code: 'STAGE_REVIEWING_APPLICATION',
              name: 'Reviewing Application',
              statuses: [
                { code: 'STATUS_APPLICATION_RECEIVED', validFrom: [] },
                {
                  code: 'STATUS_IN_REVIEW',
                  validFrom: [{ code: 'STATUS_APPLICATION_RECEIVED', processes: ['PROCESS1'] }]
                }
              ]
            }
          ]
        }
      ]
    }

    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))

    const request = {}
    const h = {
      view: vi.fn().mockReturnValue('rendered view')
    }

    const result = await visualiseGasController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'visualise-gas/index',
      expect.objectContaining({
        configName: 'Woodland Management Plan',
        mermaidGraph: expect.stringContaining('flowchart TD')
      })
    )
    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toContain('subgraph PHASE_PRE_AWARD["Pre-award"]')
    expect(callArgs.mermaidGraph).toContain('PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_IN_REVIEW["IN REVIEW"]')
    expect(callArgs.mermaidGraph).toContain('-->|PROCESS1|')
    expect(result).toBe('rendered view')
  })

  it('should return 500 if JSON file cannot be read', async () => {
    fs.readFileSync.mockImplementation(() => {
      throw new Error('File not found')
    })

    const request = {}
    const h = {
      response: vi.fn().mockReturnValue({
        code: vi.fn().mockReturnValue('error response')
      })
    }

    const result = await visualiseGasController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith(expect.stringContaining('Error loading JSON'))
    expect(result).toBe('error response')
  })

  it('should fetch from S3 if bucket and filename are provided', async () => {
    const mockConfig = {
      code: 's3-gas',
      phases: []
    }

    getS3FileContent.mockResolvedValue(JSON.stringify(mockConfig))

    const request = {
      query: {
        bucket: 'test-bucket',
        filename: 'test-gas-file.json'
      }
    }
    const h = {
      view: vi.fn().mockReturnValue('rendered view')
    }

    const result = await visualiseGasController.handler(request, h)

    expect(getS3FileContent).toHaveBeenCalledWith('test-bucket', 'test-gas-file.json')
    expect(fs.readFileSync).not.toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(
      'visualise-gas/index',
      expect.objectContaining({
        configName: 's3-gas'
      })
    )
    expect(result).toBe('rendered view')
  })
})
