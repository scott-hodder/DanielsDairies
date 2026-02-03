export const dashboardState = {
  currentUser: null,
  children: [],
  selectedChild: null,
  modules: [],
  childModules: [],
  parentModules: [],
  categoryColors: {},
  currentModuleSeries: 'all',
  currentPurchaseModule: null,
  pendingChildSelection: null,
  editingChild: null,
  showAllUnlockedModules: false,
  showAllChildModules: false,
  currentWeeklyPlan: null,
  currentFocusPlan: null,
  currentInsightsSubtab: 'overview',
  lockedModulesShowcase: [],
  moreModulesCurrentIndex: 0,
  moreModulesRotationTimer: null,
  allModulesFilters: {
    category: 'all',
    series: 'all'
  },
  isCurrentUserAdmin: false
}

export function setCurrentUser(user) {
  dashboardState.currentUser = user
}

export function setChildren(children) {
  dashboardState.children = children
}

export function setSelectedChild(child) {
  dashboardState.selectedChild = child
}

export function setModules(modules) {
  dashboardState.modules = modules
}

export function setChildModules(modules) {
  dashboardState.childModules = modules
}

export function setParentModules(modules) {
  dashboardState.parentModules = modules
}

export function setCategoryColors(colors) {
  dashboardState.categoryColors = colors
}

export function setCurrentModuleSeries(series) {
  dashboardState.currentModuleSeries = series
}

export function setCurrentPurchaseModule(module) {
  dashboardState.currentPurchaseModule = module
}

export function setPendingChildSelection(childId) {
  dashboardState.pendingChildSelection = childId
}

export function setEditingChild(child) {
  dashboardState.editingChild = child
}

export function setShowAllUnlockedModules(value) {
  dashboardState.showAllUnlockedModules = value
}

export function setShowAllChildModules(value) {
  dashboardState.showAllChildModules = value
}

export function setCurrentWeeklyPlan(plan) {
  dashboardState.currentWeeklyPlan = plan
}

export function setCurrentFocusPlan(plan) {
  dashboardState.currentFocusPlan = plan
}

export function setCurrentInsightsSubtab(tab) {
  dashboardState.currentInsightsSubtab = tab
}

export function setLockedModulesShowcase(modules) {
  dashboardState.lockedModulesShowcase = modules
}

export function setMoreModulesCurrentIndex(index) {
  dashboardState.moreModulesCurrentIndex = index
}

export function setMoreModulesRotationTimer(timer) {
  dashboardState.moreModulesRotationTimer = timer
}

export function setAllModulesFilters(filters) {
  dashboardState.allModulesFilters = {
    ...dashboardState.allModulesFilters,
    ...filters
  }
}

export function setIsCurrentUserAdmin(isAdmin) {
  dashboardState.isCurrentUserAdmin = isAdmin
}
