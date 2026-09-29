import { Router } from 'express';
import {
  createSubmission,
  getSubmissionById,
  updateSubmission,
  finalizeSubmission,
  listSubmissions,
  deleteSubmission,
} from '../controllers/submissionController';

const router = Router();

/**
 * Form Submission REST Endpoints
 *
 * Base path: /api/submissions
 */

// POST /api/submissions - Create a new submission or draft
router.post('/', createSubmission);

// GET /api/submissions - List submissions (optional query filters: formId, status)
router.get('/', listSubmissions);

// GET /api/submissions/:id - Retrieve an existing submission by MongoDB ID
router.get('/:id', getSubmissionById);

// PATCH /api/submissions/:id - Incrementally update submission data or status
router.patch('/:id', updateSubmission);

// POST /api/submissions/:id/submit - Finalize submission with dynamic schema validation
router.post('/:id/submit', finalizeSubmission);

// DELETE /api/submissions/:id - Delete submission draft
router.delete('/:id', deleteSubmission);

export default router;
