import { formatRelative } from 'date-fns'
import { enGB } from 'date-fns/locale'
import _ from 'lodash'
export const formatDateTime = (stringDate) =>
  _.upperFirst(formatRelative(new Date(stringDate), new Date(), { locale: enGB }))
