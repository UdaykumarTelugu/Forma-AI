import { Router } from 'express';
import {
  listForms,
  getLatestForm,
  getFormVersion,
  getFormVersions,
} from '../controllers/formController';

const router = Router();

/**
 * Form Schema REST Endpoints
 *
 * Base path: /api/forms
 */

// GET /api/forms - List all available form schemas
router.get('/', listForms);

// GET /api/forms/:schemaId/versions - List available version numbers for a schema
router.get('/:schemaId/versions', getFormVersions);

// GET /api/forms/:schemaId/versions/:version - Get a specific version of a schema
router.get('/:schemaId/versions/:version', getFormVersion);

// GET /api/forms/:schemaId - Get the latest version of a schema
router.get('/:schemaId', getLatestForm);

export default router;
