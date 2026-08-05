export const FEATURE_CONTROL_TYPES = {
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  STRING: 'string',
  LIST_STRING: 'list-string',
  LIST_NUMBER: 'list-number'
}

export const TYPE_LABELS = {
  [FEATURE_CONTROL_TYPES.BOOLEAN]: 'Toggle',
  [FEATURE_CONTROL_TYPES.NUMBER]: 'Number',
  [FEATURE_CONTROL_TYPES.LIST_STRING]: 'Text list',
  [FEATURE_CONTROL_TYPES.LIST_NUMBER]: 'Number list'
}

export const DEFAULT_TYPE_LABEL = 'Text'

export const featureControlNotFound = 'Feature control not found'

export const ENVIRONMENT_LABELS = {
  local: 'LOCAL',
  dev: 'DEVELOPMENT',
  test: 'TEST',
  'perf-test': 'PERFORMANCE TEST',
  'ext-test': 'EXTERNAL TEST',
  prod: 'PRODUCTION'
}
