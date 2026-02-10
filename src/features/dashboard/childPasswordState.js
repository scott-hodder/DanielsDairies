export function markChildHasPassword(child) {
  return {
    ...child,
    password: '***'
  }
}

export function markChildPasswordCleared(child) {
  return {
    ...child,
    password: null
  }
}
