import { describe, it, expect } from 'vitest'
import { createCwTaskTooltipData } from './cw-tooltip.js'

describe('cw-tooltip', () => {
  const mockPhase = { name: 'Phase 1', code: 'P1' }
  const mockStage = { name: 'Stage 1', code: 'S1' }

  it('should render basic task info with phase and stage', () => {
    const task = { name: 'My Task' }
    const html = createCwTaskTooltipData(task, mockPhase, mockStage)
    expect(html).toContain('<span class="govuk-caption-l">Phase 1 - Stage 1</span>')
    expect(html).toContain('<h1 class="govuk-heading-l">My Task</h1>')
  })

  it('should render task without phase and stage', () => {
    const task = { name: 'My Task' }
    const html = createCwTaskTooltipData(task, null, null)
    expect(html).not.toContain('govuk-caption-l')
    expect(html).toContain('<h1 class="govuk-heading-l">My Task</h1>')
  })

  it('should render string description', () => {
    const task = { name: 'T', description: 'A simple description' }
    const html = createCwTaskTooltipData(task)
    expect(html).toContain('<p class="govuk-body">A simple description</p>')
  })

  it('should render array of description components', () => {
    const task = {
      name: 'T',
      description: [
        { component: 'heading', text: 'Sub Heading', level: 2 },
        { component: 'paragraph', text: 'Para text', classes: 'custom-class' },
        { component: 'unordered-list', items: [{ component: 'text', text: 'Item 1' }] }
      ]
    }
    const html = createCwTaskTooltipData(task)
    expect(html).toContain('<h2 class="govuk-heading-m">Sub Heading</h2>')
    expect(html).toContain('<p class="govuk-body custom-class">Para text</p>')
    expect(html).toContain('<ul class="govuk-list govuk-list--bullet"><li>Item 1</li></ul>')
  })

  it('should render various component types', () => {
    const task = {
      name: 'T',
      description: [
        { component: 'ordered-list', items: [{ component: 'text', text: 'First' }] },
        { component: 'container', classes: 'box', items: [{ component: 'text', text: 'Inside' }] },
        { component: 'url', text: 'Click here', classes: 'my-link' },
        { component: 'line-break' },
        { component: 'text', text: { complex: 'object' } }
      ]
    }
    const html = createCwTaskTooltipData(task)
    expect(html).toContain('<ol class="govuk-list govuk-list--number"><li>First</li></ol>')
    expect(html).toContain('<div class="box">Inside</div>')
    expect(html).toContain('<a href="#" class="govuk-link my-link">Click here</a>')
    expect(html).toContain('<br/>')
    expect(html).toContain('{"complex":"object"}')
  })

  it('should render headings with different levels', () => {
    const task = {
      name: 'T',
      description: [
        { component: 'heading', text: 'H1', level: 1 },
        { component: 'heading', text: 'H3', level: 3 }
      ]
    }
    const html = createCwTaskTooltipData(task)
    expect(html).toContain('<h1 class="govuk-heading-l">H1</h1>')
    expect(html).toContain('<h3 class="govuk-heading-s">H3</h3>')
  })

  it('should handle text as array of components', () => {
    const task = {
      name: 'T',
      description: [
        {
          component: 'paragraph',
          text: [
            { component: 'text', text: 'Part 1 ' },
            { component: 'url', text: 'Link' }
          ]
        }
      ]
    }
    const html = createCwTaskTooltipData(task)
    expect(html).toContain('<p class="govuk-body">Part 1 <a href="#" class="govuk-link">Link</a></p>')
  })

  it('should render input fields', () => {
    const task = {
      name: 'T',
      input: {
        label: { text: 'Input Label', classes: 'label-class' },
        hint: 'Input hint',
        type: 'text'
      }
    }
    const html = createCwTaskTooltipData(task)
    expect(html).toContain('<div class="govuk-form-group">')
    expect(html).toContain('<label class="govuk-label label-class">Input Label</label>')
    expect(html).toContain('<div class="govuk-hint">Input hint</div>')
    expect(html).toContain('<input class="govuk-input" type="text">')
  })

  it('should handle array hint in input', () => {
    const task = {
      name: 'T',
      input: {
        hint: ['Hint part 1', 'Hint part 2']
      }
    }
    const html = createCwTaskTooltipData(task)
    expect(html).toContain('<div class="govuk-hint">Hint part 1 Hint part 2</div>')
  })

  it('should render value options as radios', () => {
    const task = {
      name: 'T',
      valueOptions: [{ name: 'Option A' }, { name: 'Option B' }]
    }
    const html = createCwTaskTooltipData(task)
    expect(html).toContain('<div class="govuk-radios">')
    expect(html).toContain('Option A')
    expect(html).toContain('Option B')
    expect(html).toContain('type="radio"')
    expect(html).toContain('id="opt-0"')
    expect(html).toContain('for="opt-1"')
  })

  it('should return empty string for unknown components', () => {
    const task = {
      name: 'T',
      description: [{ component: 'unknown', text: 'nothing' }]
    }
    const html = createCwTaskTooltipData(task)
    expect(html).toContain('nothing') // default case returns renderText(c.text)
  })

  it('should handle null or missing component safely', () => {
    const task = {
      name: 'T',
      description: [null, { something: 'else' }]
    }
    const html = createCwTaskTooltipData(task)
    expect(html).toContain('<h1 class="govuk-heading-l">T</h1>')
  })
})
