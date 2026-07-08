import { describe, it, expect, vi, beforeEach } from 'vitest'
import { visualiseJourneyController } from './controller.js'
import yaml from 'js-yaml'
import { getS3FileContent } from '../common/helpers/s3/s3-interactions.js'
import { createTooltipData } from './tooltip.js'

vi.mock('js-yaml')
vi.mock('../common/helpers/s3/s3-interactions.js')
vi.mock('./tooltip.js')

describe('visualiseJourneyController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the visualise-journey page with data from S3', async () => {
    const mockConfig = {
      name: 'Test Journey',
      sections: [{ id: 'sec1', title: 'Section 1' }],
      pages: [
        {
          id: 'p1',
          title: 'Page 1',
          path: '/p1',
          section: 'sec1',
          components: [{ type: 'Html', content: '<p>Hello</p>' }]
        },
        {
          id: 'p2',
          title: 'Page 2',
          path: '/p2',
          section: 'sec1',
          components: [{ name: 'comp1', type: 'TextField', title: 'Name' }]
        }
      ],
      conditions: []
    }

    getS3FileContent.mockResolvedValue('mock yaml')
    yaml.load.mockReturnValue(mockConfig)

    const request = {
      query: { bucket: 'b', filename: 'f' }
    }
    const h = {
      view: vi.fn().mockReturnValue('rendered view')
    }

    const result = await visualiseJourneyController.handler(request, h)

    expect(getS3FileContent).toHaveBeenCalledWith('b', 'f')
    expect(createTooltipData).toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(
      'visualise-journey/index',
      expect.objectContaining({
        configName: 'Test Journey',
        mermaidGraph: expect.stringContaining('flowchart TD'),
        tooltipData: expect.any(Object)
      })
    )

    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toContain('subgraph sec1["Section 1"]')
    expect(callArgs.mermaidGraph).toContain('p1["Page 1<br/><small>/p1</small>"]')
    expect(callArgs.mermaidGraph).toContain('id1[Start]')
    expect(callArgs.mermaidGraph).toContain('id2[End]')
    expect(callArgs.mermaidGraph).toContain('id1 --> p1')
    expect(callArgs.mermaidGraph).toContain('p2 --> id2')
    expect(callArgs.mermaidGraph).toContain('click p1 noop')

    expect(result).toBe('rendered view')
  })

  it('should return 500 if S3 fetch fails', async () => {
    getS3FileContent.mockRejectedValue(new Error('S3 error'))
    const request = { query: { bucket: 'b', filename: 'f' } }
    const h = {
      response: vi.fn().mockReturnValue({
        code: vi.fn().mockReturnValue('error')
      })
    }
    const result = await visualiseJourneyController.handler(request, h)
    expect(h.response).toHaveBeenCalledWith(expect.stringContaining('Error loading YAML: S3 error'))
    expect(result).toBe('error')
  })

  it('should return 500 if no bucket or filename provided', async () => {
    const request = { query: {} }
    const h = {
      response: vi.fn().mockReturnValue({
        code: vi.fn().mockReturnValue('error')
      })
    }

    await visualiseJourneyController.handler(request, h)
    expect(h.response).toHaveBeenCalledWith(
      expect.stringContaining('Error loading YAML: No bucket or filename provided')
    )
  })

  it('should handle terminal pages and branching paths', async () => {
    const mockConfig = {
      name: 'Branching Journey',
      sections: [],
      pages: [
        {
          id: 'p1',
          title: 'Start',
          path: '/p1',
          components: [{ id: 'comp1', title: 'Choice', type: 'RadiosField' }]
        },
        { id: 'p2', title: 'Conditional Page', path: '/p2', condition: 'c1' },
        { id: 'p3', title: 'Page after conditional', path: '/p3' },
        { id: 'p4', title: 'Terminal', path: '/p4', terminal: true }
      ],
      conditions: [{ id: 'c1', items: [{ componentId: 'comp1', operator: '==', value: 'true' }] }]
    }

    getS3FileContent.mockResolvedValue('mock yaml content')
    yaml.load.mockReturnValue(mockConfig)

    const request = { query: { bucket: 'b', filename: 'f' } }
    const h = {
      view: vi.fn().mockReturnValue('rendered view')
    }

    const result = await visualiseJourneyController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'visualise-journey/index',
      expect.objectContaining({
        configName: 'Branching Journey'
      })
    )
    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toContain('p1 edge0@-- "Choice == true" --> p2')
    expect(callArgs.mermaidGraph).toContain('edge0@{ animate: true }')
    expect(callArgs.mermaidGraph).toContain('p1 edge1@-.-> p3')
    expect(callArgs.mermaidGraph).toContain('edge1@{ animate: true }')
    expect(callArgs.mermaidGraph).toContain('p4(("🚩 Terminal<br/><small>/p4</small>"))')
    expect(callArgs.mermaidGraph).toContain('style p4 fill:#f8d7da,stroke:#dc3545')
    expect(result).toBe('rendered view')
  })

  it('should handle ListItemRef in conditions', async () => {
    const mockConfig = {
      name: 'ListItemRef Test',
      pages: [
        { id: 'p1', title: 'P1', components: [{ id: 'comp1', title: 'Choice', type: 'RadiosField' }] },
        { id: 'p2', title: 'P2', condition: 'c1' }
      ],
      conditions: [
        {
          id: 'c1',
          items: [
            {
              componentId: 'comp1',
              operator: '==',
              type: 'ListItemRef',
              value: { listId: 'list1', itemId: 'item1' }
            }
          ]
        }
      ],
      lists: [{ id: 'list1', items: [{ id: 'item1', text: 'Selected Item', value: 'val1' }] }]
    }

    getS3FileContent.mockResolvedValue('mock yaml')
    yaml.load.mockReturnValue(mockConfig)

    const request = { query: { bucket: 'b', filename: 'f' } }
    const h = { view: vi.fn() }

    await visualiseJourneyController.handler(request, h)

    const callArgs = h.view.mock.calls[0][1]
    expect(callArgs.mermaidGraph).toContain('Selected Item')
  })

  it('should show components in mermaid graph if showComponents is true', async () => {
    const mockConfig = {
      name: 'Show Components Test',
      pages: [
        { id: 'p1', title: 'P1', components: [{ title: 'Comp 1', type: 'Type 1' }] },
        { id: 'p2', title: 'P2', components: [] }
      ]
    }

    getS3FileContent.mockResolvedValue('mock yaml')
    yaml.load.mockReturnValue(mockConfig)

    const request = { query: { bucket: 'b', filename: 'f', showComponents: 'true' } }
    const h = { view: vi.fn() }

    await visualiseJourneyController.handler(request, h)

    const mermaidGraph = h.view.mock.calls[0][1].mermaidGraph
    expect(mermaidGraph).toContain('Comp 1')
    expect(mermaidGraph).toContain('No components')
  })

  it('should handle TaskListPageController and link to section starts', async () => {
    const mockConfig = {
      name: 'Task List Journey',
      sections: [
        { id: 'sec1', title: 'Section 1' },
        { id: 'sec2', title: 'Section 2' }
      ],
      pages: [
        { id: 'tl', title: 'Task List', path: '/tl', controller: 'TaskListPageController' },
        { id: 'p1', title: 'P1', path: '/p1', section: 'sec1' },
        { id: 'p2', title: 'P2', path: '/p2', section: 'sec2' }
      ]
    }

    getS3FileContent.mockResolvedValue('mock yaml')
    yaml.load.mockReturnValue(mockConfig)

    const request = { query: { bucket: 'b', filename: 'f' } }
    const h = { view: vi.fn() }

    await visualiseJourneyController.handler(request, h)

    const mermaidGraph = h.view.mock.calls[0][1].mermaidGraph
    expect(mermaidGraph).toContain('tl edge0@-- "Task #1\nSection 1" --> p1')
    expect(mermaidGraph).toContain('tl edge1@-- "Task #2\nSection 2" --> p2')
  })

  it('should handle returnAfterSection metadata', async () => {
    const mockConfig = {
      name: 'Return Journey',
      metadata: { tasklist: { returnAfterSection: true } },
      pages: [
        { id: 'tl', title: 'Task List', path: '/tl', controller: 'TaskListPageController' },
        { id: 'p1', title: 'P1', path: '/p1', section: 'sec1' },
        { id: 'p2', title: 'P2', path: '/p2', section: 'sec2' }
      ]
    }

    getS3FileContent.mockResolvedValue('mock yaml')
    yaml.load.mockReturnValue(mockConfig)

    const request = { query: { bucket: 'b', filename: 'f' } }
    const h = { view: vi.fn() }

    await visualiseJourneyController.handler(request, h)

    const mermaidGraph = h.view.mock.calls[0][1].mermaidGraph
    // p1 is the last (and only) page in sec1. Since returnAfterSection is true, it should link back to tl
    expect(mermaidGraph).toContain('p1 edge0@-.-> tl')
  })
})
