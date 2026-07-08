export const getRadioFieldContent = (node, component, lists) => {
  const possibleHintPrefix = component.hint ? '<h2 class="govuk-hint">' + component.hint : ''
  return `<div class="govuk-form-group">
                    <fieldset class="govuk-fieldset">
                      <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">
                          ${node.components.length === 1 ? possibleHintPrefix : '<h2 class="govuk-fieldset__heading">' + component.title}
                        </h2>
                      </legend>
                      <div class="govuk-radios" data-module="govuk-radios">
                        ${createRadioOptions(lists, component.type === 'YesNoField' ? 'yes-no' : component.list)}
                      </div>
                    </fieldset>
                  </div>`
}

const createRadioOptions = (lists, id) => {
  const list = lists.find((l) => l.id === id)
  if (!list) {
    return `
        <div class="govuk-radios__item">
          <input class="govuk-radios__input" id="external" name="${id}" type="radio" value="external">
          <label class="govuk-label govuk-radios__label" for="external">
            Options defined externally
          </label>
        </div>
      `
  }

  return list.items
    .map(
      (item) => `
        <div class="govuk-radios__item">
          <input class="govuk-radios__input" id="${item.value}" name="${id}" type="radio" value="${item.value}">
          <label class="govuk-label govuk-radios__label" for="${item.value}">
            ${item.text}
          </label>
          ${item.description ? `<div id="govuk-hint govuk-radios__hint" class="govuk-hint govuk-radios__hint">${item.description}</div>` : ''}
        </div>
      `
    )
    .join('')
}
