// Module Response Tracker
// This script should be included in all module HTML files to track user responses

class ModuleResponseTracker {
  constructor() {
    this.childId = null
    this.moduleId = null
    this.parentUserId = null
    this.currentPage = 1
    this.responses = []
    this.startTime = null
  }

  // Initialize tracker with module info
  async init(childId, moduleId, parentUserId) {
    this.childId = childId
    this.moduleId = moduleId
    this.parentUserId = parentUserId
    this.startTime = Date.now()
    
    // Load existing responses for this session
    await this.loadExistingResponses()
  }

  // Load existing responses for this module
  async loadExistingResponses() {
    try {
      const response = await fetch(`/api/module-responses/${this.childId}/${this.moduleId}`)
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          this.responses = await response.json()
        } else {
          // API endpoint doesn't exist yet or returned HTML
          console.log('API endpoint not available, starting with empty responses')
          this.responses = []
        }
      } else {
        // Handle 404 or other errors gracefully
        this.responses = []
      }
    } catch (error) {
      console.error('Error loading existing responses:', error)
      this.responses = []
    }
  }

  // Track a response
  async trackResponse(questionData) {
    const {
      questionText,
      responseType,
      responseValue = null,
      responseOptions = null,
      selectedOption = null,
      questionOrder = this.responses.length + 1,
      isCorrect = null
    } = questionData

    const responseTime = Date.now() - this.startTime

    const response = {
      childId: this.childId,
      moduleId: this.moduleId,
      parentUserId: this.parentUserId,
      questionText,
      responseType,
      responseValue,
      responseOptions,
      selectedOption,
      pageNumber: this.currentPage,
      questionOrder,
      responseTimeMs: responseTime,
      isCorrect
    }

    try {
      // Save to database
      const savedResponse = await this.saveResponse(response)
      this.responses.push(savedResponse)
      
      console.log('Response tracked:', savedResponse)
      return savedResponse
    } catch (error) {
      console.error('Error tracking response:', error)
      throw error
    }
  }

  // Save response to database
  async saveResponse(responseData) {
    try {
      const response = await fetch('/api/module-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData)
      })

      if (!response.ok) {
        // API endpoint doesn't exist yet - save to localStorage as fallback
        console.log('API endpoint not available, saving to localStorage')
        this.saveToLocalStorage(responseData)
        return { ...responseData, id: 'local-' + Date.now() }
      }

      return response.json()
    } catch (error) {
      console.error('Error saving response, using localStorage fallback:', error)
      this.saveToLocalStorage(responseData)
      return { ...responseData, id: 'local-' + Date.now() }
    }
  }

  // Fallback to localStorage when API is not available
  saveToLocalStorage(responseData) {
    const key = `module-responses-${this.childId}-${this.moduleId}`
    const existing = localStorage.getItem(key)
    const responses = existing ? JSON.parse(existing) : []
    responses.push({
      ...responseData,
      id: 'local-' + Date.now(),
      created_at: new Date().toISOString()
    })
    localStorage.setItem(key, JSON.stringify(responses))
  }

  // Set current page
  setCurrentPage(pageNumber) {
    this.currentPage = pageNumber
  }

  // Get all responses for this session
  getResponses() {
    return this.responses
  }

  // Get responses by type
  getResponsesByType(type) {
    return this.responses.filter(r => r.response_type === type)
  }

  // Get completion percentage
  getCompletionPercentage() {
    // This would need to be customized based on your module structure
    const totalQuestions = document.querySelectorAll('[data-question]').length
    const answeredQuestions = this.responses.length
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0
  }
}

// Auto-detect and setup response tracking for common question types
function setupAutoTracking(tracker) {
  // Text inputs
  document.querySelectorAll('input[type="text"], textarea').forEach(input => {
    input.addEventListener('change', async () => {
      await tracker.trackResponse({
        questionText: input.placeholder || input.getAttribute('data-question') || 'Text Response',
        responseType: 'text',
        responseValue: input.value
      })
    })
  })

  // Multiple choice
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', async () => {
      const name = radio.name
      const options = Array.from(document.querySelectorAll(`input[name="${name}"]`))
      const selectedOption = options.findIndex(opt => opt.checked)
      
      await tracker.trackResponse({
        questionText: radio.getAttribute('data-question') || `Question: ${name}`,
        responseType: 'multiple_choice',
        responseOptions: options.map(opt => opt.value || opt.nextElementSibling?.textContent),
        selectedOption,
        isCorrect: radio.getAttribute('data-correct') === 'true'
      })
    })
  })

  // Checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async () => {
      await tracker.trackResponse({
        questionText: checkbox.getAttribute('data-question') || checkbox.nextElementSibling?.textContent || 'Checkbox',
        responseType: 'multiple_choice',
        responseValue: checkbox.checked ? 'checked' : 'unchecked',
        isCorrect: checkbox.getAttribute('data-correct') === 'true'
      })
    })
  })

  // Select dropdowns
  document.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', async () => {
      await tracker.trackResponse({
        questionText: select.getAttribute('data-question') || 'Dropdown Question',
        responseType: 'multiple_choice',
        responseValue: select.value,
        responseOptions: Array.from(select.options).map(opt => opt.text),
        selectedOption: select.selectedIndex,
        isCorrect: select.getAttribute('data-correct') === select.value
      })
    })
  })

  // Rating scales (1-5 stars, etc.)
  document.querySelectorAll('[data-rating]').forEach(ratingElement => {
    ratingElement.addEventListener('click', async () => {
      const rating = ratingElement.getAttribute('data-rating')
      await tracker.trackResponse({
        questionText: ratingElement.getAttribute('data-question') || 'Rating',
        responseType: 'rating',
        responseValue: rating
      })
    })
  })

  // Emoji responses
  document.querySelectorAll('[data-emoji]').forEach(emojiElement => {
    emojiElement.addEventListener('click', async () => {
      const emoji = emojiElement.getAttribute('data-emoji')
      await tracker.trackResponse({
        questionText: emojiElement.getAttribute('data-question') || 'How are you feeling?',
        responseType: 'emoji',
        responseValue: emoji
      })
    })
  })
}

// Restore form state from saved responses
function restoreFormState(tracker) {
  const responses = tracker.getResponses()
  
  responses.forEach(response => {
    switch (response.response_type) {
      case 'text':
        // Restore text inputs and textareas
        document.querySelectorAll('input[type="text"], textarea').forEach(input => {
          const questionText = input.placeholder || input.getAttribute('data-question') || 'Text Response'
          if (questionText === response.question_text && response.response_value) {
            input.value = response.response_value
            input.classList.add('response-tracked')
          }
        })
        break
        
      case 'multiple_choice':
        // Restore radio buttons
        if (response.selected_option !== null && response.selected_option !== undefined) {
          document.querySelectorAll('input[type="radio"]').forEach(radio => {
            const questionText = radio.getAttribute('data-question') || `Question: ${radio.name}`
            if (questionText === response.question_text) {
              const options = Array.from(document.querySelectorAll(`input[name="${radio.name}"]`))
              if (response.selected_option >= 0 && response.selected_option < options.length) {
                options[response.selected_option].checked = true
                options[response.selected_option].classList.add('response-tracked')
              }
            }
          })
        }
        
        // Restore checkboxes
        if (response.response_value === 'checked' || response.response_value === 'unchecked') {
          document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            const questionText = checkbox.getAttribute('data-question') || checkbox.nextElementSibling?.textContent || 'Checkbox'
            if (questionText === response.question_text) {
              checkbox.checked = response.response_value === 'checked'
              if (checkbox.checked) {
                checkbox.classList.add('response-tracked')
              }
            }
          })
        }
        
        // Restore select dropdowns
        if (response.response_value) {
          document.querySelectorAll('select').forEach(select => {
            const questionText = select.getAttribute('data-question') || 'Dropdown Question'
            if (questionText === response.question_text) {
              select.value = response.response_value
              select.classList.add('response-tracked')
            }
          })
        }
        break
        
      case 'rating':
        // Restore rating selections
        if (response.response_value) {
          document.querySelectorAll('[data-rating]').forEach(ratingElement => {
            const questionText = ratingElement.getAttribute('data-question') || 'Rating'
            if (questionText === response.question_text && ratingElement.getAttribute('data-rating') === response.response_value) {
              ratingElement.classList.add('active', 'response-tracked')
            }
          })
        }
        break
        
      case 'emoji':
        // Restore emoji selections
        if (response.response_value) {
          document.querySelectorAll('[data-emoji]').forEach(emojiElement => {
            const questionText = emojiElement.getAttribute('data-question') || 'How are you feeling?'
            if (questionText === response.question_text && emojiElement.getAttribute('data-emoji') === response.response_value) {
              emojiElement.classList.add('selected', 'response-tracked')
            }
          })
        }
        break
    }
  })
}

// Initialize tracker when module loads
let moduleTracker = null

async function initializeModuleTracking() {
  // Get module info from URL parameters or global variables
  const urlParams = new URLSearchParams(window.location.search)
  const childId = urlParams.get('childId') || window.childId
  const moduleId = urlParams.get('moduleId') || window.moduleId
  const parentUserId = urlParams.get('parentUserId') || window.parentUserId

  if (childId && moduleId && parentUserId) {
    moduleTracker = new ModuleResponseTracker()
    await moduleTracker.init(childId, moduleId, parentUserId)
    
    // Setup auto-tracking
    setupAutoTracking(moduleTracker)
    
    // Restore form state after a short delay to ensure DOM is ready
    setTimeout(() => {
      restoreFormState(moduleTracker)
    }, 100)
    
    console.log('Module response tracking initialized')
  } else {
    console.warn('Missing required parameters for module tracking')
  }
}

// Global function to restore form state (call this when navigating between pages)
window.restoreModuleFormState = function() {
  if (moduleTracker) {
    restoreFormState(moduleTracker)
  }
}

// Global function for manual response tracking
window.trackModuleResponse = async function(questionData) {
  if (moduleTracker) {
    return await moduleTracker.trackResponse(questionData)
  } else {
    console.error('Module tracker not initialized')
  }
}

// Global function to get current tracker
window.getModuleTracker = function() {
  return moduleTracker
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeModuleTracking)
} else {
  initializeModuleTracking()
}
