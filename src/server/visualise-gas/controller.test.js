import { describe, it, expect, vi, beforeEach } from 'vitest'
import { visualiseGasController } from './controller.js'
import { getS3FileContent } from '../common/helpers/s3/s3-interactions.js'

vi.mock('../common/helpers/s3/s3-interactions.js')

describe('visualiseGasController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the visualise-gas page with data from S3', async () => {
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
    expect(callArgs.mermaidGraph).toContain('click PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_IN_REVIEW noop')
    expect(callArgs.tooltipData).toBeDefined()
    expect(callArgs.tooltipData.PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_IN_REVIEW).toContain(
      'STATUS_IN_REVIEW'
    )
    expect(result).toBe('rendered view')
  })

  it('should return 500 if S3 file cannot be read', async () => {
    getS3FileContent.mockRejectedValue(new Error('S3 error'))

    const request = {
      query: {
        bucket: 'test-bucket',
        filename: 'test-gas-file.json'
      }
    }
    const h = {
      response: vi.fn().mockReturnValue({
        code: vi.fn().mockReturnValue('error response')
      })
    }

    const result = await visualiseGasController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith(expect.stringContaining('Error loading JSON: S3 error'))
    expect(result).toBe('error response')
  })

  it('should return 500 if no bucket or filename provided', async () => {
    const request = { query: {} }
    const h = {
      response: vi.fn().mockReturnValue({
        code: vi.fn().mockReturnValue('error response')
      })
    }

    const result = await visualiseGasController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith(
      expect.stringContaining('Error loading JSON: No bucket or filename provided')
    )
    expect(result).toBe('error response')
  })

  it('should handle missing phases/stages/statuses gracefully', async () => {
    const mockConfig = {
      code: 'empty-gas',
      phases: [
        {
          code: 'P1',
          name: 'Phase 1'
          // no stages
        }
      ]
    }

    getS3FileContent.mockResolvedValue(JSON.stringify(mockConfig))

    const request = {
      query: { bucket: 'b', filename: 'f' }
    }
    const h = {
      view: vi.fn().mockReturnValue('view')
    }

    await visualiseGasController.handler(request, h)

    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toContain('subgraph P1["Phase 1"]')
    expect(callArgs.mermaidGraph).not.toContain('subgraph P1_')
  })

  it('should handle complex status transitions and labels', async () => {
    const mockConfig = {
      code: 'complex',
      phases: [
        {
          code: 'P1',
          name: 'Phase 1',
          stages: [
            {
              code: 'S1',
              name: 'Stage 1',
              statuses: [
                {
                  code: 'STATUS_1',
                  validFrom: [{ code: 'P1:S1:STATUS_0', processes: ['PROC_A', 'PROC_B'] }]
                }
              ]
            }
          ]
        }
      ]
    }

    getS3FileContent.mockResolvedValue(JSON.stringify(mockConfig))

    const request = {
      query: { bucket: 'b', filename: 'f' }
    }
    const h = { view: vi.fn() }

    await visualiseGasController.handler(request, h)

    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toContain('-->|PROC_A, PROC_B|')
    expect(callArgs.mermaidGraph).toContain('P1_S1_STATUS_0 -->|PROC_A, PROC_B| P1_S1_STATUS_1')
  })
})
