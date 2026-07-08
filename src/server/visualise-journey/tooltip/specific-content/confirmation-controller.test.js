import { describe, it, expect } from 'vitest'
import { getConfirmationContent } from './confirmation-controller.js'

describe('confirmation-controller', () => {
  it('should return confirmation content with panel title and text', () => {
    const node = {
      confirmationContent: {
        panelTitle: 'Application complete',
        panelText: 'Your reference number is'
      }
    }
    const result = getConfirmationContent(node)
    expect(result).toContain('Application complete')
    expect(result).toContain('Your reference number is')
    expect(result).toContain('govuk-panel--confirmation')
    expect(result).toContain('## Reference ##')
  })

  it('should include additional HTML if provided', () => {
    const node = {
      confirmationContent: {
        panelTitle: 'Title',
        panelText: 'Text',
        html: '<p>Additional content</p>'
      }
    }
    const result = getConfirmationContent(node)
    expect(result).toContain('<p>Additional content</p>')
  })

  it('should handle missing HTML', () => {
    const node = {
      confirmationContent: {
        panelTitle: 'Title',
        panelText: 'Text'
      }
    }
    const result = getConfirmationContent(node)
    // Ensure it doesn't append 'undefined' if html is missing
    expect(result.endsWith('</div>')).toBe(true)
    expect(result).not.toContain('undefined')
  })
})
