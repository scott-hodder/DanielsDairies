export function showElement(element) {
  if (element) {
    element.classList.remove('hidden')
  }
}

export function hideElement(element) {
  if (element) {
    element.classList.add('hidden')
  }
}

export function setLoadingState(button, textElement, spinnerElement, isLoading) {
  if (button) {
    button.disabled = isLoading
  }

  if (textElement && spinnerElement) {
    if (isLoading) {
      textElement.classList.add('hidden')
      spinnerElement.classList.remove('hidden')
    } else {
      textElement.classList.remove('hidden')
      spinnerElement.classList.add('hidden')
    }
  }
}

export function setMessage(errorElement, successElement, type, message) {
  if (type === 'error') {
    if (errorElement) {
      errorElement.textContent = message
      errorElement.classList.remove('hidden')
    }
    if (successElement) {
      successElement.classList.add('hidden')
    }
    return
  }

  if (successElement) {
    successElement.textContent = message
    successElement.classList.remove('hidden')
  }
  if (errorElement) {
    errorElement.classList.add('hidden')
  }
}

export function clearMessages(errorElement, successElement) {
  if (errorElement) {
    errorElement.classList.add('hidden')
  }
  if (successElement) {
    successElement.classList.add('hidden')
  }
}
