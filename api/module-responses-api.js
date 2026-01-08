// Module Response API Endpoints
// Add these to your existing API server or create a new file

import { saveModuleResponse, getModuleResponses, getChildResponses, updateModuleResponse, deleteModuleResponse } from '../src/database.js'

// POST /api/module-responses - Save a new response
export async function handleSaveModuleResponse(req, res) {
  try {
    const {
      childId,
      moduleId,
      parentUserId,
      questionText,
      responseType,
      responseValue,
      responseOptions,
      selectedOption,
      pageNumber,
      questionOrder,
      responseTimeMs,
      isCorrect
    } = req.body

    // Validate required fields
    if (!childId || !moduleId || !parentUserId || !questionText || !responseType) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const savedResponse = await saveModuleResponse({
      childId,
      moduleId,
      parentUserId,
      questionText,
      responseType,
      responseValue,
      responseOptions,
      selectedOption,
      pageNumber,
      questionOrder,
      responseTimeMs,
      isCorrect
    })

    res.status(201).json(savedResponse)
  } catch (error) {
    console.error('Error saving module response:', error)
    res.status(500).json({ error: 'Failed to save response' })
  }
}

// GET /api/module-responses/:childId/:moduleId - Get responses for specific child and module
export async function handleGetModuleResponses(req, res) {
  try {
    const { childId, moduleId } = req.params

    const responses = await getModuleResponses(childId, moduleId)
    res.json(responses)
  } catch (error) {
    console.error('Error getting module responses:', error)
    res.status(500).json({ error: 'Failed to get responses' })
  }
}

// GET /api/module-responses/child/:childId - Get all responses for a child
export async function handleGetChildResponses(req, res) {
  try {
    const { childId } = req.params

    const responses = await getChildResponses(childId)
    res.json(responses)
  } catch (error) {
    console.error('Error getting child responses:', error)
    res.status(500).json({ error: 'Failed to get child responses' })
  }
}

// PUT /api/module-responses/:id - Update a response
export async function handleUpdateModuleResponse(req, res) {
  try {
    const { id } = req.params
    const updates = req.body

    const updatedResponse = await updateModuleResponse(id, updates)
    res.json(updatedResponse)
  } catch (error) {
    console.error('Error updating module response:', error)
    res.status(500).json({ error: 'Failed to update response' })
  }
}

// DELETE /api/module-responses/:id - Delete a response
export async function handleDeleteModuleResponse(req, res) {
  try {
    const { id } = req.params

    await deleteModuleResponse(id)
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting module response:', error)
    res.status(500).json({ error: 'Failed to delete response' })
  }
}
