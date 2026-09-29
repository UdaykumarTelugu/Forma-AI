import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  submissionService,
  SubmissionValidationError,
  SubmissionStateError,
} from '../services/submissionService';

/**
 * Submission Controller
 *
 * Exposes REST endpoints for the claim submission lifecycle:
 * - POST   /api/submissions            Create submission (draft or initial)
 * - GET    /api/submissions            List submissions (filtered query)
 * - GET    /api/submissions/:id        Get submission by MongoDB ObjectId
 * - PATCH  /api/submissions/:id        Incrementally update form data / status
 * - POST   /api/submissions/:id/submit Finalize submission with dynamic validation
 */

// POST /api/submissions
export const createSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const submission = await submissionService.createSubmission(req.body);
    res.status(201).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.errors.map((e) => e.message).join('; ');
      res.status(400).json({
        success: false,
        error: {
          message,
        },
      });
      return;
    }
    next(error);
  }
};

// GET /api/submissions/:id
export const getSubmissionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const submission = await submissionService.getSubmissionById(id);

    if (!submission) {
      res.status(404).json({
        success: false,
        error: {
          message: `Submission with ID '${id}' not found.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/submissions/:id
export const updateSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const submission = await submissionService.updateSubmission(id, req.body);

    if (!submission) {
      res.status(404).json({
        success: false,
        error: {
          message: `Submission with ID '${id}' not found.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.errors.map((e) => e.message).join('; ');
      res.status(400).json({
        success: false,
        error: {
          message,
        },
      });
      return;
    }
    if (
      error instanceof SubmissionStateError ||
      (error as { status?: number }).status === 400
    ) {
      res.status(400).json({
        success: false,
        error: {
          message: (error as Error).message,
        },
      });
      return;
    }
    next(error);
  }
};

// POST /api/submissions/:id/submit
export const finalizeSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify existence to return clean 404 when record is not found
    const existing = await submissionService.getSubmissionById(id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: {
          message: `Submission with ID '${id}' not found.`,
        },
      });
      return;
    }

    const submission = await submissionService.finalizeSubmission(id);

    res.status(200).json({
      success: true,
      data: submission,
      submissionId: submission?._id,
      status: submission?.status,
    });
  } catch (error) {
    if (
      error instanceof SubmissionValidationError ||
      (error as { status?: number }).status === 400
    ) {
      res.status(400).json({
        success: false,
        error: {
          message: (error as Error).message,
        },
      });
      return;
    }
    next(error);
  }
};

// GET /api/submissions
export const listSubmissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const formId = req.query.formId as string | undefined;
    const status = req.query.status as string | undefined;

    const submissions = await submissionService.listSubmissions({
      formId,
      status,
    });

    res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/submissions/:id
export const deleteSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await submissionService.deleteSubmission(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          message: `Submission with ID '${id}' not found.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Submission '${id}' deleted successfully.`,
    });
  } catch (error) {
    if (
      error instanceof SubmissionStateError ||
      (error as { status?: number }).status === 400
    ) {
      res.status(400).json({
        success: false,
        error: {
          message: (error as Error).message,
        },
      });
      return;
    }
    next(error);
  }
};

