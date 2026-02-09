import { emit } from './eventBus.js'

const appState = {
  modules: [],
  childModules: [],
  selectedChild: null
}

export function setAppState(key, value) {
  appState[key] = value
  emit(`state:${key}`, value)
}

export function getAppState(key) {
  return appState[key]
}
