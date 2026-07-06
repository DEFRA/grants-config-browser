import { createAll, Button, Checkboxes, ErrorSummary, Radios, SkipLink } from 'govuk-frontend'
import { initAll as initMoj } from '@ministryofjustice/frontend'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(SkipLink)
initMoj()

import '../images/visualise.svg'
