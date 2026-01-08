// Module Responses Helper Functions
// Handles saving and loading children's answers to/from Supabase

import { supabase } from '../src/supabaseClient.js';

/**
 * Save a response to the database
 * @param {string} childId - The child's ID
 * @param {string} moduleId - The module's ID
 * @param {string} pageId - Unique identifier for the question/page
 * @param {string} questionText - The actual question text
 * @param {any} responseData - The answer (can be string, array, object, etc.)
 * @param {string} responseType - Type of response ('text', 'multiple_choice', 'checkbox', etc.)
 */
export async function saveResponse(childId, moduleId, pageId, questionText, responseData, responseType = 'text') {
    try {
        const { data, error } = await supabase
            .from('module_responses')
            .upsert({
                child_id: childId,
                module_id: moduleId,
                page_id: pageId,
                question_text: questionText,
                response_data: responseData,
                response_type: responseType,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'child_id,module_id,page_id'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving response:', error);
        throw error;
    }
}

/**
 * Load a specific response
 * @param {string} childId - The child's ID
 * @param {string} moduleId - The module's ID
 * @param {string} pageId - Unique identifier for the question/page
 */
export async function loadResponse(childId, moduleId, pageId) {
    try {
        const { data, error } = await supabase
            .from('module_responses')
            .select('*')
            .eq('child_id', childId)
            .eq('module_id', moduleId)
            .eq('page_id', pageId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        return data?.response_data || null;
    } catch (error) {
        console.error('Error loading response:', error);
        return null;
    }
}

/**
 * Load all responses for a child in a specific module
 * @param {string} childId - The child's ID
 * @param {string} moduleId - The module's ID
 */
export async function loadAllModuleResponses(childId, moduleId) {
    try {
        const { data, error } = await supabase
            .from('module_responses')
            .select('*')
            .eq('child_id', childId)
            .eq('module_id', moduleId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Convert to object with pageId as keys
        const responses = {};
        data.forEach(response => {
            responses[response.page_id] = response.response_data;
        });

        return responses;
    } catch (error) {
        console.error('Error loading module responses:', error);
        return {};
    }
}

/**
 * Load all responses for a child across all modules
 * @param {string} childId - The child's ID
 */
export async function loadAllChildResponses(childId) {
    try {
        const { data, error } = await supabase
            .from('module_responses')
            .select(`
                *,
                modules (
                    title,
                    code
                )
            `)
            .eq('child_id', childId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error loading child responses:', error);
        return [];
    }
}

/**
 * Delete a specific response
 * @param {string} childId - The child's ID
 * @param {string} moduleId - The module's ID
 * @param {string} pageId - Unique identifier for the question/page
 */
export async function deleteResponse(childId, moduleId, pageId) {
    try {
        const { error } = await supabase
            .from('module_responses')
            .delete()
            .eq('child_id', childId)
            .eq('module_id', moduleId)
            .eq('page_id', pageId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting response:', error);
        throw error;
    }
}

/**
 * Get module ID from module code
 * @param {string} moduleCode - The module code (e.g., 'MODULE1')
 */
export async function getModuleIdFromCode(moduleCode) {
    try {
        const { data, error } = await supabase
            .from('modules')
            .select('id')
            .eq('code', moduleCode)
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Error getting module ID:', error);
        throw error;
    }
}

/**
 * Helper function to save form data with automatic type detection
 * @param {string} childId - The child's ID
 * @param {string} moduleCode - The module code
 * @param {string} pageId - Page identifier
 * @param {string} questionText - Question text
 * @param {any} value - The answer value
 */
export async function saveFormResponse(childId, moduleCode, pageId, questionText, value) {
    try {
        const moduleId = await getModuleIdFromCode(moduleCode);
        
        // Detect response type
        let responseType = 'text';
        let responseData = value;

        if (Array.isArray(value)) {
            responseType = 'multiple_choice';
        } else if (typeof value === 'boolean') {
            responseType = 'checkbox';
        } else if (typeof value === 'object') {
            responseType = 'complex';
        }

        await saveResponse(childId, moduleId, pageId, questionText, responseData, responseType);
    } catch (error) {
        console.error('Error saving form response:', error);
        // Fallback to localStorage if database fails
        localStorage.setItem(`response_${childId}_${moduleCode}_${pageId}`, JSON.stringify(value));
    }
}

/**
 * Helper function to load form data
 * @param {string} childId - The child's ID
 * @param {string} moduleCode - The module code
 * @param {string} pageId - Page identifier
 */
export async function loadFormResponse(childId, moduleCode, pageId) {
    try {
        const moduleId = await getModuleIdFromCode(moduleCode);
        return await loadResponse(childId, moduleId, pageId);
    } catch (error) {
        console.error('Error loading form response:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem(`response_${childId}_${moduleCode}_${pageId}`);
        return stored ? JSON.parse(stored) : null;
    }
}
