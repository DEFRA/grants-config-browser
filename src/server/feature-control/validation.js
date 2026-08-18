import Joi from 'joi'
import { FEATURE_CONTROL_TYPES } from './constants.js'
import { convertValueForType, valueNotChanged } from './helpers.js'

export const getFeatureControlSchema = Joi.object({
  name: Joi.string().required()
})

export const validateUpdate = (rawValue, currentValue, note, type) => {
  const errors = { summary: [] }

  if (type === FEATURE_CONTROL_TYPES.STRING && !isNonEmptyString(rawValue)) {
    errors.summary.push({ text: 'Enter a valid value', href: '#value' })
    errors.value = { text: 'Enter a valid value' }
  }

  if (type === FEATURE_CONTROL_TYPES.NUMBER && !isValidNumber(rawValue)) {
    errors.summary.push({ text: 'Enter a valid number', href: '#value' })
    errors.value = { text: 'Enter a valid number' }
  }

  if (type === FEATURE_CONTROL_TYPES.LIST_NUMBER || type === FEATURE_CONTROL_TYPES.LIST_STRING) {
    validateListType(errors, rawValue, type)
  }

  if (errors.summary.length === 0) {
    const value = convertValueForType(rawValue, type)
    if (valueNotChanged(value, currentValue)) {
      errors.summary.push({ text: 'The value must be different from the current value', href: '#value' })
      errors.value = { text: 'The value must be different from the current value' }
    }
  }

  if (!note?.trim()) {
    errors.summary.push({ text: 'Enter a note to explain why this change is being made', href: '#note' })
    errors.note = { text: 'Enter a note to explain why this change is being made' }
  }

  return errors
}

const isNonEmptyString = (val) => typeof val === 'string' && val.trim() !== ''

const isValidNumber = (val) => typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))

const validateListType = (errors, rawValue, type) => {
  const rawItems = Array.isArray(rawValue) ? rawValue : [rawValue]
  const filteredItems = rawItems.map((v) => (typeof v === 'string' ? v.trim() : '')).filter((v) => v !== '')

  if (filteredItems.length === 0) {
    errors.summary.push({ text: 'Enter at least one item', href: '#value' })
    errors.value = { text: 'Enter at least one item' }
  } else if (rawItems.some((v) => !isNonEmptyString(v))) {
    const errorMessage =
      type === FEATURE_CONTROL_TYPES.LIST_NUMBER ? 'Enter a valid list of numbers' : 'Enter a valid list of items'
    errors.summary.push({ text: errorMessage, href: '#value' })
    errors.value = { text: errorMessage }
  } else if (type === FEATURE_CONTROL_TYPES.LIST_NUMBER && rawItems.some((v) => !isValidNumber(v))) {
    errors.summary.push({ text: 'Enter a valid list of numbers', href: '#value' })
    errors.value = { text: 'Enter a valid list of numbers' }
  }
}
