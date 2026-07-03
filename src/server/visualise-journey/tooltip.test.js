import { describe, it, expect } from 'vitest'
import { createTooltipData } from './tooltip.js'

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

  it('should include section title and node title', () => {
    const node = { title: 'My Page', components: [] }
    const result = createTooltipData(node, 'My Section', [])
    expect(result).toContain('<span class="govuk-caption-l">My Section</span>')
    expect(result).toContain('<h1 class="govuk-heading-l">My Page</h1>')
  })

  it('should include topSection if provided', () => {
    const node = { title: 'P1', config: { topSection: '<div>Top</div>' }, components: [] }
    const result = createTooltipData(node, null, [])
    expect(result).toContain('<div>Top</div>')
  })

  it('should handle Html component', () => {
    const node = {
      title: 'P1',
      components: [{ type: 'Html', content: '<p>Some HTML</p>' }]
    }
    const result = createTooltipData(node, null, [])
    expect(result).toContain('<p>Some HTML</p>')
    expect(result).not.toContain('Name:')
  })

  it('should handle YesNoField and RadiosField', () => {
    const nodeSingleWithHint = {
      title: 'P1',
      components: [{ type: 'YesNoField', name: 'yn1', hint: 'YN Hint' }]
    }
    const resultSingleWithHint = createTooltipData(nodeSingleWithHint, null, mockLists)
    expect(resultSingleWithHint).toContain('YN Hint')

    const nodeSingleNoHint = {
      title: 'P1',
      components: [{ type: 'YesNoField', name: 'yn1' }]
    }
    const resultSingleNoHint = createTooltipData(nodeSingleNoHint, null, mockLists)
    expect(resultSingleNoHint).not.toContain('govuk-hint')

    const nodeMultiple = {
      title: 'P1',
      components: [
        { type: 'YesNoField', name: 'yn1', title: 'YN Title' },
        { type: 'RadiosField', name: 'r1', title: 'Radios Title', list: 'list1' }
      ]
    }
    const resultMultiple = createTooltipData(nodeMultiple, null, mockLists)
    expect(resultMultiple).toContain('YN Title')
    expect(resultMultiple).toContain('Radios Title')
    expect(resultMultiple).toContain('Item 1')
    expect(resultMultiple).toContain('Desc 1')
  })

  it('should handle List component', () => {
    const node = {
      title: 'P1',
      components: [{ type: 'List', title: 'My List', list: 'list1', name: 'l1' }]
    }
    const result = createTooltipData(node, null, mockLists)
    expect(result).toContain('My List')
    expect(result).toContain('Item 1')

    const nodeMissingList = {
      title: 'P1',
      components: [{ type: 'List', title: 'My List', list: 'missing', name: 'l1' }]
    }
    const resultMissingList = createTooltipData(nodeMissingList, null, [])
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
    const result = createTooltipData(node, null, [])
    expect(result).toContain('Text 1')
    expect(result).toContain('Hint 1')
    expect(result).toContain('Address Field - multiple fields will be shown on real UI')

    const nodeSingleWithHint = {
      title: 'P1',
      components: [{ type: 'TextField', title: 'Text 1', hint: 'Single Hint', name: 't1' }]
    }
    const resultSingleWithHint = createTooltipData(nodeSingleWithHint, null, [])
    expect(resultSingleWithHint).toContain('Single Hint')

    const nodeSingleNoHint = {
      title: 'P1',
      components: [{ type: 'TextField', title: 'Text 1', name: 't1' }]
    }
    const resultSingleNoHint = createTooltipData(nodeSingleNoHint, null, [])
    expect(resultSingleNoHint).not.toContain('govuk-label')
  })

  it('should handle MultilineTextField', () => {
    const node = {
      title: 'P1',
      components: [{ type: 'MultilineTextField', title: 'ML', options: { rows: 5, maxWords: 50 }, name: 'm1' }]
    }
    const result = createTooltipData(node, null, [])
    expect(result).toContain('rows="5"')
    expect(result).toContain('You have 50 words remaining')

    const nodeDefault = {
      title: 'P1',
      components: [{ type: 'MultilineTextField', title: 'ML', name: 'm1' }]
    }
    const resultDefault = createTooltipData(nodeDefault, null, [])
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
    const result = createTooltipData(node, null, [])
    expect(result).toContain('Day')
    expect(result).toContain('Month')
    expect(result).toContain('Year')
  })

  it('should handle CheckboxesField', () => {
    const nodeSingle = {
      title: 'P1',
      components: [{ type: 'CheckboxesField', title: 'CB Title', hint: 'CB Hint', list: 'list1', name: 'c1' }]
    }
    const resultSingle = createTooltipData(nodeSingle, null, mockLists)
    expect(resultSingle).toContain('CB Hint')
    expect(resultSingle).toContain('Item 1')
    expect(resultSingle).toContain('Desc 1')

    const nodeSingleNoHint = {
      title: 'P1',
      components: [{ type: 'CheckboxesField', title: 'CB Title', list: 'list-no-desc', name: 'c1' }]
    }
    const resultSingleNoHint = createTooltipData(nodeSingleNoHint, null, [
      { id: 'list-no-desc', items: [{ text: 'I', value: 'v' }] }
    ])
    expect(resultSingleNoHint).not.toContain('govuk-hint')

    const nodeMultiple = {
      title: 'P1',
      components: [
        { type: 'CheckboxesField', title: 'CB 1', list: 'list1', name: 'c1' },
        { type: 'CheckboxesField', title: 'CB 2', list: 'list1', name: 'c2' }
      ]
    }
    const resultMultiple = createTooltipData(nodeMultiple, null, mockLists)
    expect(resultMultiple).toContain('CB 1')
    expect(resultMultiple).toContain('CB 2')

    const nodeItemNoDesc = {
      title: 'P1',
      components: [{ type: 'CheckboxesField', title: 'CB', list: 'list-no-desc', name: 'c1' }]
    }
    const mockListsNoDesc = [{ id: 'list-no-desc', items: [{ text: 'Item', value: 'i' }] }]
    const resultItemNoDesc = createTooltipData(nodeItemNoDesc, null, mockListsNoDesc)
    expect(resultItemNoDesc).not.toContain('govuk-checkboxes__hint')
  })

  it('should handle SelectField', () => {
    const node = {
      title: 'P1',
      components: [{ type: 'SelectField', title: 'Select', list: 'list1', name: 's1' }]
    }
    const result = createTooltipData(node, null, mockLists)
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
    const result = createTooltipData(node, null, [])
    expect(result).toContain('Details Content')
    expect(result).toContain('Markdown Content')
    expect(result).toContain('Inset Content')
  })

  it('should handle unknown component type', () => {
    const node = {
      title: 'P1',
      components: [{ type: 'Unknown', title: 'Unknown Title' }]
    }
    const result = createTooltipData(node, null, [])
    expect(result).toContain('<h2>Unknown Title</h2>')
  })

  it('should handle missing lists for various component types', () => {
    const node = {
      title: 'P1',
      components: [
        { type: 'RadiosField', list: 'missing' },
        { type: 'CheckboxesField', list: 'missing' },
        { type: 'SelectField', list: 'missing' }
      ]
    }
    const result = createTooltipData(node, null, [])
    expect(result).toContain('Options defined externally')
  })

  it('should handle node with no components', () => {
    const node = { title: 'P1', components: [], controller: 'CheckDetailsController' }
    const result = createTooltipData(node, null, [])
    expect(result).toContain('No configurable components')
    expect(result).toContain('CheckDetailsController provides person/business details')
  })

  it('should show Save and continue button for non-terminal pages', () => {
    const node = { title: 'P1', components: [{ type: 'Html', content: 'C' }] }
    const result = createTooltipData(node, null, [])
    expect(result).toContain('Save and continue')
  })

  it('should show Start Now button for StartPageController', () => {
    const node = { title: 'P1', components: [{ type: 'Html', content: 'C' }], controller: 'StartPageController' }
    const result = createTooltipData(node, null, [])
    expect(result).toContain('Start Now >')
  })

  it('should not show button for terminal pages', () => {
    const node = { title: 'P1', components: [{ type: 'Html', content: 'C' }], terminal: true }
    const result = createTooltipData(node, null, [])
    expect(result).not.toContain('Save and continue')
  })

  it('should handle all controller specific messages', () => {
    const test = (controller, expected) => {
      const node = { title: 'P', components: [], controller }
      expect(createTooltipData(node, null, [])).toContain(expected)
    }

    test('CheckDetailsController', 'person/business details')
    test('TaskListPageController', 'task list page')
    test('CheckResponsesPageController', 'check of answers supplied')
    test('DeclarationPageController', 'declaration page')

    const node = {
      title: 'P',
      components: [],
      controller: 'PaymentPageController',
      config: { paymentExplanation: 'Pay here' }
    }
    expect(createTooltipData(node, null, [])).toContain('Pay here')

    const nodeDefault = { title: 'P', components: [], controller: 'Other' }
    const resultDefault = createTooltipData(nodeDefault, null, [])
    expect(resultDefault).toContain('No configurable components')
    expect(resultDefault).not.toContain('<p>CheckDetailsController')
    expect(resultDefault).not.toContain('<p>TaskListPageController')
  })
})
