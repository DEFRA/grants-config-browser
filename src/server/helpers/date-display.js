import { formatRelative } from 'date-fns'
import _ from 'lodash'
export const formatDateTime = (stringDate) =>
  _.capitalize(formatRelative(new Date(stringDate), new Date()))
