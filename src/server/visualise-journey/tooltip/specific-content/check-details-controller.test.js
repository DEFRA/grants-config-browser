import { describe, it, expect, vi } from 'vitest'
import { getCheckDetailsContent } from './check-details-controller.js'
import * as radioFieldContent from './radio-field-content.js'

vi.mock('./radio-field-content.js', async () => {
  const actual = await vi.importActual('./radio-field-content.js')
  return {
    ...actual,
    getRadioFieldContent: vi.fn().mockReturnValue('mock-radio-content')
  }
})

describe('check-details-controller-content', () => {
  it('should generate summary lists and include radio content', () => {
    const node = {
      details: {
        displaySections: [
          {
            title: 'Section 1',
            fields: [{ label: 'Field 1', sourcePath: 'path.to.field1' }]
          }
        ],
        confirmationFieldName: 'confirmField'
      },
      components: [] // getRadioFieldContent uses node.components.length
    }
    const mockLists = []

    const result = getCheckDetailsContent(node, mockLists)

    expect(result).toContain('Section 1')
    expect(result).toContain('Field 1')
    expect(result).toContain('path.to.field1')
    expect(result).toContain('mock-radio-content')
    expect(result).toContain('confirmField')
    expect(result).toContain('Continue')
    expect(radioFieldContent.getRadioFieldContent).toHaveBeenCalledWith(
      node,
      { title: 'Are these details correct?', list: 'details-yes-no' },
      mockLists
    )
  })

  it('should handle missing displaySections', () => {
    const node = {
      details: {},
      components: []
    }
    const result = getCheckDetailsContent(node, [])
    expect(result).toContain('mock-radio-content')
    expect(result).toContain('Continue')
  })
})
