// Module Runtime - Event delegation and data binding for declarative modules
import { initializeModule, saveStarsToDB, loadStarsFromDB, awardSingleStar, completeModuleDB } from '../modules/module-db.js';

export class ModuleRuntime {
  constructor(moduleCode, childId) {
    this.moduleCode = moduleCode;
    this.childId = childId;
    this.formData = {};
    this.completedActivities = new Set();
    this.currentPage = 0;
    this.pages = [];
    
    this.init();
  }

  async init() {

    
    // Initialize database
    await initializeModule(this.moduleCode);
    await this.loadProgress();
    
    // Setup event delegation
    this.setupEventDelegation();
    
    // Setup data binding
    this.setupDataBinding();
    
    // Setup pagination
    this.setupPagination();
    
    // Load saved form data
    this.loadFormData();
    

  }

  /**
   * Event delegation - handle all interactions
   */
  setupEventDelegation() {
    const container = document.querySelector('[data-module]');
    if (!container) return;

    // Click delegation
    container.addEventListener('click', async (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const amount = parseInt(target.getAttribute('data-amount')) || 1;

      switch (action) {
        case 'award-star':
          await this.awardStar(amount);
          break;
        case 'complete-module':
          await this.completeModule();
          break;
        case 'next-page':
          this.nextPage();
          break;
        case 'prev-page':
          this.prevPage();
          break;
      }
    });

    // Activity checkboxes
    container.addEventListener('change', (e) => {
      const activity = e.target.getAttribute('data-activity');
      if (activity) {
        if (e.target.checked) {
          this.completedActivities.add(activity);
        } else {
          this.completedActivities.delete(activity);
        }
        this.saveProgress();
      }
    });
  }

  /**
   * Data binding - auto-save form inputs
   */
  setupDataBinding() {
    const container = document.querySelector('[data-module]');
    if (!container) return;

    // Find all inputs with data-bind
    const inputs = container.querySelectorAll('[data-bind]');
    
    inputs.forEach(input => {
      const key = input.getAttribute('data-bind');
      
      // Load saved value
      if (this.formData[key]) {
        if (input.type === 'checkbox') {
          input.checked = this.formData[key];
        } else {
          input.value = this.formData[key];
        }
      }
      
      // Auto-save on change
      input.addEventListener('input', () => {
        const value = input.type === 'checkbox' ? input.checked : input.value;
        this.formData[key] = value;
        this.saveFormData();
      });
    });
  }

  /**
   * Pagination system
   */
  setupPagination() {
    this.pages = Array.from(document.querySelectorAll('[data-page]'));
    
    if (this.pages.length === 0) return;
    
    // Hide all pages except first
    this.pages.forEach((page, idx) => {
      page.style.display = idx === 0 ? 'block' : 'none';
    });
    
    // Create navigation if not exists
    this.createNavigation();
  }

  createNavigation() {
    // Check if navigation already exists
    if (document.querySelector('.module-nav')) return;
    
    const nav = document.createElement('div');
    nav.className = 'module-nav';
    nav.innerHTML = `
      <button class="nav-btn" data-action="prev-page">← Back</button>
      <span class="nav-page">Page <span id="currentPage">1</span> of ${this.pages.length}</span>
      <button class="nav-btn" data-action="next-page">Next →</button>
    `;
    
    document.body.prepend(nav);
  }

  nextPage() {
    if (this.currentPage < this.pages.length - 1) {
      this.currentPage++;
      this.showPage(this.currentPage);
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.showPage(this.currentPage);
    }
  }

  showPage(index) {
    this.pages.forEach((page, idx) => {
      page.style.display = idx === index ? 'block' : 'none';
    });
    
    const pageDisplay = document.getElementById('currentPage');
    if (pageDisplay) {
      pageDisplay.textContent = index + 1;
    }
    
    window.scrollTo(0, 0);
  }

  /**
   * Award stars
   */
  async awardStar(amount = 1) {
    try {
      for (let i = 0; i < amount; i++) {
        await awardSingleStar();
      }
      await saveStarsToDB();

      
      // Show feedback
      this.showNotification(`⭐ You earned ${amount} star${amount > 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('[Runtime] Error awarding stars:', error);
    }
  }

  /**
   * Complete module
   */
  async completeModule() {
    try {
      await completeModuleDB(this.moduleCode);

      
      // Show completion message
      this.showNotification('🎉 Module completed! Returning to dashboard...');
      
      // Return to dashboard after delay
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 2000);
    } catch (error) {
      console.error('[Runtime] Error completing module:', error);
    }
  }

  /**
   * Save/load form data
   */
  saveFormData() {
    localStorage.setItem(`module_${this.moduleCode}_data`, JSON.stringify(this.formData));
  }

  loadFormData() {
    const saved = localStorage.getItem(`module_${this.moduleCode}_data`);
    if (saved) {
      this.formData = JSON.parse(saved);
    }
  }

  /**
   * Save/load progress
   */
  async saveProgress() {
    const progress = {
      currentPage: this.currentPage,
      completedActivities: Array.from(this.completedActivities)
    };
    localStorage.setItem(`module_${this.moduleCode}_progress`, JSON.stringify(progress));
  }

  async loadProgress() {
    const saved = localStorage.getItem(`module_${this.moduleCode}_progress`);
    if (saved) {
      const progress = JSON.parse(saved);
      this.currentPage = progress.currentPage || 0;
      this.completedActivities = new Set(progress.completedActivities || []);
    }
  }

  /**
   * Show notification
   */
  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'module-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Auto-initialize if module code is in URL
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const moduleCode = params.get('code');
  const childId = params.get('childId');
  
  if (moduleCode && document.querySelector('[data-module]')) {
    window.moduleRuntime = new ModuleRuntime(moduleCode, childId);
  }
}
