const eventTarget = new EventTarget()

export function emit(eventName, detail) {
  eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }))
}

export function on(eventName, handler) {
  const wrapped = (event) => handler(event.detail)
  eventTarget.addEventListener(eventName, wrapped)
  return () => eventTarget.removeEventListener(eventName, wrapped)
}
