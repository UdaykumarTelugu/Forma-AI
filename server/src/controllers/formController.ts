import { Request, Response, NextFunction } from 'express';
import { formService } from '../services/formService';

/**
 * Form Controller
 *
 * Thin controller layer handling HTTP request parsing, input validation,
 * service invocation, and uniform JSON response formatting.
 */

// GET /api/forms
export const listForms = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const forms = await formService.listFormSchemas();
    res.status(200).json({
      success: true,
      data: forms,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/forms/:schemaId
export const getLatestForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schemaId = req.params.schemaId?.trim();

    if (!schemaId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Schema ID parameter is required.',
        },
      });
      return;
    }

    // Support optional ?version= query parameter for backward compatibility
    const versionQuery = req.query.version as string | undefined;
    let version: number | undefined;

    if (versionQuery !== undefined) {
      const parsed = Number(versionQuery);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid version parameter. Version must be a positive integer.',
          },
        });
        return;
      }
      version = parsed;
    }

    const form = await formService.findFormSchema(schemaId, version);

    if (!form) {
      const versionInfo = version ? ` version ${version}` : '';
      res.status(404).json({
        success: false,
        error: {
          message: `Form schema '${schemaId}'${versionInfo} not found.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: form,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/forms/:schemaId/versions/:version
export const getFormVersion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schemaId = req.params.schemaId?.trim();
    const versionParam = req.params.version;

    if (!schemaId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Schema ID parameter is required.',
        },
      });
      return;
    }

    const versionNum = Number(versionParam);
    if (!Number.isInteger(versionNum) || versionNum <= 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid version parameter. Version must be a positive integer.',
        },
      });
      return;
    }

    const form = await formService.findFormSchema(schemaId, versionNum);

    if (!form) {
      res.status(404).json({
        success: false,
        error: {
          message: `Form schema '${schemaId}' version ${versionNum} not found.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: form,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/forms/:schemaId/versions
export const getFormVersions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schemaId = req.params.schemaId?.trim();

    if (!schemaId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Schema ID parameter is required.',
        },
      });
      return;
    }

    const versions = await formService.getFormVersions(schemaId);

    if (!versions || versions.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: `Form schema '${schemaId}' not found.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: versions,
    });
  } catch (error) {
    next(error);
  }
};

// Backward-compatible export aliases
export const getForms = listForms;
export const getFormById = getLatestForm;
