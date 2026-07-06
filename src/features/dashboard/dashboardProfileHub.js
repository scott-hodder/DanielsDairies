import { supabase } from '../../supabaseClient.js'
import { dashboardState } from '../../state/dashboardState.js'
import { switchStripeSubscriptionPlan, manageSubscription } from '../../services/databaseService.js'
import { showToast } from '../../ui/toast.js'
import { childAvatarHTML } from '../../lib/childAvatar.js'

// ================================================
// Module-level variables — set via setter functions from dashboardPage.js
// ================================================

var currentCreditSummary = null;
var currentSubscription = null;
var subscriptionTiers = [];

export function setCurrentCreditSummary(val) {
    currentCreditSummary = val;
}

export function setCurrentSubscription(val) {
    currentSubscription = val;
}

export function setSubscriptionTiers(val) {
    subscriptionTiers = val;
}

// ================================================
// getCurrencyFormatter — copied from dashboardPage.js lines 476-496
// ================================================

export function getCurrencyFormatter(currency = 'AUD') {
  const normalized = currency?.toUpperCase?.() || 'AUD'
  if (!getCurrencyFormatter.cache) {
    getCurrencyFormatter.cache = {}
  }
  if (!getCurrencyFormatter.cache[normalized]) {
    try {
      getCurrencyFormatter.cache[normalized] = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: normalized
      })
    } catch (_) {
      getCurrencyFormatter.cache[normalized] = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
      })
    }
  }

  return getCurrencyFormatter.cache[normalized]
}

// ================================================
// PROFILE HUB
// Replaces the workbook gallery with billing + subscription profile info
// ================================================

export class ModuleGallery {
    constructor(containerId, options) {
        this.containerId = containerId;
        this.container = null;
        this.options = options || {};
        this.changePlanModal = null;
        this.expandedTier = null;
    }

    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.warn('Profile hub container not found:', this.containerId);
            return;
        }

        this.render();
        this.createChangePlanModal();
        this.attachEventListeners();
    }

    getSafeTiers() {
        return (subscriptionTiers || []).filter(function(tier) {
            return tier && tier.is_active !== false;
        });
    }

    getCurrentTierName() {
        return (currentSubscription && currentSubscription.tier || 'mid').toLowerCase();
    }

    getNextPaymentDateLabel() {
        var rawDate = (currentSubscription && currentSubscription.stripe_current_period_end) || (currentSubscription && currentSubscription.current_period_end) || null;
        if (!rawDate) {
            return 'Pending Stripe sync';
        }
        return this.formatDateLabel(rawDate);
    }

    getBillingCycleLabel() {
        var start = (currentSubscription && currentSubscription.stripe_current_period_start) || (currentSubscription && currentSubscription.current_period_start) || null;
        var end = (currentSubscription && currentSubscription.stripe_current_period_end) || (currentSubscription && currentSubscription.current_period_end) || null;
        if (!start || !end) return 'Pending Stripe sync';
        return this.formatDateDDMMYYYY(start) + ' → ' + this.formatDateDDMMYYYY(end);
    }

    formatDateLabel(value) {
        if (!value) return 'Not available';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not available';
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    formatDateDDMMYYYY(value) {
        if (!value) return '-';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        var day = String(date.getDate()).padStart(2, '0');
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var year = date.getFullYear();
        return day + '/' + month + '/' + year;
    }

    formatCurrency(cents) {
        if (typeof cents !== 'number') return 'Contact support';
        var formatter = getCurrencyFormatter('AUD');
        return formatter.format(cents / 100) + '/month';
    }

    render() {
        if (!this.container) return;

        var tiers = this.getSafeTiers();
        var currentTierName = this.getCurrentTierName();
        var activeTier = tiers.find(function(t) { return t.tier === currentTierName; }) || null;

        this.container.innerHTML =
            '<section class="profile-hub">' +
                '<div class="profile-hub-header">' +
                    '<h2 class="profile-hub-title">👤 Your Profile</h2>' +
                    '<p class="profile-hub-subtitle">Manage your family learning journey</p>' +
                '</div>' +
                '<div class="profile-sections">' +
                    '<div class="profile-section">' +
                        '<button type="button" class="profile-section-toggle" data-section="children">' +
                            '<span class="profile-section-title">Children</span>' +
                            '<span class="profile-section-arrow">▼</span>' +
                        '</button>' +
                        '<div class="profile-section-content" id="profile-children-content">' +
                            this.renderChildrenSection() +
                        '</div>' +
                    '</div>' +
                    '<div class="profile-section">' +
                        '<button type="button" class="profile-section-toggle" data-section="plan">' +
                            '<span class="profile-section-title">Plan</span>' +
                            '<span class="profile-section-arrow">▼</span>' +
                        '</button>' +
                        '<div class="profile-section-content" id="profile-plan-content">' +
                            this.renderPlanSection(activeTier, currentTierName) +
                        '</div>' +
                    '</div>' +
                    '<div class="profile-section">' +
                        '<button type="button" class="profile-section-toggle" data-section="modules">' +
                            '<span class="profile-section-title">Modules</span>' +
                            '<span class="profile-section-arrow">▼</span>' +
                        '</button>' +
                        '<div class="profile-section-content" id="profile-modules-content">' +
                            this.renderModulesSection() +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</section>';

        // Add event listeners for collapsible sections
        this.attachSectionListeners();
    }

    renderChildrenSection() {
        var self = this;
        var children = (typeof dashboardState !== 'undefined' && dashboardState.children) || [];
        var selectedChildId = (typeof dashboardState !== 'undefined' && dashboardState.selectedChild && dashboardState.selectedChild.id) || null;

        if (!children || children.length === 0) {
            return '<div class="profile-children-actions">' +
                '<button type="button" class="profile-action-btn profile-action-btn-primary" id="profileAddChildBtn">➕ Add Child</button>' +
            '</div>' +
            '<p class="profile-empty-state">No children added yet. Add your first child to get started!</p>';
        }

        var profileChildren = children;
        if (selectedChildId) {
            profileChildren = children.filter(function(child) {
                return child.id === selectedChildId;
            });
        }

        if (!profileChildren.length) {
            profileChildren = [children[0]];
        }

        return '<div class="profile-children-actions">' +
                '<button type="button" class="profile-action-btn profile-action-btn-primary" id="profileAddChildBtn">➕ Add Child</button>' +
            '</div>' +
            '<div class="children-profile-grid">' +
            profileChildren.map(function(child) {
                var unlockedCount = 0;
                var completedCount = 0;
                var starsEarned = child.stars || 0;
                var currentPath = 'Not Started';

                if (window.childModuleStats && window.childModuleStats[child.id]) {
                    var stats = window.childModuleStats[child.id];
                    unlockedCount = stats.unlockedCount || 0;
                    completedCount = stats.completedCount || 0;
                    starsEarned = stats.totalStars || child.stars || 0;
                }

                if (window.childLearningPaths && window.childLearningPaths[child.id]) {
                    currentPath = window.childLearningPaths[child.id].name || 'Not Started';
                }

                return '<div class="child-profile-card">' +
                    '<div class="child-profile-avatar-wrap">' +
                        '<button type="button" class="child-profile-edit-btn" data-edit-child-id="' + self.escapeHtml(String(child.id)) + '" title="Edit child" aria-label="Edit ' + self.escapeHtml(child.name) + '">✏️</button>' +
                        '<div class="child-profile-avatar">' + childAvatarHTML(child.avatar, '👶') + '</div>' +
                    '</div>' +
                    '<div class="child-profile-info">' +
                        '<h4 class="child-profile-name">' + self.escapeHtml(child.name) + '</h4>' +
                        '<p class="child-profile-path">Current Path: ' + self.escapeHtml(currentPath) + '</p>' +
                        '<div class="child-profile-stats">' +
                            '<div class="child-stat">' +
                                '<span class="child-stat-value">' + unlockedCount + '</span>' +
                                '<span class="child-stat-label">Unlocked</span>' +
                            '</div>' +
                            '<div class="child-stat">' +
                                '<span class="child-stat-value">' + completedCount + '</span>' +
                                '<span class="child-stat-label">Completed</span>' +
                            '</div>' +
                            '<div class="child-stat">' +
                                '<span class="child-stat-value">' + starsEarned + '</span>' +
                                '<span class="child-stat-label">Stars</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('') +
        '</div>';
    }

    renderPlanSection(activeTier, currentTierName) {
        var subStatus = (currentSubscription && currentSubscription.status) || 'active';
        var isPastDue = subStatus === 'past_due';
        var isPaused = subStatus === 'paused';
        var isCancelScheduled = currentSubscription && currentSubscription.cancel_at_period_end;

        var statusBanner = '';
        if (isPastDue) {
            statusBanner =
                '<div class="plan-status-banner plan-status-banner-warning">' +
                    '<strong>Payment issue</strong>' +
                    '<p>We had trouble with your last payment. Please update your payment method to keep your subscription active.</p>' +
                    '<button type="button" id="retryPaymentBtn" class="profile-action-btn profile-action-btn-primary" style="margin-top:8px;">Update Payment</button>' +
                '</div>';
        } else if (isPaused) {
            statusBanner =
                '<div class="plan-status-banner plan-status-banner-info">' +
                    '<strong>Subscription paused</strong>' +
                    '<p>Your subscription is currently paused. You won\'t be charged until you resume.</p>' +
                    '<button type="button" id="resumeSubscriptionBtn" class="profile-action-btn profile-action-btn-primary" style="margin-top:8px;">Resume Subscription</button>' +
                '</div>';
        } else if (isCancelScheduled) {
            statusBanner =
                '<div class="plan-status-banner plan-status-banner-info">' +
                    '<strong>Cancellation scheduled</strong>' +
                    '<p>Your subscription will end on ' + this.escapeHtml(this.getNextPaymentDateLabel()) + '. You can still use it until then.</p>' +
                    '<button type="button" id="resumeSubscriptionBtn" class="profile-action-btn profile-action-btn-primary" style="margin-top:8px;">Keep Subscription</button>' +
                '</div>';
        }

        return '<div class="plan-overview">' +
            statusBanner +
            '<div class="plan-current-info">' +
                '<div class="plan-tier-badge">' + this.escapeHtml(((activeTier && activeTier.tier) || currentTierName).toUpperCase()) + '</div>' +
                '<h3>Current Plan Details</h3>' +
                '<div class="plan-stats">' +
                    '<div class="plan-stat">' +
                        '<span class="plan-stat-label">Monthly Modules</span>' +
                        '<span class="plan-stat-value">' + ((activeTier && activeTier.modules_per_month) || 0) + '</span>' +
                    '</div>' +
                    '<div class="plan-stat">' +
                        '<span class="plan-stat-label">Monthly Cost</span>' +
                        '<span class="plan-stat-value">' + this.escapeHtml(this.formatCurrency(activeTier && activeTier.monthly_price_cents)) + '</span>' +
                    '</div>' +
                    '<div class="plan-stat">' +
                        '<span class="plan-stat-label">Status</span>' +
                        '<span class="plan-stat-value">' + this.escapeHtml(subStatus.toUpperCase()) + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="plan-billing-info">' +
                '<h4>Billing Snapshot</h4>' +
                '<div class="billing-stats">' +
                    '<div class="billing-stat">' +
                        '<span class="billing-stat-label">Next Payment</span>' +
                        '<span class="billing-stat-value">' + this.escapeHtml(this.getNextPaymentDateLabel()) + '</span>' +
                    '</div>' +
                    '<div class="billing-stat">' +
                        '<span class="billing-stat-label">Credits Available</span>' +
                        '<span class="billing-stat-value">' + ((currentCreditSummary && currentCreditSummary.credits_available) || 0) + '</span>' +
                    '</div>' +
                    '<div class="billing-stat">' +
                        '<span class="billing-stat-label">Credits Used</span>' +
                        '<span class="billing-stat-value">' + ((currentCreditSummary && currentCreditSummary.credits_used) || 0) + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="plan-actions">' +
                '<button type="button" id="openChangePlanModal" class="profile-action-btn">Change Plan</button>' +
                '<button type="button" id="openMakePaymentModal" class="profile-action-btn profile-action-btn-primary">Make Payment</button>' +
            '</div>' +
            '<div class="plan-manage-links">' +
                (!isPaused && !isCancelScheduled
                    ? '<button type="button" id="pauseSubscriptionBtn" class="plan-manage-link">Pause subscription</button>'
                    : '') +
                (!isCancelScheduled
                    ? '<button type="button" id="cancelSubscriptionBtn" class="plan-manage-link plan-manage-link-danger">Cancel subscription</button>'
                    : '') +
            '</div>' +
        '</div>';
    }

    renderModulesSection() {
        var self = this;
        var unlockedModules = [];
        var completedModules = [];
        var children = (typeof dashboardState !== 'undefined' && dashboardState.children) || [];
        var modules = (typeof dashboardState !== 'undefined' && dashboardState.modules) || [];

        if (children && children.length > 0) {
            children.forEach(function(child) {
                if (window.childModuleAssignments && window.childModuleAssignments[child.id]) {
                    Object.values(window.childModuleAssignments[child.id]).forEach(function(assignment) {
                        if (assignment.is_active) {
                            var module = modules.find(function(m) { return m.id === assignment.module_id; });
                            if (module) {
                                if (!unlockedModules.find(function(m) { return m.id === module.id; })) {
                                    unlockedModules.push(module);
                                }
                                if (assignment.is_completed) {
                                    if (!completedModules.find(function(m) { return m.id === module.id; })) {
                                        completedModules.push(module);
                                    }
                                }
                            }
                        }
                    });
                }
            });
        }

        return '<div class="modules-overview">' +
            '<div class="modules-category">' +
                '<h4>📖 Unlocked Modules (' + unlockedModules.length + ')</h4>' +
                '<div class="modules-grid">' +
                    (unlockedModules.length > 0 ?
                        unlockedModules.map(function(module) {
                            return '<div class="module-tile">' +
                                '<div class="module-tile-emoji">' + self.escapeHtml(module.emoji || '📚') + '</div>' +
                                '<div class="module-tile-title">' + self.escapeHtml(module.title) + '</div>' +
                            '</div>';
                        }).join('') :
                        '<p class="modules-empty">No modules unlocked yet</p>'
                    ) +
                '</div>' +
            '</div>' +
            '<div class="modules-category">' +
                '<h4>✅ Completed Modules (' + completedModules.length + ')</h4>' +
                '<div class="modules-grid">' +
                    (completedModules.length > 0 ?
                        completedModules.map(function(module) {
                            return '<div class="module-tile completed">' +
                                '<div class="module-tile-emoji">' + self.escapeHtml(module.emoji || '📚') + '</div>' +
                                '<div class="module-tile-title">' + self.escapeHtml(module.title) + '</div>' +
                                '<div class="module-tile-check">✓</div>' +
                            '</div>';
                        }).join('') :
                        '<p class="modules-empty">No modules completed yet</p>'
                    ) +
                '</div>' +
            '</div>' +
        '</div>';
    }

    attachSectionListeners() {
        var self = this;
        var toggles = this.container.querySelectorAll('.profile-section-toggle');
        toggles.forEach(function(toggle) {
            var content = toggle.nextElementSibling;
            var arrow = toggle.querySelector('.profile-section-arrow');
            if (content) {
                content.style.display = 'none';
            }
            if (arrow) {
                arrow.style.transform = 'rotate(0deg)';
            }

            toggle.addEventListener('click', function() {
                if (!content || !arrow) return;
                if (content.style.display === 'none' || !content.style.display) {
                    content.style.display = 'block';
                    arrow.style.transform = 'rotate(180deg)';
                } else {
                    content.style.display = 'none';
                    arrow.style.transform = 'rotate(0deg)';
                }
            });
        });

        var addChildButton = this.container.querySelector('#profileAddChildBtn');
        if (addChildButton) {
            addChildButton.addEventListener('click', function(event) {
                event.stopPropagation();
                if (typeof window.showAddChildModal === 'function') {
                    window.showAddChildModal();
                } else if (typeof showAddChildModal === 'function') {
                    showAddChildModal();
                }
            });
        }

        var editButtons = this.container.querySelectorAll('.child-profile-edit-btn');
        editButtons.forEach(function(button) {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                var childId = button.getAttribute('data-edit-child-id');
                var children = (typeof dashboardState !== 'undefined' && dashboardState.children) || [];
                var child = children.find(function(item) { return String(item.id) === String(childId); });
                if (child) {
                    if (typeof window.promptEditChild === 'function') {
                        window.promptEditChild(child);
                    } else if (typeof promptEditChild === 'function') {
                        promptEditChild(child);
                    }
                }
            });
        });

        // Subscription management buttons
        var self = this;

        var cancelBtn = this.container.querySelector('#cancelSubscriptionBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                self.showCancelConfirmation();
            });
        }

        var pauseBtn = this.container.querySelector('#pauseSubscriptionBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                self.showPauseConfirmation();
            });
        }

        var resumeBtn = this.container.querySelector('#resumeSubscriptionBtn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                self.handleSubscriptionAction('resume', resumeBtn);
            });
        }

        var retryBtn = this.container.querySelector('#retryPaymentBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                // Open the make payment modal for retry
                self.createMakePaymentModal();
                if (self.makePaymentModal) {
                    self.makePaymentModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                    self.attachPaymentModalListeners();
                }
            });
        }
    }

    renderTierAccordion(tiers, selectedTierName) {
        if (!tiers.length) {
            return '<p class="change-plan-empty">No plans available right now. Please contact support.</p>';
        }

        var expandedTier = this.expandedTier || selectedTierName || tiers[0].tier;

        return tiers.map((tier) => {
            var isCurrent = tier.tier === selectedTierName;
            var isOpen = tier.tier === expandedTier;

            var featuresList = '<ul class="plan-features-list">' +
                '<li class="plan-feature-item included"><strong>' + tier.modules_per_month + '</strong>  modules per month</li>' +
                '<li class="plan-feature-item ' + (tier.includes_parent_insights ? 'included' : 'excluded') + '">Parent insights and progress tracking</li>' +
                '<li class="plan-feature-item ' + (tier.includes_behavioural_support ? 'included' : 'excluded') + '">Behavioral support resources</li>' +
                '</ul>';

            return '<div class="plan-accordion-item ' + (isCurrent ? 'is-current' : '') + ' ' + (isOpen ? 'is-open' : '') + '" data-tier="' + this.escapeHtml(tier.tier) + '">' +
                '<button type="button" class="plan-accordion-trigger" data-tier-trigger="' + this.escapeHtml(tier.tier) + '">' +
                    '<div><span class="plan-tier-name">' + this.escapeHtml(tier.tier.toUpperCase()) + '</span>' +
                    (isCurrent ? '<span class="plan-current-badge">Current Plan</span>' : '') + '</div>' +
                    '<span class="plan-tier-price">' + this.escapeHtml(this.formatCurrency(tier.monthly_price_cents)) + '</span>' +
                '</button>' +
                '<div class="plan-accordion-panel" ' + (isOpen ? '' : 'hidden') + '>' +
                    '<p>' + this.escapeHtml(tier.description || 'A balanced plan designed for steady emotional growth and family support.') + '</p>' +
                    '<ul>' +
                        '<li><strong>' + tier.modules_per_month + '</strong> modules per month</li>' +
                        '<li>Includes progress tracking and family dashboard tools</li>' +
                        '<li>Priority content updates for active subscribers</li>' +
                    '</ul>' +
                    '<button type="button" class="profile-select-plan-btn" data-select-tier="' + this.escapeHtml(tier.tier) + '" ' + (isCurrent ? 'disabled' : '') + '>' + (isCurrent ? 'Current Plan' : 'Select ' + this.escapeHtml(tier.tier.toUpperCase())) + '</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    createChangePlanModal() {
        var existingModal = document.getElementById('changePlanModal');
        if (existingModal) existingModal.remove();

        var tiers = this.getSafeTiers();
        var selectedTierName = this.getCurrentTierName();
        this.expandedTier = selectedTierName;

        var modal = document.createElement('div');
        modal.id = 'changePlanModal';
        modal.className = 'module-modal-overlay';
        modal.innerHTML =
            '<div class="module-modal change-plan-modal-shell">' +
                '<div class="change-plan-header">' +
                    '<h2>Change your plan</h2>' +
                    '<button type="button" class="modal-close" id="changePlanCloseBtn">✕</button>' +
                '</div>' +
                '<p class="change-plan-subtitle">Choose the best tier for your family. Your current plan is highlighted.</p>' +
                '<div id="changePlanAccordion">' + this.renderTierAccordion(tiers, selectedTierName) + '</div>' +
            '</div>';

        document.body.appendChild(modal);
        this.changePlanModal = modal;
    }

    attachEventListeners() {
        var openButton = document.getElementById('openChangePlanModal');
        if (openButton) {
            openButton.addEventListener('click', () => {
                if (this.changePlanModal) {
                    this.changePlanModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        }

        var openPaymentButton = document.getElementById('openMakePaymentModal');
        if (openPaymentButton) {
            openPaymentButton.addEventListener('click', () => {
                this.createMakePaymentModal();
                if (this.makePaymentModal) {
                    this.makePaymentModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                    this.attachPaymentModalListeners();
                }
            });
        }

        if (this.changePlanModal) {
            var closeButton = document.getElementById('changePlanCloseBtn');
            if (closeButton) {
                closeButton.addEventListener('click', () => this.closeModal());
            }

            this.changePlanModal.addEventListener('click', (event) => {
                if (event.target === this.changePlanModal) this.closeModal();
            });

            this.changePlanModal.addEventListener('click', (event) => {
                var trigger = event.target.closest('[data-tier-trigger]');
                if (trigger) {
                    this.expandedTier = trigger.getAttribute('data-tier-trigger');
                    this.refreshAccordion();
                    return;
                }

                var selectButton = event.target.closest('.profile-select-plan-btn');
                if (selectButton) {
                    var tierName = selectButton.getAttribute('data-select-tier');
                    if (tierName) this.handleTierSwitch(tierName, selectButton);
                }
            });
        }
    }

    attachPaymentModalListeners() {
        if (!this.makePaymentModal) return;
        var self = this;

        var closeButton = document.getElementById('makePaymentCloseBtn');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeMakePaymentModal());
        }

        this.makePaymentModal.addEventListener('click', (event) => {
            if (event.target === this.makePaymentModal) this.closeMakePaymentModal();
        });

        // Radio button selection for duration
        var radioButtons = this.makePaymentModal.querySelectorAll('input[name="paymentDuration"]');
        radioButtons.forEach((radio) => {
            radio.addEventListener('change', function() {
                self.handleDurationSelect(parseInt(this.value));
            });
        });

        // Credits amount input
        var creditsInput = document.getElementById('prepaidCreditsAmount');
        if (creditsInput) {
            creditsInput.addEventListener('input', function() {
                self.updateCreditsPreview(parseInt(this.value) || 0);
            });
        }

        // Buy credits button
        var buyCreditsBtn = document.getElementById('buyCreditsBtn');
        if (buyCreditsBtn) {
            buyCreditsBtn.addEventListener('click', () => this.handleBuyCredits());
        }

        // Proceed payment button
        var proceedButton = document.getElementById('proceedPaymentBtn');
        if (proceedButton) {
            proceedButton.addEventListener('click', () => this.handleProceedPayment());
        }
    }

    handleDurationSelect(months) {
        this.selectedMonths = months;

        // Update radio option styles
        var options = this.makePaymentModal.querySelectorAll('.payment-radio-option');
        options.forEach((opt) => {
            var radio = opt.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                opt.style.borderColor = '#2A8F8F';
                opt.style.background = '#F0FDFA';
            } else {
                opt.style.borderColor = '#E5E7EB';
                opt.style.background = 'white';
            }
        });

        // Show payment preview
        var preview = document.getElementById('paymentPreview');
        var newDateEl = document.getElementById('newPaidToDate');
        var amountEl = document.getElementById('paymentAmount');
        var proceedBtn = document.getElementById('proceedPaymentBtn');

        if (preview && newDateEl && amountEl) {
            var newEndDate = this.calculateNewEndDate(months);
            var price = this.getPaymentPrice(months);

            preview.style.display = 'block';
            newDateEl.textContent = this.formatDateDisplay(newEndDate.toISOString());
            amountEl.textContent = '$' + price.toFixed(2);
        }

        if (proceedBtn) {
            proceedBtn.disabled = false;
            proceedBtn.style.background = '#2A8F8F';
            proceedBtn.style.cursor = 'pointer';
            proceedBtn.textContent = 'Pay $' + this.getPaymentPrice(months).toFixed(2);
        }
    }

    updateCreditsPreview(credits) {
        var total = (credits * 6.99).toFixed(2);
        var preview = document.getElementById('creditsTotalPreview');
        if (preview) {
            preview.innerHTML = 'Total: <strong style="color: #F59E0B;">$' + total + '</strong>';
        }
    }

    async handleBuyCredits() {
        var credits = parseInt(document.getElementById('prepaidCreditsAmount')?.value || '5');
        if (credits < 1) {
            this.notifyUser('Please enter at least 1 credit.');
            return;
        }

        var buyBtn = document.getElementById('buyCreditsBtn');
        if (buyBtn) {
            buyBtn.disabled = true;
            buyBtn.textContent = 'Processing...';
        }

        try {
            var response = await this.callPaymentEndpoint({
                paymentType: 'prepaid',
                credits: credits,
                pricePerCredit: 6.99
            });

            if (response.url) {
                window.location.assign(response.url);
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (error) {
            console.error('Credits purchase error:', error);
            this.notifyUser(error?.message || 'Unable to process credits purchase.');
            if (buyBtn) {
                buyBtn.disabled = false;
                buyBtn.textContent = 'Buy';
            }
        }
    }

    async handleProceedPayment() {
        if (!this.selectedMonths) {
            this.notifyUser('Please select a payment duration.');
            return;
        }

        var proceedButton = document.getElementById('proceedPaymentBtn');
        if (proceedButton) {
            proceedButton.disabled = true;
            proceedButton.textContent = 'Processing...';
        }

        try {
            var newEndDate = this.calculateNewEndDate(this.selectedMonths);
            var price = this.getPaymentPrice(this.selectedMonths);

            var response = await this.callPaymentEndpoint({
                paymentType: 'subscription',
                months: this.selectedMonths,
                newEndDate: newEndDate.toISOString().split('T')[0],
                amount: price,
                tier: this.getCurrentTierName()
            });

            if (response.url) {
                window.location.assign(response.url);
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (error) {
            console.error('Payment error:', error);
            this.notifyUser(error?.message || 'Unable to process payment. Please try again.');
            if (proceedButton) {
                proceedButton.disabled = false;
                proceedButton.textContent = 'Pay $' + this.getPaymentPrice(this.selectedMonths).toFixed(2);
            }
        }
    }

    async callPaymentEndpoint(paymentData) {
        var supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        if (!supabaseUrl) {
            throw new Error('Supabase URL is not configured for payments.');
        }

        var session = await supabase.auth.getSession();
        var accessToken = session?.data?.session?.access_token || '';

        // Use current origin for redirect URLs (works for both localhost and production)
        var currentOrigin = window.location.origin;
        paymentData.success_url = currentOrigin + '/dashboard.html?payment=success';
        paymentData.cancel_url = currentOrigin + '/dashboard.html?payment=cancelled';

        if (!accessToken) {
            throw new Error('Your session has expired. Please sign in again.');
        }

        var response = await fetch(supabaseUrl + '/functions/v1/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            var errorMessage = 'Payment request failed';

            try {
                var errorBody = await response.json();
                errorMessage = errorBody.error || errorBody.message || errorMessage;
            } catch (e) {
                try {
                    errorMessage = await response.text() || errorMessage;
                } catch (e2) {
                    // Use default error message
                }
            }

            if (String(errorMessage).toLowerCase().includes('invalid jwt')) {
                errorMessage = 'Your session is no longer valid. Please sign in again and retry payment.';
            }

            throw new Error(errorMessage);
        }

        var result = await response.json();
        return result || {};
    }

    refreshAccordion() {
        var accordion = document.getElementById('changePlanAccordion');
        if (!accordion) return;
        accordion.innerHTML = this.renderTierAccordion(this.getSafeTiers(), this.getCurrentTierName());
    }

    createMakePaymentModal() {
        var existingModal = document.getElementById('makePaymentModal');
        if (existingModal) existingModal.remove();

        var currentPaidTo = this.getCurrentPaidToDate();
        var formattedPaidTo = this.formatDateDisplay(currentPaidTo);
        var isPastDue = new Date(currentPaidTo) < new Date();
        var oneMonthLabel = this.getDurationPriceLabel(1);
        var threeMonthLabel = this.getDurationPriceLabel(3);
        var sixMonthLabel = this.getDurationPriceLabel(6);
        var twelveMonthLabel = this.getDurationPriceLabel(12);

        var modal = document.createElement('div');
        modal.id = 'makePaymentModal';
        modal.className = 'module-modal-overlay';
        modal.innerHTML =
            '<div class="module-modal change-plan-modal-shell" style="max-width: 480px;">' +
                '<div class="change-plan-header">' +
                    '<h2>Make a Payment</h2>' +
                    '<button type="button" class="modal-close" id="makePaymentCloseBtn">✕</button>' +
                '</div>' +

                '<div style="background: ' + (isPastDue ? '#FEF2F2' : '#F0FDF4') + '; border: 1px solid ' + (isPastDue ? '#FECACA' : '#BBF7D0') + '; border-radius: 8px; padding: 16px; margin-bottom: 20px;">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                        '<span style="font-size: 14px; color: #64748B;">Currently Paid To:</span>' +
                        '<span style="font-size: 16px; font-weight: 700; color: ' + (isPastDue ? '#DC2626' : '#16A34A') + ';">' + formattedPaidTo + '</span>' +
                    '</div>' +
                    (isPastDue ? '<p style="font-size: 12px; color: #DC2626; margin-top: 8px; margin-bottom: 0;">Your subscription is past due. Payment will start from today.</p>' : '') +
                '</div>' +

                '<div style="margin-bottom: 20px;">' +
                    '<label style="display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px;">Select Payment Duration</label>' +
                    '<div style="display: flex; flex-direction: column; gap: 8px;">' +
                        '<label class="payment-radio-option" style="display: flex; align-items: center; padding: 14px 16px; border: 2px solid #E5E7EB; border-radius: 10px; cursor: pointer; transition: all 0.15s;">' +
                            '<input type="radio" name="paymentDuration" value="1" style="width: 18px; height: 18px; margin-right: 12px; accent-color: #2A8F8F;">' +
                            '<div style="flex: 1;">' +
                                '<div style="font-weight: 600; color: #1F2937;">1 Month</div>' +
                                '<div style="font-size: 12px; color: #6B7280;">' + this.escapeHtml(oneMonthLabel) + '</div>' +
                            '</div>' +
                        '</label>' +
                        '<label class="payment-radio-option" style="display: flex; align-items: center; padding: 14px 16px; border: 2px solid #E5E7EB; border-radius: 10px; cursor: pointer; transition: all 0.15s;">' +
                            '<input type="radio" name="paymentDuration" value="3" style="width: 18px; height: 18px; margin-right: 12px; accent-color: #2A8F8F;">' +
                            '<div style="flex: 1;">' +
                                '<div style="font-weight: 600; color: #1F2937;">3 Months</div>' +
                                '<div style="font-size: 12px; color: #6B7280;">' + this.escapeHtml(threeMonthLabel) + '</div>' +
                            '</div>' +
                        '</label>' +
                        '<label class="payment-radio-option" style="display: flex; align-items: center; padding: 14px 16px; border: 2px solid #E5E7EB; border-radius: 10px; cursor: pointer; transition: all 0.15s;">' +
                            '<input type="radio" name="paymentDuration" value="6" style="width: 18px; height: 18px; margin-right: 12px; accent-color: #2A8F8F;">' +
                            '<div style="flex: 1;">' +
                                '<div style="font-weight: 600; color: #1F2937;">6 Months</div>' +
                                '<div style="font-size: 12px; color: #6B7280;">' + this.escapeHtml(sixMonthLabel) + '</div>' +
                            '</div>' +
                        '</label>' +
                        '<label class="payment-radio-option" style="display: flex; align-items: center; padding: 14px 16px; border: 2px solid #E5E7EB; border-radius: 10px; cursor: pointer; transition: all 0.15s;">' +
                            '<input type="radio" name="paymentDuration" value="12" style="width: 18px; height: 18px; margin-right: 12px; accent-color: #2A8F8F;">' +
                            '<div style="flex: 1;">' +
                                '<div style="font-weight: 600; color: #1F2937;">12 Months</div>' +
                                '<div style="font-size: 12px; color: #6B7280;">' + this.escapeHtml(twelveMonthLabel) + '</div>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                '</div>' +

                '<div id="paymentPreview" style="display: none; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">' +
                    '<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">' +
                        '<span style="color: #64748B;">New Paid-To Date:</span>' +
                        '<span id="newPaidToDate" style="font-weight: 600; color: #1F2937;">-</span>' +
                    '</div>' +
                    '<div style="display: flex; justify-content: space-between;">' +
                        '<span style="color: #64748B;">Amount:</span>' +
                        '<span id="paymentAmount" style="font-weight: 700; color: #2A8F8F; font-size: 18px;">-</span>' +
                    '</div>' +
                '</div>' +

                '<div style="border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 8px;">' +
                    '<label style="display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px;">Or Buy Prepaid Credits</label>' +
                    '<div style="display: flex; gap: 12px; align-items: center;">' +
                        '<input type="number" id="prepaidCreditsAmount" min="1" max="100" value="5" style="width: 80px; padding: 10px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 14px; text-align: center;">' +
                        '<div style="flex: 1;">' +
                            '<div style="font-size: 14px; color: #374151;">credits × $6.99 each</div>' +
                            '<div style="font-size: 12px; color: #6B7280;">1 credit = 1 module unlock</div>' +
                        '</div>' +
                        '<button type="button" id="buyCreditsBtn" style="padding: 10px 20px; background: #F59E0B; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Buy</button>' +
                    '</div>' +
                    '<div id="creditsTotalPreview" style="text-align: right; margin-top: 8px; font-size: 14px; color: #64748B;">Total: <strong style="color: #F59E0B;">$34.95</strong></div>' +
                '</div>' +

                '<button type="button" id="proceedPaymentBtn" disabled style="width: 100%; margin-top: 20px; padding: 14px; background: #CBD5E1; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: not-allowed;">Select a payment option</button>' +
            '</div>';

        document.body.appendChild(modal);
        this.makePaymentModal = modal;
        this.currentPaidToDate = currentPaidTo;
    }

    getCurrentPaidToDate() {
        var sub = currentSubscription || window.currentSubscription;
        if (sub?.current_period_end) {
            return sub.current_period_end;
        }
        return new Date().toISOString().split('T')[0];
    }

    formatDateDisplay(dateStr) {
        try {
            var date = new Date(dateStr);
            return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

    calculateNewEndDate(months) {
        var currentEnd = new Date(this.currentPaidToDate);
        var today = new Date();
        var startFrom = currentEnd > today ? currentEnd : today;
        var newEnd = new Date(startFrom);
        newEnd.setMonth(newEnd.getMonth() + months);
        return newEnd;
    }

    getCurrentTierConfig() {
        var tiers = this.getSafeTiers();
        var currentTierName = this.getCurrentTierName();
        return tiers.find(function(t) { return t.tier === currentTierName; }) || null;
    }

    getMonthlyTierPrice() {
        var tierConfig = this.getCurrentTierConfig();
        var monthlyPriceCents = Number(tierConfig?.monthly_price_cents);
        return Number.isFinite(monthlyPriceCents) && monthlyPriceCents > 0 ? (monthlyPriceCents / 100) : 19;
    }

    getDiscountRateForMonths(months) {
        var tierConfig = this.getCurrentTierConfig();
        var fallback = { 1: 0, 3: 0.05, 6: 0.10, 12: 0.17 };
        var rawValue = months === 3
            ? tierConfig?.discount_3_month
            : months === 6
                ? tierConfig?.discount_6_month
                : months === 12
                    ? tierConfig?.discount_12_month
                    : 0;

        var value = Number(rawValue);
        if (!Number.isFinite(value) || value <= 0) return fallback[months] || 0;
        return value > 1 ? value / 100 : value;
    }

    getPaymentPrice(months) {
        var monthlyPrice = this.getMonthlyTierPrice();
        var discountRate = this.getDiscountRateForMonths(months);
        return Number((monthlyPrice * months * (1 - discountRate)).toFixed(2));
    }

    getDurationPriceLabel(months) {
        var price = this.getPaymentPrice(months);
        var discountRate = this.getDiscountRateForMonths(months);
        if (discountRate > 0) {
            return '$' + price.toFixed(2) + ' (Save ' + Math.round(discountRate * 100) + '%)';
        }
        return '$' + price.toFixed(2);
    }

    closeModal() {
        if (!this.changePlanModal) return;
        this.changePlanModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    closeMakePaymentModal() {
        if (!this.makePaymentModal) return;
        this.makePaymentModal.classList.remove('active');
        document.body.style.overflow = '';
    }


    notifyUser(message) {
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
            window.showToast(message);
            return;
        }
        showToast(message);
    }

    async handleTierSwitch(tierName, button) {
        var parentUserId = state?.currentUser?.id || window.state?.currentUser?.id;
        var targetTier = String(tierName || '').toLowerCase();

        console.log('[ChangePlan] Tier switch requested', {
            tierName: tierName,
            targetTier: targetTier,
            hasButton: Boolean(button),
            buttonLabel: button?.textContent || null,
            stateUserId: state?.currentUser?.id || null,
            windowStateUserId: window.state?.currentUser?.id || null,
            parentUserId: parentUserId || null,
            subscriptionTier: currentSubscription?.tier || null,
            subscriptionStatus: currentSubscription?.status || null
        });

        if (!parentUserId) {
            console.warn('[ChangePlan] Missing parent user id. Aborting tier switch.');
            this.notifyUser('Unable to switch plans right now. Please refresh and try again.');
            return;
        }

        if (!targetTier) {
            console.warn('[ChangePlan] Missing target tier value. Aborting tier switch.', { tierName: tierName });
            return;
        }

        var originalLabel = button?.textContent || '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Redirecting...';
        }

        try {
            console.log('[ChangePlan] Calling switchStripeSubscriptionPlan', {
                parentUserId: parentUserId,
                targetTier: targetTier
            });
            var result = await switchStripeSubscriptionPlan(targetTier);
            console.log('[ChangePlan] switchStripeSubscriptionPlan result', result);
            if (!result?.url) throw new Error('Stripe checkout URL was not returned.');
            window.location.assign(result.url);
        } catch (error) {
            console.error('Failed to switch subscription tier:', {
                message: error?.message,
                name: error?.name,
                stack: error?.stack,
                details: error,
                targetTier: targetTier,
                parentUserId: parentUserId
            });
            this.notifyUser(error?.message || 'Unable to open Stripe checkout. Please try again.');
            if (button) {
                button.disabled = false;
                button.textContent = originalLabel;
            }
        }
    }

    showCancelConfirmation() {
        var self = this;
        var overlay = document.createElement('div');
        overlay.className = 'module-modal-overlay active';
        overlay.id = 'cancelConfirmModal';
        overlay.innerHTML =
            '<div class="module-modal" style="max-width:400px; padding:28px; text-align:center;">' +
                '<h3 style="margin:0 0 12px; color:#1F2937;">Cancel subscription?</h3>' +
                '<p style="color:#64748B; font-size:14px; margin:0 0 8px;">Your subscription will remain active until the end of your current billing period.</p>' +
                '<p style="color:#64748B; font-size:14px; margin:0 0 20px;">You can resubscribe anytime.</p>' +
                '<div style="display:flex; gap:10px; justify-content:center;">' +
                    '<button type="button" id="cancelConfirmKeep" class="profile-action-btn" style="flex:1;">Keep subscription</button>' +
                    '<button type="button" id="cancelConfirmYes" class="profile-action-btn" style="flex:1; background:#DC2626; color:white; border-color:#DC2626;">Cancel</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        overlay.querySelector('#cancelConfirmKeep').addEventListener('click', function() {
            overlay.remove();
            document.body.style.overflow = '';
        });

        overlay.querySelector('#cancelConfirmYes').addEventListener('click', function() {
            var btn = overlay.querySelector('#cancelConfirmYes');
            self.handleSubscriptionAction('cancel', btn, function() {
                overlay.remove();
                document.body.style.overflow = '';
            });
        });

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
                document.body.style.overflow = '';
            }
        });
    }

    showPauseConfirmation() {
        var self = this;
        var overlay = document.createElement('div');
        overlay.className = 'module-modal-overlay active';
        overlay.id = 'pauseConfirmModal';
        overlay.innerHTML =
            '<div class="module-modal" style="max-width:400px; padding:28px; text-align:center;">' +
                '<h3 style="margin:0 0 12px; color:#1F2937;">Pause subscription?</h3>' +
                '<p style="color:#64748B; font-size:14px; margin:0 0 20px;">Billing will be paused and you won\'t be charged. You can resume anytime.</p>' +
                '<div style="display:flex; gap:10px; justify-content:center;">' +
                    '<button type="button" id="pauseConfirmBack" class="profile-action-btn" style="flex:1;">Go back</button>' +
                    '<button type="button" id="pauseConfirmYes" class="profile-action-btn" style="flex:1; background:#F59E0B; color:white; border-color:#F59E0B;">Pause</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        overlay.querySelector('#pauseConfirmBack').addEventListener('click', function() {
            overlay.remove();
            document.body.style.overflow = '';
        });

        overlay.querySelector('#pauseConfirmYes').addEventListener('click', function() {
            var btn = overlay.querySelector('#pauseConfirmYes');
            self.handleSubscriptionAction('pause', btn, function() {
                overlay.remove();
                document.body.style.overflow = '';
            });
        });

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
                document.body.style.overflow = '';
            }
        });
    }

    async handleSubscriptionAction(action, button, onComplete) {
        var originalLabel = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Processing...';
        }

        try {
            await manageSubscription(action);

            // Update local state
            if (action === 'cancel') {
                if (currentSubscription) currentSubscription.cancel_at_period_end = true;
                this.notifyUser('Your subscription will be cancelled at the end of the billing period.');
            } else if (action === 'pause') {
                if (currentSubscription) currentSubscription.status = 'paused';
                this.notifyUser('Your subscription has been paused.');
            } else if (action === 'resume') {
                if (currentSubscription) {
                    currentSubscription.status = 'active';
                    currentSubscription.cancel_at_period_end = false;
                }
                this.notifyUser('Your subscription is active again!');
            }

            if (onComplete) onComplete();
            this.render();
            this.attachSectionListeners();
            // Re-open the plan section
            var planToggle = this.container.querySelector('[data-section="plan"]');
            if (planToggle) planToggle.click();
        } catch (error) {
            console.error('Subscription action failed:', error);
            this.notifyUser(error?.message || 'Something went wrong. Please try again.');
            if (button) {
                button.disabled = false;
                button.textContent = originalLabel;
            }
        }
    }

    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        var div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }
}

// Initialize and export
window.ModuleGallery = ModuleGallery;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    var checkAndInit = function() {
        var container = document.getElementById('moduleGalleryContainer');
        if (container) {
            var gallery = new ModuleGallery('moduleGalleryContainer');
            gallery.init();
            window.moduleGallery = gallery;
            return true;
        }
        return false;
    };

    window.addEventListener('dashboardDataReady', checkAndInit);
    checkAndInit();
});
