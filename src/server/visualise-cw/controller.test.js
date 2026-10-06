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
      'Task 1*'
    )
    expect(callArgs.tooltipData.PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_APPLICATION_RECEIVED).toContain(
      'Incomplete'
    )
    expect(callArgs.tooltipData.PHASE_PRE_AWARD_STAGE_REVIEWING_APPLICATION_STATUS_APPLICATION_RECEIVED).toContain(
      'govuk-task-list'
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

  it('should handle tasks defined at status level', async () => {
    const mockConfig = {
      code: 'woodland',
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
                  code: 'STATUS_WITH_TASK',
                  taskGroups: [
                    {
                      name: 'Status Tasks',
                      tasks: [{ code: 'T1', name: 'Task 1' }]
                    }
                  ]
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
    const h = {
      view: vi.fn().mockReturnValue('rendered view')
    }

    await visualiseCwController.handler(request, h)

    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toContain('P1_S1_STATUS_WITH_TASK_T1[[Task 1]]')
    expect(callArgs.mermaidGraph).toContain('P1_S1_STATUS_WITH_TASK -.-> P1_S1_STATUS_WITH_TASK_T1')
    expect(callArgs.tooltipData.P1_S1_STATUS_WITH_TASK_T1).toBeDefined()
  })

  it('should fallback to code-based name for statuses without a name', async () => {
    const mockConfig = {
      phases: [
        {
          code: 'P1',
          name: 'P1',
          stages: [
            {
              code: 'S1',
              name: 'S1',
              statuses: [{ code: 'STATUS_MY_COOL_STATUS' }]
            }
          ]
        }
      ]
    }

    getS3FileContent.mockResolvedValue(JSON.stringify(mockConfig))
    const h = { view: vi.fn() }
    await visualiseCwController.handler({ query: { bucket: 'b', filename: 'f' } }, h)

    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toContain('MY COOL STATUS')
    expect(callArgs.tooltipData.P1_S1_STATUS_MY_COOL_STATUS).toContain('MY COOL STATUS')
  })

  it('should handle transitions without action names', async () => {
    const mockConfig = {
      phases: [
        {
          code: 'P1',
          name: 'P1',
          stages: [
            {
              code: 'S1',
              name: 'S1',
              statuses: [
                {
                  code: 'ST1',
                  transitions: [{ targetPosition: 'P1:S1:ST2' }]
                },
                { code: 'ST2' }
              ]
            }
          ]
        }
      ]
    }

    getS3FileContent.mockResolvedValue(JSON.stringify(mockConfig))
    const h = { view: vi.fn() }
    await visualiseCwController.handler({ query: { bucket: 'b', filename: 'f' } }, h)

    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toContain('P1_S1_ST1 --> P1_S1_ST2')
    expect(callArgs.mermaidGraph).not.toContain('-->|')
  })

  it('should return 500 if bucket or filename are missing', async () => {
    const request = { query: {} }
    const h = {
      response: vi.fn().mockReturnValue({
        code: vi.fn().mockReturnValue('error response')
      })
    }

    const result = await visualiseCwController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith(expect.stringContaining('No bucket or filename provided'))
    expect(result).toBe('error response')
  })

  it('should handle missing phases and stages gracefully', async () => {
    const mockConfig = { code: 'empty' }
    getS3FileContent.mockResolvedValue(JSON.stringify(mockConfig))
    const h = { view: vi.fn() }
    await visualiseCwController.handler({ query: { bucket: 'b', filename: 'f' } }, h)

    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toBe('flowchart LR\n')
  })

  it('should only add a task once if defined at both stage and status level', async () => {
    const mockConfig = {
      phases: [
        {
          code: 'P1',
          name: 'Phase 1',
          stages: [
            {
              code: 'S1',
              name: 'Stage 1',
              taskGroups: [{ tasks: [{ code: 'T1', name: 'Task 1' }] }],
              statuses: [
                {
                  code: 'ST1',
                  taskGroups: [{ tasks: [{ code: 'T1', name: 'Task 1' }] }]
                }
              ]
            }
          ]
        }
      ]
    }
    getS3FileContent.mockResolvedValue(JSON.stringify(mockConfig))
    const h = { view: vi.fn() }
    await visualiseCwController.handler({ query: { bucket: 'b', filename: 'f' } }, h)

    const callArgs = h.view.mock.calls[0][1]
    const taskNodes = callArgs.mermaidGraph.match(/P1_S1_T1\[\[Task 1\]\]/g)
    expect(taskNodes).toHaveLength(1)
  })

  it('should handle stages with no taskGroups or empty taskGroups', async () => {
    const mockConfig = {
      phases: [
        {
          code: 'P1',
          name: 'P1',
          stages: [
            {
              code: 'S1',
              name: 'S1',
              taskGroups: [],
              statuses: [{ code: 'ST1' }]
            }
          ]
        }
      ]
    }
    getS3FileContent.mockResolvedValue(JSON.stringify(mockConfig))
    const h = { view: vi.fn() }
    await visualiseCwController.handler({ query: { bucket: 'b', filename: 'f' } }, h)

    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.tooltipData.P1_S1_ST1).not.toContain('govuk-list')
  })

  it('should include beforeContent and afterContent in status tooltips when present in config', async () => {
    const mockConfig = {
      phases: [
        {
          code: 'P1',
          name: 'Phase 1',
          stages: [
            {
              code: 'S1',
              name: 'Stage 1',
              beforeContent: [
                {
                  renderIf: "jsonata:$.position.statusCode = 'ST1'",
                  content: [{ component: 'heading', level: 3, text: 'Stage Before' }]
                }
              ],
              afterContent: [
                {
                  renderIf: "jsonata:$.position.statusCode = 'ST1'",
                  content: [{ component: 'paragraph', text: 'Stage After' }]
                }
              ],
              statuses: [{ code: 'ST1', name: 'Status 1' }]
            }
          ]
        }
      ]
    }

    getS3FileContent.mockResolvedValue(JSON.stringify(mockConfig))
    const h = { view: vi.fn() }
    await visualiseCwController.handler({ query: { bucket: 'b', filename: 'f' } }, h)

    const callArgs = h.view.mock.calls[0][1]
    const tooltip = callArgs.tooltipData.P1_S1_ST1
    expect(tooltip).toContain('Stage Before')
    expect(tooltip).toContain('Stage After')
  })

  it('should ignore transitions without targetPosition', async () => {
    const mockConfig = {
      phases: [
        {
          code: 'P1',
          name: 'P1',
          stages: [
            {
              code: 'S1',
              name: 'S1',
              statuses: [
                {
                  code: 'ST1',
                  transitions: [{ action: { name: 'Broken' } }]
                }
              ]
            }
          ]
        }
      ]
    }
    getS3FileContent.mockResolvedValue(JSON.stringify(mockConfig))
    const h = { view: vi.fn() }
    await visualiseCwController.handler({ query: { bucket: 'b', filename: 'f' } }, h)

    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).not.toContain('Broken')
  })
})
