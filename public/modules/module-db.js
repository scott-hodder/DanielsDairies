// Module Database Integration
import { getChild, awardStars, updateChildStars, completeModule, getModules } from '../src/database.js';
import { supabase } from '../src/supabaseClient.js';

// Global state
export let currentChild = null;
export let childId = null;

// Initialize module with child data
export async function initializeModule(workbookId) {
    // Get childId from URL
    const urlParams = new URLSearchParams(window.location.search);
    childId = urlParams.get('childId');
    
    if (!childId) {
        alert('No child selected. Redirecting to dashboard...');
        window.location.href = '/dashboard.html';
        return null;
    }
    
    try {
        // Fetch child data from database
        currentChild = await getChild(childId);
        
        // Update header with child's name
        const headerSubtitle = document.getElementById('headerSubtitle');
        if (headerSubtitle && currentChild.name) {
            headerSubtitle.textContent = `${currentChild.name}'s Journey`;
        }
        
        return currentChild;
    } catch (error) {
        console.error('Error loading child data:', error);
        alert('Failed to load child data. Please try again.');
        window.location.href = '/dashboard.html';
        return null;
    }
}

// Load stars from database
export async function loadStarsFromDB() {
    try {
        if (childId) {
            currentChild = await getChild(childId);
            return currentChild.stars || 0;
        }
    } catch (error) {
        console.error('Error loading stars:', error);
    }
    return 0;
}

// Save stars to database
export async function saveStarsToDB(totalStars) {
    try {
        if (childId) {
            await updateChildStars(childId, totalStars);

        }
    } catch (error) {
        console.error('Error saving stars to database:', error);
        throw error;
    }
}

// Award a single star (increment by 1)
export async function awardSingleStar() {
    try {
        if (childId) {
            const updatedChild = await awardStars(childId, 1);
            currentChild = updatedChild;
            return updatedChild.stars;
        }
    } catch (error) {
        console.error('Error awarding star:', error);
        throw error;
    }
    return 0;
}

// Get child name
export function getChildName() {
    return currentChild?.name || '';
}

// Get child ID
export function getChildId() {
    return childId;
}

// Resolve a friendly display name for the child with sensible fallbacks
export function resolveChildDisplayName(options = {}) {
    const {
        preferredName = '',
        fallback = 'Your Name'
    } = options || {};

    if (preferredName && preferredName.trim()) {
        return preferredName.trim();
    }

    const childName = getChildName();
    if (childName?.trim()) {
        return childName.trim();
    }

    try {
        if (typeof window !== 'undefined') {
            const stored = window.localStorage?.getItem('moduleChildName');
            if (stored && stored.trim()) {
                return stored.trim();
            }
        }
    } catch (err) {
        console.warn('resolveChildDisplayName: localStorage not accessible', err);
    }

    return fallback;
}

// Complete module
export async function completeModuleDB(moduleCode) {
    try {
        if (!childId) {
            throw new Error('No child ID available');
        }
        
        // Get module ID from code (e.g., 'FM-M1' -> module with code 'FM-M1')
        const { data: module, error: moduleError } = await supabase
            .from('modules')
            .select('id')
            .eq('code', moduleCode)
            .maybeSingle();
        
        if (moduleError) {
            console.error('Database error:', moduleError);
            throw new Error(`Database error: ${moduleError.message}`);
        }
        
        if (!module) {
            throw new Error(`Module with code "${moduleCode}" not found in database. Please add it to the modules table first.`);
        }
        
        const moduleId = module.id;
        await completeModule(childId, moduleId);
        

        return true;
    } catch (error) {
        console.error('Error completing module:', error);
        throw error;
    }
}
