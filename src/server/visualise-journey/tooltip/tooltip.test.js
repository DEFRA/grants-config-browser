import { describe, it, expect } from 'vitest'
import { createTooltipData } from './tooltip.js'
import * as radioFieldContent from './specific-content/radio-field-content.js'
import { vi } from 'vitest'

vi.mock('./specific-content/radio-field-content.js', () => ({
  getRadioFieldContent: vi.fn().mockReturnValue('mock-radio-content')
}))

vi.mock('./specific-content/check-details-controller.js', () => ({
  getCheckDetailsContent: vi.fn().mockReturnValue('mock-check-details-content')
}))

vi.mock('./specific-content/confirmation-controller.js', () => ({
  getConfirmationContent: vi.fn().mockReturnValue('mock-confirmation-content')
}))

describe('createTooltipData', () => {
  const mockLists = [
    { id: 'list1', items: [{ text: 'Item 1', value: 'i1', description: 'Desc 1' }] },
    {
      id: 'yes-no',
      items: [
        { text: 'Yes', value: 'yes' },
        { text: 'No', value: 'no' }
      ]
    }
  ]

  const options = { submitButtonText: 'Save and continue' }

  it('should include section title and node title', () => {
    const node = { title: 'My Page', components: [] }
    const result = createTooltipData(node, [], 'My Section', options)
    expect(result).toContain('<span class="govuk-caption-l">My Section</span>')
    expect(result).toContain('<h1 class="govuk-heading-l">My Page</h1>')
  })

  it('should include topSection if provided', () => {
    const node = { title: 'P1', config: { topSection: '<div>Top</div>' }, components: [] }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('<div>Top</div>')
  })

  it('should handle Html component', () => {
    const node = {
      title: 'P1',
      components: [{ type: 'Html', content: '<p>Some HTML</p>' }]
    }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('<p>Some HTML</p>')
    expect(result).not.toContain('Name:')
  })

  it('should delegate to getRadioFieldContent for RadiosField and YesNoField', () => {
    const node = {
      title: 'P1',
      components: [
        { type: 'YesNoField', name: 'yn1' },
        { type: 'RadiosField', name: 'r1', list: 'list1' }
      ]
    }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('mock-radio-content')
    expect(radioFieldContent.getRadioFieldContent).toHaveBeenCalled()
  })

  it('should handle List component', () => {
    const node = {
      title: 'P1',
      components: [{ type: 'List', title: 'My List', list: 'list1', name: 'l1' }]
    }
    const result = createTooltipData(node, [], null, mockLists, options)
    expect(result).toContain('My List')
    expect(result).toContain('Item 1')

    const nodeMissingList = {
      title: 'P1',
      components: [{ type: 'List', title: 'My List', list: 'missing', name: 'l1' }]
    }
    const resultMissingList = createTooltipData(nodeMissingList, [], null, [], options)
    expect(resultMissingList).toContain(
      '<ul class="govuk-list govuk-list--bullet">\n                  \n                  </ul>'
    )
  })

  it('should handle TextField and variants', () => {
    const node = {
      title: 'P1',
      components: [
        { type: 'TextField', title: 'Text 1', hint: 'Hint 1', name: 't1' },
        { type: 'UkAddressField', title: 'Address', name: 'a1' }
      ]
    }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('Text 1')
    expect(result).toContain('Hint 1')
    expect(result).toContain('Address Field - multiple fields will be shown on real UI')

    const nodeSingleWithHint = {
      title: 'P1',
      components: [{ type: 'TextField', title: 'Text 1', hint: 'Single Hint', name: 't1' }]
    }
    const resultSingleWithHint = createTooltipData(nodeSingleWithHint, [], null, [], options)
    expect(resultSingleWithHint).toContain('Single Hint')

    const nodeSingleNoHint = {
      title: 'P1',
      components: [{ type: 'TextField', title: 'Text 1', name: 't1' }]
    }
    const resultSingleNoHint = createTooltipData(nodeSingleNoHint, [], null, [], options)
    expect(resultSingleNoHint).not.toContain('govuk-label')
  })

  it('should handle MultilineTextField', () => {
    const node = {
      title: 'P1',
      components: [{ type: 'MultilineTextField', title: 'ML', options: { rows: 5, maxWords: 50 }, name: 'm1' }]
    }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('rows="5"')
    expect(result).toContain('You have 50 words remaining')

    const nodeDefault = {
      title: 'P1',
      components: [{ type: 'MultilineTextField', title: 'ML', name: 'm1' }]
    }
    const resultDefault = createTooltipData(nodeDefault, [], null, [], options)
    expect(resultDefault).toContain('rows="10"')
    expect(resultDefault).toContain('You have 0 words remaining')
  })

  it('should handle DatePartsField and MonthYearField', () => {
    const node = {
      title: 'P1',
      components: [
        { type: 'DatePartsField', title: 'Date', name: 'd1' },
        { type: 'MonthYearField', title: 'MonthYear', name: 'my1' }
      ]
    }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('Day')
    expect(result).toContain('Month')
    expect(result).toContain('Year')
  })

  it('should handle CheckboxesField', () => {
    const nodeSingle = {
      title: 'P1',
      components: [{ type: 'CheckboxesField', title: 'CB Title', hint: 'CB Hint', list: 'list1', name: 'c1' }]
    }
    const resultSingle = createTooltipData(nodeSingle, [], null, mockLists, options)
    expect(resultSingle).toContain('CB Hint')
    expect(resultSingle).toContain('Item 1')
    expect(resultSingle).toContain('Desc 1')

    const nodeSingleNoHint = {
      title: 'P1',
      components: [{ type: 'CheckboxesField', title: 'CB Title', list: 'list-no-desc', name: 'c1' }]
    }
    const resultSingleNoHint = createTooltipData(
      nodeSingleNoHint,
      [],
      null,
      [{ id: 'list-no-desc', items: [{ text: 'I', value: 'v' }] }],
      options
    )
    expect(resultSingleNoHint).not.toContain('govuk-hint')

    const nodeMultiple = {
      title: 'P1',
      components: [
        { type: 'CheckboxesField', title: 'CB 1', list: 'list1', name: 'c1' },
        { type: 'CheckboxesField', title: 'CB 2', list: 'list1', name: 'c2' }
      ]
    }
    const resultMultiple = createTooltipData(nodeMultiple, [], null, mockLists, options)
    expect(resultMultiple).toContain('CB 1')
    expect(resultMultiple).toContain('CB 2')

    const nodeItemNoDesc = {
      title: 'P1',
      components: [{ type: 'CheckboxesField', title: 'CB', list: 'list-no-desc', name: 'c1' }]
    }
    const mockListsNoDesc = [{ id: 'list-no-desc', items: [{ text: 'Item', value: 'i' }] }]
    const resultItemNoDesc = createTooltipData(nodeItemNoDesc, [], null, mockListsNoDesc, options)
    expect(resultItemNoDesc).not.toContain('govuk-checkboxes__hint')
  })

  it('should handle SelectField', () => {
    const node = {
      title: 'P1',
      components: [{ type: 'SelectField', title: 'Select', list: 'list1', name: 's1' }]
    }
    const result = createTooltipData(node, [], null, mockLists, options)
    expect(result).toContain('Select')
    expect(result).toContain('<option value="i1">Item 1</option>')
  })

  it('should handle Details, Markdown, and InsetText', () => {
    const node = {
      title: 'P1',
      components: [
        { type: 'Details', content: 'Details Content' },
        { type: 'Markdown', content: 'Markdown Content' },
        { type: 'InsetText', content: 'Inset Content' }
      ]
    }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('Details Content')
    expect(result).toContain('Markdown Content')
    expect(result).toContain('Inset Content')
  })

  it('should handle unknown component type', () => {
    const node = {
      title: 'P1',
      components: [{ type: 'Unknown', title: 'Unknown Title' }]
    }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('<h2>Unknown Title</h2>')
  })

  it('should handle missing lists for various component types', () => {
    const node = {
      title: 'P1',
      components: [
        { type: 'CheckboxesField', list: 'missing' },
        { type: 'SelectField', list: 'missing' }
      ]
    }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('Options defined externally')
  })

  it('should handle node with no components', () => {
    const node = { title: 'P1', components: [], controller: 'CheckDetailsController' }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('mock-check-details-content')
  })

  it('should show Save and continue button for non-terminal pages', () => {
    const node = { title: 'P1', components: [{ type: 'Html', content: 'C' }] }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('Save and continue')
  })

  it('should show Start Now button for StartPageController', () => {
    const node = { title: 'P1', components: [{ type: 'Html', content: 'C' }], controller: 'StartPageController' }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).toContain('Start Now >')
  })

  it('should not show button for terminal pages', () => {
    const node = { title: 'P1', components: [{ type: 'Html', content: 'C' }], terminal: true }
    const result = createTooltipData(node, [], null, [], options)
    expect(result).not.toContain('Save and continue')
  })

  it('should handle all controller specific messages', () => {
    const test = (controller, expected) => {
      const node = { title: 'P', components: [], controller }
      expect(createTooltipData(node, [], null, [], options)).toContain(expected)
    }

    test('CheckDetailsController', 'mock-check-details-content')
    test('ConfirmationPageController', 'mock-confirmation-content')
    test('TaskListPageController', 'govuk-task-list')
    test('CheckResponsesPageController', 'check of answers supplied')
    test('DeclarationPageController', 'declaration page')

    const node = {
      title: 'P',
      components: [],
      controller: 'PaymentPageController',
      config: { paymentExplanation: 'Pay here' }
    }
    expect(createTooltipData(node, [], null, [], options)).toContain('Pay here')

    const nodeDefault = { title: 'P', components: [], controller: 'Other' }
    const resultDefault = createTooltipData(nodeDefault, [], null, [], options)
    expect(resultDefault).not.toContain('No configurable components')
    expect(resultDefault).not.toContain('<p>CheckDetailsController')
    expect(resultDefault).not.toContain('<p>TaskListPageController')
  })

  it('should generate task list in tooltip for TaskListPageController', () => {
    const node = { title: 'Task List', components: [], controller: 'TaskListPageController' }
    const sections = [
      { id: 's1', title: 'Section 1' },
      { id: 's2', title: 'Section 2' }
    ]
    const result = createTooltipData(node, sections, null, [], options)
    expect(result).toContain('Section 1')
    expect(result).toContain('Section 2')
    expect(result).toContain('govuk-task-list__item')
  })
})
