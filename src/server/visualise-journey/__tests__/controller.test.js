import { describe, it, expect, vi, beforeEach } from 'vitest'
import { visualiseJourneyController } from '../controller.js'
import fs from 'node:fs'
import yaml from 'js-yaml'
import { config as appConfig } from '../../../config/config.js'
import { getS3FileContent } from '../../common/helpers/s3/s3-interactions.js'

vi.mock('node:fs')
vi.mock('js-yaml')
vi.mock('../../common/helpers/s3/s3-interactions.js')
vi.mock('../../../config/config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

describe('visualiseJourneyController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appConfig.get.mockReturnValue('mocked/path/woodland.yaml')
  })

  it('should render the visualise-journey page with correct data', async () => {
    const mockConfig = {
      name: 'Test Journey',
      sections: [{ id: 'sec1', title: 'Section 1' }],
      pages: [
        { id: 'p1', title: 'Page 1', path: '/p1', section: 'sec1', components: [] },
        { id: 'p2', title: 'Page 2', path: '/p2', section: 'sec1', components: [{ name: 'comp1', type: 'TextField' }] }
      ],
      conditions: []
    }

    fs.readFileSync.mockReturnValue('mock yaml content')
    yaml.load.mockReturnValue(mockConfig)

    const request = {}
    const h = {
      view: vi.fn().mockReturnValue('rendered view')
    }

    const result = await visualiseJourneyController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'visualise-journey/index',
      expect.objectContaining({
        configName: 'Test Journey',
        mermaidGraph: expect.stringContaining('flowchart TD')
      })
    )
    expect(h.view).toHaveBeenCalledWith(
      'visualise-journey/index',
      expect.objectContaining({
        mermaidGraph: expect.stringContaining('subgraph sec1["Section 1"]')
      })
    )
    expect(h.view).toHaveBeenCalledWith(
      'visualise-journey/index',
      expect.objectContaining({
        mermaidGraph: expect.stringContaining('p1["Page 1<br/><small>/p1</small>"]')
      })
    )
    expect(result).toBe('rendered view')
  })

  it('should return 500 if YAML file cannot be read', async () => {
    fs.readFileSync.mockImplementation(() => {
      throw new Error('File not found')
    })

    const request = {}
    const h = {
      response: vi.fn().mockReturnValue({
        code: vi.fn().mockReturnValue('error response')
      })
    }

    const result = await visualiseJourneyController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith(expect.stringContaining('Error loading YAML'))
    expect(result).toBe('error response')
  })

  it('should fetch from S3 if bucket and filename are provided', async () => {
    const mockConfig = {
      name: 'S3 Journey',
      sections: [],
      pages: []
    }

    getS3FileContent.mockResolvedValue('mock s3 yaml content')
    yaml.load.mockReturnValue(mockConfig)

    const request = {
      query: {
        bucket: 'test-bucket',
        filename: 'test-grants-ui.yaml'
      }
    }
    const h = {
      view: vi.fn().mockReturnValue('rendered view')
    }

    const result = await visualiseJourneyController.handler(request, h)

    expect(getS3FileContent).toHaveBeenCalledWith('test-bucket', 'test-grants-ui.yaml')
    expect(fs.readFileSync).not.toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(
      'visualise-journey/index',
      expect.objectContaining({
        configName: 'S3 Journey'
      })
    )
    expect(result).toBe('rendered view')
  })

  it('should highlight terminal pages and branching paths based on next page condition', async () => {
    const mockConfig = {
      name: 'Branching Journey',
      sections: [],
      pages: [
        {
          id: 'p1',
          title: 'Start',
          path: '/p1',
          components: [{ id: 'comp1', name: 'Choice', shortDescription: 'Choice' }]
        },
        { id: 'p2', title: 'Conditional Page', path: '/p2', condition: 'c1' },
        { id: 'p3', title: 'Page after conditional', path: '/p3' },
        { id: 'p4', title: 'Terminal', path: '/p4', terminal: true }
      ],
      conditions: [{ id: 'c1', name: 'If True', items: [{ componentId: 'comp1', operator: '==', value: 'true' }] }]
    }

    fs.readFileSync.mockReturnValue('mock yaml content')
    yaml.load.mockReturnValue(mockConfig)

    const request = {}
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
})
