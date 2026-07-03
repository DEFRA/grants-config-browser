import { describe, it, expect, vi, beforeEach } from 'vitest'
import { visualiseJourneyController } from './controller.js'
import yaml from 'js-yaml'
import { getS3FileContent } from '../common/helpers/s3/s3-interactions.js'

vi.mock('js-yaml')
vi.mock('../common/helpers/s3/s3-interactions.js')

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
    expect(callArgs.mermaidGraph).toContain('click p1 noop')

    expect(callArgs.tooltipData.p1).toContain('Hello')
    expect(callArgs.tooltipData.p2).toContain('Name')
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

  it('should handle different component types in tooltip data', async () => {
    const mockConfig = {
      name: 'Component Test',
      pages: [
        {
          id: 'p1',
          title: 'All Components',
          components: [
            { type: 'YesNoField', title: 'Yes/No', hint: 'Hint' },
            { type: 'RadiosField', title: 'Radios', list: 'list1' },
            { type: 'List', title: 'My List', list: 'list1' },
            { type: 'TextField', title: 'Text', hint: 'Text hint' },
            { type: 'MultilineTextField', title: 'Multiline', options: { rows: 5, maxWords: 100 } },
            { type: 'DatePartsField', title: 'Date' },
            { type: 'CheckboxesField', title: 'Checkboxes', list: 'list1' },
            { type: 'SelectField', title: 'Select', list: 'list1' },
            { type: 'InsetText', content: 'Inset content' },
            { type: 'Html', content: '<p>HTML</p>' },
            { type: 'Details', content: 'Details content' },
            { type: 'Markdown', content: 'Markdown content' }
          ]
        }
      ],
      lists: [{ id: 'list1', items: [{ text: 'Item 1', value: 'i1' }] }]
    }

    getS3FileContent.mockResolvedValue('mock yaml')
    yaml.load.mockReturnValue(mockConfig)

    const request = { query: { bucket: 'b', filename: 'f' } }
    const h = { view: vi.fn() }

    await visualiseJourneyController.handler(request, h)

    const callArgs = h.view.mock.calls[0][1]
    const ttd = callArgs.tooltipData.p1

    expect(ttd).toContain('Yes/No')
    expect(ttd).toContain('Radios')
    expect(ttd).toContain('My List')
    expect(ttd).toContain('Text hint')
    expect(ttd).toContain('rows="5"')
    expect(ttd).toContain('Date')
    expect(ttd).toContain('Checkboxes')
    expect(ttd).toContain('Select')
    expect(ttd).toContain('Inset content')
    expect(ttd).toContain('<p>HTML</p>')
    expect(ttd).toContain('Details content')
    expect(ttd).toContain('Markdown content')
  })

  it('should handle controller specific messages', async () => {
    const controllers = [
      'CheckDetailsController',
      'TaskListPageController',
      'CheckResponsesPageController',
      'PaymentPageController',
      'DeclarationPageController'
    ]

    const mockConfig = {
      name: 'Controller Test',
      pages: controllers.map((c) => ({
        id: c,
        title: c,
        controller: c,
        config: c === 'PaymentPageController' ? { paymentExplanation: 'Pay here' } : {}
      }))
    }

    getS3FileContent.mockResolvedValue('mock yaml')
    yaml.load.mockReturnValue(mockConfig)

    const request = { query: { bucket: 'b', filename: 'f' } }
    const h = { view: vi.fn() }

    await visualiseJourneyController.handler(request, h)

    const ttd = h.view.mock.calls[0][1].tooltipData
    expect(ttd.CheckDetailsController).toContain('person/business details')
    expect(ttd.TaskListPageController).toContain('task list page')
    expect(ttd.CheckResponsesPageController).toContain('check of answers supplied')
    expect(ttd.PaymentPageController).toContain('Pay here')
    expect(ttd.DeclarationPageController).toContain('declaration page')
  })

  it('should show components in mermaid graph if showComponents is true', async () => {
    const mockConfig = {
      name: 'Show Components Test',
      pages: [{ id: 'p1', title: 'Page 1', components: [{ title: 'Comp 1', type: 'Type 1' }] }]
    }

    getS3FileContent.mockResolvedValue('mock yaml')
    yaml.load.mockReturnValue(mockConfig)

    const request = { query: { bucket: 'b', filename: 'f', showComponents: 'true' } }
    const h = { view: vi.fn() }

    await visualiseJourneyController.handler(request, h)

    expect(h.view.mock.calls[0][1].mermaidGraph).toContain('Comp 1')
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
    expect(callArgs.mermaidGraph).toContain('p1 edge1@-.-> p3')
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

  it('should handle missing lists for various component types', async () => {
    const mockConfig = {
      name: 'Missing List Test',
      pages: [
        {
          id: 'p1',
          title: 'P1',
          components: [
            { type: 'RadiosField', title: 'Radios', list: 'non-existent' },
            { type: 'CheckboxesField', title: 'Checkboxes', list: 'non-existent' },
            { type: 'SelectField', title: 'Select', list: 'non-existent' }
          ]
        }
      ],
      lists: []
    }

    getS3FileContent.mockResolvedValue('mock yaml')
    yaml.load.mockReturnValue(mockConfig)

    const request = { query: { bucket: 'b', filename: 'f' } }
    const h = { view: vi.fn() }

    await visualiseJourneyController.handler(request, h)

    const ttd = h.view.mock.calls[0][1].tooltipData.p1
    expect(ttd).toContain('Options defined externally')
  })

  it('should include topSection in tooltip if provided', async () => {
    const mockConfig = {
      name: 'Top Section Test',
      pages: [
        {
          id: 'p1',
          title: 'P1',
          config: { topSection: '<div>Top Section Content</div>' },
          components: []
        }
      ]
    }

    getS3FileContent.mockResolvedValue('mock yaml')
    yaml.load.mockReturnValue(mockConfig)

    const request = { query: { bucket: 'b', filename: 'f' } }
    const h = { view: vi.fn() }

    await visualiseJourneyController.handler(request, h)

    const ttd = h.view.mock.calls[0][1].tooltipData.p1
    expect(ttd).toContain('Top Section Content')
  })
})
