import { describe, it, expect, vi, beforeEach } from 'vitest'
import { visualiseCwController } from './controller.js'
import { getS3FileContent } from '../common/helpers/s3/s3-interactions.js'

vi.mock('../common/helpers/s3/s3-interactions.js')

describe('visualiseCwController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the visualise-cw page with data from S3', async () => {
    const mockConfig = {
      code: 'woodland',
      phases: [
        {
          code: 'PHASE_PRE_AWARD',
          name: 'Pre-award',
          stages: [
            {
              code: 'STAGE_REVIEWING_APPLICATION',
              name: 'Application received',
              taskGroups: [
                {
                  name: 'Tasks',
                  tasks: [{ code: 'TASK_1', name: 'Task 1', mandatory: true }]
                }
              ],
              statuses: [
                {
                  code: 'STATUS_APPLICATION_RECEIVED',
                  name: 'Application Received',
                  transitions: [
                    {
                      targetPosition: 'PHASE_PRE_AWARD:STAGE_REVIEWING_APPLICATION:STATUS_APPLICATION_IN_REVIEW',
                      action: { name: 'Start' }
                    }
                  ]
                },
                {
                  code: 'STATUS_APPLICATION_IN_REVIEW',
                  name: 'In Review',
                  transitions: []
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
        filename: 'test-cw.json',
        grant: 'test-grant',
        version: 'v1'
      }
    }
    const h = {
      view: vi.fn().mockReturnValue('rendered view')
    }

    const result = await visualiseCwController.handler(request, h)

    expect(getS3FileContent).toHaveBeenCalledWith('test-bucket', 'test-cw.json')
    expect(h.view).toHaveBeenCalledWith(
      'visualise-cw/index',
      expect.objectContaining({
        configName: 'woodland',
        mermaidGraph: expect.stringContaining('flowchart')
      })
    )
    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toContain('subgraph PHASE_PRE_AWARD["Pre-award"]')
    expect(callArgs.mermaidGraph).toContain(
      'subgraph PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION["Application received"]'
    )
    expect(callArgs.mermaidGraph).toContain(
      'PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_APPLICATION_RECEIVED["Application Received"]'
    )
    expect(callArgs.mermaidGraph).toContain(
      'PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_APPLICATION_RECEIVED -->|Start| PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_APPLICATION_IN_REVIEW'
    )
    expect(callArgs.mermaidGraph).toContain('PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_TASK_1[[Task 1]]')
    expect(callArgs.mermaidGraph).toContain(
      'PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_APPLICATION_RECEIVED -.-> PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_TASK_1'
    )
    expect(callArgs.tooltipData.PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_TASK_1).toContain(
      'Pre-award - Application received'
    )
    expect(callArgs.tooltipData.PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_TASK_1).toContain('Task 1')
    expect(callArgs.tooltipData.PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_APPLICATION_RECEIVED).toContain(
      'Task 1'
    )
    expect(callArgs.tooltipData.PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_APPLICATION_RECEIVED).toContain(
      '(Mandatory)'
    )
    expect(result).toBe('rendered view')
  })

  it('should return 500 if S3 file cannot be read', async () => {
    getS3FileContent.mockRejectedValue(new Error('S3 error'))

    const request = {
      query: {
        bucket: 'test-bucket',
        filename: 'test-cw.json'
      }
    }
    const h = {
      response: vi.fn().mockReturnValue({
        code: vi.fn().mockReturnValue('error response')
      })
    }

    const result = await visualiseCwController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith(expect.stringContaining('Error loading JSON: S3 error'))
    expect(result).toBe('error response')
  })
})
