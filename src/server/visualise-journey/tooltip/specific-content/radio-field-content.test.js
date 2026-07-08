import { describe, it, expect } from 'vitest'
import { getRadioFieldContent } from './radio-field-content.js'

describe('radio-field-content', () => {
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

  it('should handle YesNoField and RadiosField', () => {
    const nodeSingleWithHint = {
      components: [{ type: 'YesNoField', name: 'yn1', hint: 'YN Hint' }]
    }
    const resultSingleWithHint = getRadioFieldContent(nodeSingleWithHint, nodeSingleWithHint.components[0], mockLists)
    expect(resultSingleWithHint).toContain('YN Hint')

    const nodeSingleNoHint = {
      components: [{ type: 'YesNoField', name: 'yn1' }]
    }
    const resultSingleNoHint = getRadioFieldContent(nodeSingleNoHint, nodeSingleNoHint.components[0], mockLists)
    expect(resultSingleNoHint).not.toContain('govuk-hint')

    const nodeMultiple = {
      components: [
        { type: 'YesNoField', name: 'yn1', title: 'YN Title' },
        { type: 'RadiosField', name: 'r1', title: 'Radios Title', list: 'list1' }
      ]
    }
    const resultMultiple = getRadioFieldContent(nodeMultiple, nodeMultiple.components[1], mockLists)
    expect(resultMultiple).toContain('Radios Title')
    expect(resultMultiple).toContain('Item 1')
    expect(resultMultiple).toContain('Desc 1')
  })

  it('should handle missing lists', () => {
    const node = {
      components: [{ type: 'RadiosField', list: 'missing' }]
    }
    const result = getRadioFieldContent(node, node.components[0], [])
    expect(result).toContain('Options defined externally')
  })

  it('should use yes-no list for YesNoField', () => {
    const node = {
      components: [{ type: 'YesNoField', name: 'yn1' }]
    }
    const result = getRadioFieldContent(node, node.components[0], mockLists)
    expect(result).toContain('Yes')
    expect(result).toContain('No')
  })
})
