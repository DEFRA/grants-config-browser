import { describe, it, expect } from 'vitest'
import { createCwTaskTooltipData, createCwStatusTooltipData, generateTaskList, ensureArray } from './cw-tooltip.js'

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
      expect(html).toContain('Required Tasks')
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
      expect(html).toContain('Status Level Tasks')
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

    it('should match renderIf with double quotes and stripped STATUS_ prefix', () => {
      const status = { code: 'STATUS_REVIEW', name: 'Review' }
      const stage = {
        name: 'Stage 1',
        code: 'STAGE_1',
        beforeContent: [
          {
            renderIf: 'jsonata:$.position.statusCode = "REVIEW"',
            content: [{ component: 'paragraph', text: 'Matched stripped code' }]
          }
        ]
      }
      const html = createCwStatusTooltipData(status, mockPhase, stage)
      expect(html).toContain('Matched stripped code')
    })

    it('should match renderIf based on stage code when status is not specified in condition', () => {
      const status = { code: 'STATUS_ANY', name: 'Any' }
      const stage = {
        name: 'Stage 1',
        code: 'STAGE_FC_REVIEWING',
        beforeContent: [
          {
            renderIf: "jsonata:$.position.stageCode = 'STAGE_FC_REVIEWING'",
            content: [{ component: 'paragraph', text: 'Matched stage code' }]
          }
        ]
      }
      const html = createCwStatusTooltipData(status, mockPhase, stage)
      expect(html).toContain('Matched stage code')
    })

    it('should handle single object beforeContent with renderIf and various component types', () => {
      const status = {
        code: 'STATUS_TEST',
        name: 'Test',
        beforeContent: {
          renderIf: "jsonata:$.position.statusCode = 'STATUS_TEST'",
          component: 'warning-text',
          text: 'Warning message'
        },
        afterContent: {
          renderIf: "jsonata:$.position.statusCode = 'STATUS_TEST'",
          component: 'inset-text',
          text: 'Inset message'
        }
      }
      const html = createCwStatusTooltipData(status, mockPhase, mockStage)
      expect(html).toContain('govuk-warning-text')
      expect(html).toContain('Warning message')
      expect(html).toContain('govuk-inset-text')
      expect(html).toContain('Inset message')
    })

    it('should combine phase, stage, and status beforeContent and afterContent', () => {
      const phase = {
        code: 'PHASE_1',
        name: 'Phase 1',
        beforeContent: [{ component: 'paragraph', text: 'Phase Before' }],
        afterContent: [{ component: 'paragraph', text: 'Phase After' }]
      }
      const stage = {
        code: 'STAGE_1',
        name: 'Stage 1',
        beforeContent: [{ component: 'paragraph', text: 'Stage Before' }],
        afterContent: [{ component: 'paragraph', text: 'Stage After' }]
      }
      const status = {
        code: 'STATUS_1',
        name: 'Status 1',
        beforeContent: [{ component: 'paragraph', text: 'Status Before' }],
        afterContent: [{ component: 'paragraph', text: 'Status After' }]
      }

      const html = createCwStatusTooltipData(status, phase, stage)
      expect(html).toContain('Phase Before')
      expect(html).toContain('Stage Before')
      expect(html).toContain('Status Before')
      expect(html).toContain('Status After')
      expect(html).toContain('Stage After')
      expect(html).toContain('Phase After')
    })

    it('should render details, notification-banner, button, and tag components', () => {
      const status = {
        code: 'STATUS_COMPONENTS',
        name: 'Components',
        beforeContent: [
          {
            component: 'details',
            title: 'Need help?',
            text: 'Help details text'
          },
          {
            component: 'notification-banner',
            title: 'Important update',
            text: 'Banner content'
          }
        ],
        afterContent: [
          { component: 'button', text: 'Submit Application' },
          { component: 'tag', text: 'Complete' }
        ]
      }

      const html = createCwStatusTooltipData(status, mockPhase, mockStage)
      expect(html).toContain('govuk-details')
      expect(html).toContain('Need help?')
      expect(html).toContain('Help details text')
      expect(html).toContain('govuk-notification-banner')
      expect(html).toContain('Important update')
      expect(html).toContain('Banner content')
      expect(html).toContain('<button class="govuk-button">Submit Application</button>')
      expect(html).toContain('<strong class="govuk-tag">Complete</strong>')
    })

    it('should render beforeContent and afterContent in task tooltips', () => {
      const task = {
        name: 'Task with content',
        beforeContent: [{ component: 'paragraph', text: 'Task before text' }],
        description: 'Task description',
        afterContent: [{ component: 'paragraph', text: 'Task after text' }]
      }

      const html = createCwTaskTooltipData(task, mockPhase, mockStage)
      expect(html).toContain('Task before text')
      expect(html).toContain('Task description')
      expect(html).toContain('Task after text')
    })

    it('should handle missing and empty status info gracefully', () => {
      const html = createCwStatusTooltipData(null, null, null)
      expect(html).toContain('There are no tasks to complete.')
    })

    it('should match multiple conditions in an array for renderIf', () => {
      const status = { code: 'STATUS_MATCH' }
      const stage = {
        beforeContent: [
          {
            renderIf: ["jsonata:$.position.statusCode = 'UNKNOWN'", "jsonata:$.position.statusCode = 'MATCH'"],
            content: 'Matched by array'
          }
        ]
      }
      const html = createCwStatusTooltipData(status, null, stage)
      expect(html).toContain('Matched by array')
    })

    it('should match renderIf when provided as an object', () => {
      const status = { code: 'STATUS_A' }
      const stage = { code: 'STAGE_B' }
      const phase = { code: 'PHASE_C' }
      const content = {
        renderIf: { statusCode: 'A', stageCode: 'B', phaseCode: 'C' },
        content: 'Matched object'
      }
      const stageMatched = {
        ...stage,
        beforeContent: [content]
      }
      const html = createCwStatusTooltipData(status, phase, stageMatched)
      expect(html).toContain('Matched object')

      const statusUnmatched = {
        ...stage,
        beforeContent: [{ ...content, renderIf: { status: 'X' } }]
      }
      const html2 = createCwStatusTooltipData(status, phase, statusUnmatched)
      expect(html2).not.toContain('Matched object')
    })

    it('should handle non-string and empty renderIf safely', () => {
      const status = { code: 'STATUS_A' }
      const stage = {
        beforeContent: [
          { renderIf: 123, content: 'Not rendered' },
          { renderIf: '   ', content: 'Empty string rendered' }
        ]
      }
      const html = createCwStatusTooltipData(status, null, stage)
      expect(html).not.toContain('Not rendered')
      expect(html).toContain('Empty string rendered')
    })

    it('should match boolean renderIf', () => {
      const status = { code: 'STATUS_A' }
      const stage = {
        beforeContent: [
          { renderIf: true, content: 'True rendered' },
          { renderIf: false, content: 'False not rendered' },
          { renderIf: 'true', content: 'String true rendered' },
          { renderIf: 'false', content: 'String false not rendered' }
        ]
      }
      const html = createCwStatusTooltipData(status, null, stage)
      expect(html).toContain('True rendered')
      expect(html).not.toContain('False not rendered')
      expect(html).toContain('String true rendered')
      expect(html).not.toContain('String false not rendered')
    })

    it('should render html, content, and items when component type is missing', () => {
      const task = {
        name: 'T',
        description: [
          { html: '<strong>Raw HTML</strong>' },
          { content: 'Nested string content' },
          { items: [{ component: 'text', text: 'Item in div' }] }
        ]
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('<strong>Raw HTML</strong>')
      expect(html).toContain('Nested string content')
      expect(html).toContain('<div>Item in div</div>')
    })

    it('should render various component aliases', () => {
      const task = {
        name: 'T',
        description: [
          { type: 'header', text: 'Header', level: 3 },
          { type: 'h4', text: 'H4' },
          { component: 'p', text: 'Paragraph' },
          { component: 'bullet-list', items: ['Item'] },
          { component: 'list', items: ['Item'] },
          { component: 'ul', items: ['Item'] },
          { component: 'ol', items: ['Item'] },
          { component: 'group', items: [{ component: 'text', text: 'Group' }] },
          { component: 'span', text: 'Span' },
          { component: 'link', text: 'Link' },
          { component: 'a', text: 'A' },
          { component: 'br' },
          { component: 'inset', text: 'Inset' },
          { component: 'warning', text: 'Warning' },
          { component: 'raw', html: 'Raw' }
        ]
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('<h3 class="govuk-heading-s">Header</h3>')
      expect(html).toContain('<h4 class="govuk-heading-s">H4</h4>')
      expect(html).toContain('<p class="govuk-body">Paragraph</p>')
      expect(html).toContain('<ul class="govuk-list govuk-list--bullet"><li>Item</li></ul>')
      expect(html).toContain('<ol class="govuk-list govuk-list--number"><li>Item</li></ol>')
      expect(html).toContain('<div class="">Group</div>')
      expect(html).toContain('Span')
      expect(html).toContain('<a href="#" class="govuk-link">Link</a>')
      expect(html).toContain('<br/>')
      expect(html).toContain('<div class="govuk-inset-text">Inset</div>')
      expect(html).toContain('govuk-warning-text')
      expect(html).toContain('Raw')
    })

    it('should handle edge cases in renderText', () => {
      const task = {
        name: 'T',
        description: [
          { component: 'text', text: null },
          { component: 'text', text: 12345 },
          { component: 'text', text: { type: 'span', text: 'Nested obj' } }
        ]
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('12345')
      expect(html).toContain('Nested obj')
    })

    it('should render input without type or label/hint', () => {
      const task = {
        name: 'T',
        input: {}
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('<div class="govuk-form-group"></div>')
    })

    it('should cover remaining branches in renderDescription and renderComponent', () => {
      const task = {
        name: 'T',
        description: [
          { content: null }, // hits renderDescription(null) -> line 289
          { text: 'Plain text component' }, // hits line 338 in renderComponent
          { something: 'else' } // hits line 349 in renderComponent
        ]
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('Plain text component')
    })

    it('should hit object branch in renderDescription', () => {
      const task = {
        name: 'T',
        description: { component: 'text', text: 'Object description' } // hits line 301 in renderDescription
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('Object description')
    })

    it('should handle number level in heading', () => {
      const task = {
        name: 'T',
        description: [{ component: 'h5', text: 'H5 header' }]
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('<h5 class="govuk-heading-s">H5 header</h5>')
    })

    it('should cover additional extractContent branches', () => {
      const status = { code: 'STATUS_A' }
      const stage = {
        beforeContent: [
          null, // hits line 215
          'String entry', // hits line 218
          { renderIf: true, items: ['Item 1'], name: 'Group' }, // hits line 228-233
          { renderIf: true, items: 'Single item' }, // hits line 232
          { content: ['Content 1'] }, // hits line 239-240
          { content: 'Single content' }, // hits line 242
          { items: ['Item 2'] }, // hits line 244-246
          { items: 'Single item 2' }, // hits line 248
          { something: 'else' } // hits nothing in loop, but loop continues
        ]
      }
      const html = createCwStatusTooltipData(status, null, stage)
      expect(html).toContain('String entry')
      expect(html).toContain('Item 1')
      expect(html).toContain('Single item')
      expect(html).toContain('Content 1')
      expect(html).toContain('Single content')
      expect(html).toContain('Item 2')
      expect(html).toContain('Single item 2')
    })

    it('should cover fallback in renderDescription with invalid type', () => {
      const task = {
        name: 'T',
        description: 12345 // hits line 303
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('<h1 class="govuk-heading-l">T</h1>') // returns '' for description
    })

    it('should cover matchesCodeInExpression branches', () => {
      const status = { code: 'STATUS_MATCH' }
      const stage = {
        beforeContent: [
          {
            renderIf: 'MATCH', // hits line 197 if 194 is skipped? No.
            content: 'Direct match'
          },
          {
            renderIf: 'The status is MATCH right now', // hits line 194 (word match)
            content: 'Word match'
          },
          {
            renderIf: { statusCode: 'STATUS_MATCH' }, // hits line 170-171 in matchesCode
            content: 'Exact match'
          }
        ]
      }
      const html = createCwStatusTooltipData(status, null, stage)
      expect(html).toContain('Direct match')
      expect(html).toContain('Word match')
      expect(html).toContain('Exact match')
    })

    it('should cover additional branches in matchesCode and matchesCodeInExpression', () => {
      // matchesCode: !expected || !actual
      expect(
        createCwStatusTooltipData({ code: 'OTHER' }, null, {
          beforeContent: { renderIf: { status: 'S' }, content: 'X' }
        })
      ).not.toContain('X')

      expect(
        createCwStatusTooltipData({ code: null }, null, {
          beforeContent: { renderIf: { status: 'S' }, content: 'X' }
        })
      ).not.toContain('X')

      // matchesCodeInExpression: exact match fallback
      const status = { code: 'A+B' }
      const stage = {
        beforeContent: {
          renderIf: 'A+B',
          content: 'Plus Match'
        }
      }
      const html = createCwStatusTooltipData(status, null, stage)
      expect(html).toContain('Plus Match')
    })

    it('should cover additional component rendering branches', () => {
      const task = {
        name: 'T',
        description: [
          { component: 'heading', title: 'Title Only' },
          { component: 'h1', content: 'Content Only' },
          { component: 'paragraph', content: 'Para Content' },
          { component: 'unordered-list', items: ['Item 1'] },
          { component: 'ordered-list', items: ['Item 2'] },
          { component: 'container', content: ['Contained'] },
          { component: 'url', title: 'Link Title' },
          { component: 'inset-text', content: 'Inset Content' },
          { component: 'warning-text', content: 'Warning Content' },
          { component: 'details', summary: 'Summary', content: 'Detail Content' },
          { component: 'notification-banner', text: 'Banner Text' },
          { component: 'tag', content: 'Tag Content' },
          { component: 'html', text: 'HTML Text' },
          { component: 'raw', content: 'RAW Content' },
          { items: [{ component: 'text', text: 'No type items' }] }
        ]
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('Title Only')
      expect(html).toContain('Content Only')
      expect(html).toContain('Para Content')
      expect(html).toContain('<li>Item 1</li>')
      expect(html).toContain('<li>Item 2</li>')
      expect(html).toContain('Contained')
      expect(html).toContain('Link Title')
      expect(html).toContain('Inset Content')
      expect(html).toContain('Warning Content')
      expect(html).toContain('Summary')
      expect(html).toContain('Banner Text')
      expect(html).toContain('Tag Content')
      expect(html).toContain('HTML Text')
      expect(html).toContain('RAW Content')
      expect(html).toContain('No type items')
    })

    it('should cover renderText with nested components in array', () => {
      const task = {
        name: 'T',
        description: {
          component: 'paragraph',
          text: ['Text ', { component: 'span', text: 'Span' }, ' End']
        }
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('<p class="govuk-body">Text Span End</p>')
    })

    it('should cover renderInput branches', () => {
      const task = {
        name: 'T',
        input: {
          label: { text: 'Label' }, // no classes
          hint: 'Hint' // not array
        }
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('<label class="govuk-label ">Label</label>')
      expect(html).toContain('<div class="govuk-hint">Hint</div>')
    })

    it('should cover matchesCondition branches', () => {
      expect(
        createCwStatusTooltipData({ code: 'S' }, null, {
          beforeContent: { renderIf: 'false', content: 'No' }
        })
      ).not.toContain('No')

      expect(
        createCwStatusTooltipData({ code: 'S' }, null, {
          beforeContent: { renderIf: 123, content: 'Fallback' }
        })
      ).not.toContain('Fallback')
    })

    it('should match phase code in string expression', () => {
      const status = { code: 'S' }
      const phase = { code: 'PHASE_P1' }
      const stage = {
        beforeContent: {
          renderIf: 'PHASE_P1',
          content: 'Matched Phase String'
        }
      }
      const html = createCwStatusTooltipData(status, phase, stage)
      expect(html).toContain('Matched Phase String')
    })

    it('should hit exact match fallback in matchesCodeInExpression', () => {
      const status = { code: '++' }
      const stage = {
        beforeContent: {
          renderIf: '++',
          content: 'Plus Plus Match'
        }
      }
      const html = createCwStatusTooltipData(status, null, stage)
      expect(html).toContain('Plus Plus Match')
    })

    it('should cover falsy description in renderDescription', () => {
      // hits line 279
      const task = { name: 'T', description: null }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('<h1 class="govuk-heading-l">T</h1>')
      expect(html).not.toContain('govuk-body')
    })

    it('should hit false branches in matchesObjectCondition', () => {
      const status = { code: 'S' }
      const phase = { code: 'P' }

      expect(
        createCwStatusTooltipData(status, null, {
          beforeContent: { renderIf: { statusCode: 'WRONG' }, content: 'X' }
        })
      ).not.toContain('X')

      expect(
        createCwStatusTooltipData(status, null, {
          beforeContent: { renderIf: { status: 'WRONG' }, content: 'X' }
        })
      ).not.toContain('X')

      expect(
        createCwStatusTooltipData(status, null, {
          beforeContent: { renderIf: { stageCode: 'WRONG' }, content: 'X' }
        })
      ).not.toContain('X')

      expect(
        createCwStatusTooltipData(status, phase, {
          beforeContent: { renderIf: { phaseCode: 'WRONG' }, content: 'X' }
        })
      ).not.toContain('X')
    })

    it('should cover renderHtml, renderRaw and renderText fallbacks', () => {
      const task = {
        name: 'T',
        description: [
          { component: 'html' },
          { component: 'raw' },
          { component: 'text', text: 1 },
          { component: 'text', text: true }
        ]
      }
      const html = createCwTaskTooltipData(task)
      expect(html).toContain('1')
      expect(html).toContain('true')
    })

    describe('ensureArray', () => {
      it('should return the same array if already an array', () => {
        const arr = ['a', 'b', 123]
        expect(ensureArray(arr)).toBe(arr)
      })

      it('should return a single-item array if input is a single item', () => {
        expect(ensureArray('test')).toEqual(['test'])
        expect(ensureArray({ foo: 'bar' })).toEqual([{ foo: 'bar' }])
        expect(ensureArray(42)).toEqual([42])
        expect(ensureArray(0)).toEqual([0])
        expect(ensureArray(false)).toEqual([false])
      })

      it('should return an empty array if input is null or undefined', () => {
        expect(ensureArray(null)).toEqual([])
        expect(ensureArray(undefined)).toEqual([])
        expect(ensureArray()).toEqual([])
      })
    })
  })
})
