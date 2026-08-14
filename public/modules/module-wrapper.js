// Module Wrapper - Handles star tracking and module completion
import { supabase } from '../src/supabaseClient.js'
import { updateChildModuleStatus, awardStars, getChild } from '../src/database.js'

class ModuleWrapper {
  constructor() {
    this.childId = sessionStorage.getItem('currentChildId')
    this.moduleId = sessionStorage.getItem('currentModuleId')
    this.starsEarned = 0
    this.isCompleted = false
    
    if (!this.childId || !this.moduleId) {
      console.error('No child or module ID found in session')
      this.redirectToDashboard()
    }
    
    this.init()
  }
  
  async init() {
    // Add completion tracking UI
    this.addCompletionUI()
    
    // Listen for module completion events
    this.setupEventListeners()
  }
  
  addCompletionUI() {
    // Create a floating completion bar
    const completionBar = document.createElement('div')
    completionBar.id = 'module-completion-bar'
    completionBar.innerHTML = `
      <style>
        #module-completion-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #405878 0%, #4c6c96 100%);
          color: #fffff5;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.2);
          z-index: 9999;
          font-family: 'Fredoka', sans-serif;
        }
        
        #module-completion-bar .stars-display {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 700;
        }
        
        #module-completion-bar .complete-button {
          padding: 12px 32px;
          background-color: #fffff5;
          color: #405878;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Fredoka', sans-serif;
          transition: transform 0.2s;
        }
        
        #module-completion-bar .complete-button:hover {
          transform: scale(1.05);
        }
        
        #module-completion-bar .complete-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        #module-completion-bar .back-button {
          padding: 10px 20px;
          background-color: rgba(255,255,255,0.15);
          color: #fffff5;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Fredoka', sans-serif;
        }
        
        @media (max-width: 768px) {
          #module-completion-bar {
            flex-direction: column;
            gap: 12px;
          }
        }
      </style>
      <div class="stars-display">
        <span>⭐</span>
        <span id="stars-earned">0</span>
        <span>stars earned</span>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="back-button" onclick="moduleWrapper.returnToDashboard()">
          ← Back to Dashboard
        </button>
        <button class="complete-button" id="complete-module-btn" disabled>
          Complete Module
        </button>
      </div>
    `
    
    document.body.appendChild(completionBar)
  }
  
  setupEventListeners() {
    const completeBtn = document.getElementById('complete-module-btn')
    
    if (completeBtn) {
      completeBtn.addEventListener('click', () => this.completeModule())
    }
    
    // Listen for custom events from the module
    window.addEventListener('moduleStarEarned', (e) => {
      this.addStars(e.detail.stars || 1)
    })
    
    window.addEventListener('moduleActivityCompleted', () => {
      this.enableCompletion()
    })
  }
  
  addStars(stars) {
    this.starsEarned += stars
    const starsDisplay = document.getElementById('stars-earned')
    if (starsDisplay) {
      starsDisplay.textContent = this.starsEarned
    }
  }
  
  enableCompletion() {
    const completeBtn = document.getElementById('complete-module-btn')
    if (completeBtn) {
      completeBtn.disabled = false
    }
  }
  
  async completeModule() {
    if (this.isCompleted) return
    
    try {
      this.isCompleted = true
      
      // If in iframe, send message to parent
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'MODULE_COMPLETED',
          starsEarned: this.starsEarned
        }, '*')
      } else {
        // Standalone mode - update database directly
        await updateChildModuleStatus(this.childId, this.moduleId, 'completed')
        
        // Award stars to child
        if (this.starsEarned > 0) {
          await awardStars(this.childId, this.starsEarned)
        }
      }
      
      // Show completion message
      this.showCompletionMessage()
      
    } catch (error) {
      console.error('Error completing module:', error)
      alert('Failed to complete module. Please try again.')
      this.isCompleted = false
    }
  }
  
  showCompletionMessage() {
    const encouragements = [
      "You're building amazing skills!",
      "Every module makes you stronger!",
      "You're becoming an emotion expert!",
      "Daniel is so proud of you!",
      "Your brain is growing right now!"
    ]
    const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)]

    const modal = document.createElement('div')
    modal.innerHTML = `
      <style>
        .completion-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 10000;
          font-family: 'Fredoka', sans-serif;
        }

        .completion-modal {
          background-color: #fffff5;
          border-radius: 24px;
          padding: 48px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          border: 8px solid #4c6c96;
        }

        .completion-icon {
          font-size: 80px;
          margin-bottom: 24px;
        }

        .completion-title {
          font-size: 36px;
          color: #405878;
          margin-bottom: 16px;
          font-weight: 700;
        }

        .completion-message {
          font-size: 18px;
          color: #364f66;
          margin-bottom: 8px;
        }

        .completion-encouragement {
          font-size: 15px;
          color: #6b7c8f;
          margin-bottom: 24px;
          font-style: italic;
        }

        .completion-stars {
          font-size: 32px;
          color: #4c6c96;
          font-weight: 700;
          margin-bottom: 32px;
        }

        .completion-button {
          padding: 16px 48px;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Fredoka', sans-serif;
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);
          margin-bottom: 12px;
          display: block;
          width: 100%;
        }

        .completion-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(20, 184, 166, 0.4);
        }

        .completion-button-secondary {
          padding: 12px 32px;
          background: #e8edf4;
          color: #405878;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Fredoka', sans-serif;
          display: block;
          width: 100%;
        }
      </style>
      <div class="completion-modal-overlay">
        <div class="completion-modal">
          <div class="completion-icon">🎉</div>
          <h1 class="completion-title">Module Complete!</h1>
          <p class="completion-message">Great job! You've completed this module.</p>
          <p class="completion-encouragement">${encouragement}</p>
          <div class="completion-stars">
            ⭐ ${this.starsEarned} stars earned!
          </div>
          <button class="completion-button" onclick="moduleWrapper.returnToDashboard()">
            Ready for the next one!
          </button>
          <button class="completion-button-secondary" onclick="moduleWrapper.returnToDashboard()">
            Back to Dashboard
          </button>
        </div>
      </div>
    `

    document.body.appendChild(modal)
  }
  
  returnToDashboard() {
    // If in iframe (new tab), close the window
    if (window.parent !== window) {
      window.close()
    } else {
      // Standalone mode - navigate to dashboard
      window.location.href = '/dashboard.html'
    }
  }
  
  redirectToDashboard() {
    setTimeout(() => {
      window.location.href = '/dashboard.html'
    }, 100)
  }
}

// Create global instance
window.moduleWrapper = new ModuleWrapper()

// Export for module use
export default window.moduleWrapper
