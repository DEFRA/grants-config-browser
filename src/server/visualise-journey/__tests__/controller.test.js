import { describe, it, expect, vi, beforeEach } from 'vitest'
import { visualiseJourneyController } from '../controller.js'
import fs from 'node:fs'
import yaml from 'js-yaml'
import { config as appConfig } from '../../../config/config.js'

vi.mock('node:fs')
vi.mock('js-yaml')
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
})
