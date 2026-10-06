import { describe, it, expect } from 'vitest'
import { createCwTaskTooltipData, createCwStatusTooltipData, generateTaskList } from './cw-tooltip.js'

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

  describe('generateTaskList', () => {
    it('should generate a govuk-task-list with mandatory and optional tasks', () => {
      const tasks = [
        { code: 'T1', name: 'Task 1', mandatory: true },
        { code: 'T2', name: 'Task 2', mandatory: false }
      ]
      const html = generateTaskList(tasks)
      expect(html).toContain('<ul class="govuk-task-list">')
      expect(html).toContain('<li class="govuk-task-list__item govuk-task-list__item--with-link">')
      expect(html).toContain('Task 1*')
      expect(html).toContain('Incomplete')
      expect(html).toContain('Task 2')
      expect(html).toContain('Incomplete')
      expect(html).toContain('<strong class="govuk-tag">')
    })
  })

  describe('createCwStatusTooltipData', () => {
    it('should render status tooltip with phase, stage, and task list', () => {
      const status = { code: 'STATUS_IN_REVIEW', name: 'In Review' }
      const stage = {
        name: 'Stage 1',
        code: 'S1',
        taskGroups: [
          {
            name: 'Required Tasks',
            tasks: [{ code: 'T1', name: 'Check documents', mandatory: true }]
          }
        ]
      }
      const html = createCwStatusTooltipData(status, mockPhase, stage)
      expect(html).toContain('<span class="govuk-caption-m">Phase 1 - Stage 1</span>')
      expect(html).toContain('<h2 class="govuk-heading-m govuk-!-margin-bottom-2">In Review</h2>')
      expect(html).toContain('<strong>Phase:</strong> P1')
      expect(html).toContain('<strong>Stage:</strong> S1')
      expect(html).toContain('<strong>Status:</strong> STATUS_IN_REVIEW')
      expect(html).toContain('Required Tasks:')
      expect(html).toContain('govuk-task-list')
      expect(html).toContain('Check documents*')
      expect(html).toContain('Incomplete')
    })

    it('should fallback to code-based name if name is missing', () => {
      const status = { code: 'STATUS_AWAITING_RESPONSE' }
      const html = createCwStatusTooltipData(status, mockPhase, mockStage)
      expect(html).toContain('AWAITING RESPONSE')
    })

    it('should render status tooltip without phase and stage', () => {
      const status = { code: 'STATUS_AWAITING_RESPONSE', name: 'Awaiting Response' }
      const html = createCwStatusTooltipData(status, null, null)
      expect(html).not.toContain('govuk-caption-m')
      expect(html).toContain('Awaiting Response')
    })

    it('should render status tooltip when stage has no task groups', () => {
      const status = { code: 'STATUS_EMPTY', name: 'Empty' }
      const stage = { name: 'Stage 1', code: 'S1' }
      const html = createCwStatusTooltipData(status, mockPhase, stage)
      expect(html).not.toContain('govuk-task-list')
    })

    it('should render tasks defined on status level if stage has no task groups', () => {
      const status = {
        code: 'STATUS_CUSTOM',
        name: 'Custom',
        taskGroups: [
          {
            name: 'Status Level Tasks',
            tasks: [{ code: 'T1', name: 'Task at status', mandatory: false }]
          }
        ]
      }
      const html = createCwStatusTooltipData(status, mockPhase, mockStage)
      expect(html).toContain('Status Level Tasks:')
      expect(html).toContain('Task at status')
      expect(html).toContain('Incomplete')
    })

    it('should render beforeContent and afterContent in the correct order around the task list', () => {
      const status = {
        code: 'STATUS_IN_REVIEW',
        name: 'In Review',
        beforeContent: [
          {
            component: 'heading',
            level: 3,
            text: 'Before Heading'
          },
          {
            component: 'paragraph',
            text: 'Before Paragraph Text'
          }
        ],
        afterContent: [
          {
            component: 'paragraph',
            text: 'After Paragraph Text'
          }
        ]
      }
      const stage = {
        name: 'Stage 1',
        code: 'S1',
        taskGroups: [
          {
            name: 'Tasks',
            tasks: [{ code: 'T1', name: 'Task 1', mandatory: true }]
          }
        ]
      }

      const html = createCwStatusTooltipData(status, mockPhase, stage)

      expect(html).toContain('<h3 class="govuk-heading-s">Before Heading</h3>')
      expect(html).toContain('<p class="govuk-body">Before Paragraph Text</p>')
      expect(html).toContain('govuk-task-list')
      expect(html).toContain('Task 1')
      expect(html).toContain('<p class="govuk-body">After Paragraph Text</p>')

      const beforeIndex = html.indexOf('Before Heading')
      const taskIndex = html.indexOf('Task 1')
      const afterIndex = html.indexOf('After Paragraph Text')

      expect(beforeIndex).toBeGreaterThan(-1)
      expect(taskIndex).toBeGreaterThan(-1)
      expect(afterIndex).toBeGreaterThan(-1)
      expect(beforeIndex).toBeLessThan(taskIndex)
      expect(taskIndex).toBeLessThan(afterIndex)
    })

    it('should resolve beforeContent from stage when matched by renderIf', () => {
      const status1 = { code: 'STATUS_MATCHED', name: 'Matched Status' }
      const status2 = { code: 'STATUS_OTHER', name: 'Other Status' }
      const stage = {
        name: 'Stage 1',
        code: 'S1',
        beforeContent: [
          {
            renderIf: "jsonata:$.position.statusCode = 'STATUS_MATCHED'",
            content: [
              {
                component: 'paragraph',
                text: 'Stage-level before content for matched status'
              }
            ]
          },
          {
            renderIf: "jsonata:$.position.statusCode = 'STATUS_UNMATCHED'",
            content: [
              {
                component: 'paragraph',
                text: 'Stage-level before content for unmatched status'
              }
            ]
          }
        ],
        afterContent: [
          {
            renderIf: "jsonata:$.position.statusCode = 'STATUS_MATCHED'",
            content: [
              {
                component: 'paragraph',
                text: 'Stage-level after content for matched status'
              }
            ]
          }
        ]
      }

      const htmlMatched = createCwStatusTooltipData(status1, mockPhase, stage)
      expect(htmlMatched).toContain('Stage-level before content for matched status')
      expect(htmlMatched).toContain('Stage-level after content for matched status')
      expect(htmlMatched).not.toContain('Stage-level before content for unmatched status')

      const htmlOther = createCwStatusTooltipData(status2, mockPhase, stage)
      expect(htmlOther).not.toContain('Stage-level before content for matched status')
      expect(htmlOther).not.toContain('Stage-level after content for matched status')
      expect(htmlOther).not.toContain('Stage-level before content for unmatched status')
    })

    it('should resolve unconditional beforeContent and afterContent from stage', () => {
      const status = { code: 'STATUS_SIMPLE', name: 'Simple' }
      const stage = {
        name: 'Stage 1',
        code: 'S1',
        beforeContent: [
          {
            content: [
              {
                component: 'paragraph',
                text: 'General before content'
              }
            ]
          }
        ],
        afterContent: [
          {
            content: [
              {
                component: 'paragraph',
                text: 'General after content'
              }
            ]
          }
        ]
      }

      const html = createCwStatusTooltipData(status, mockPhase, stage)
      expect(html).toContain('General before content')
      expect(html).toContain('General after content')
    })

    it('should render string beforeContent and afterContent', () => {
      const status = {
        code: 'STATUS_STRINGS',
        name: 'String Content',
        beforeContent: 'Simple string before',
        afterContent: 'Simple string after'
      }

      const html = createCwStatusTooltipData(status, mockPhase, mockStage)
      expect(html).toContain('<p class="govuk-body">Simple string before</p>')
      expect(html).toContain('<p class="govuk-body">Simple string after</p>')
    })

    it('should render beforeContent and afterContent when no tasks exist', () => {
      const status = {
        code: 'STATUS_NO_TASKS',
        name: 'No Tasks',
        beforeContent: [{ component: 'paragraph', text: 'Just before' }],
        afterContent: [{ component: 'paragraph', text: 'Just after' }]
      }

      const html = createCwStatusTooltipData(status, mockPhase, mockStage)
      expect(html).toContain('Just before')
      expect(html).toContain('Just after')
      expect(html).not.toContain('govuk-task-list')
    })
  })
})
