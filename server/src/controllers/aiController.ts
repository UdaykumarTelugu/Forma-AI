import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { extractClaimRequestSchema } from '../validators/claimExtractionValidator';
import {
  llmExtractionService,
  LLMConfigurationError,
} from '../services/llmExtractionService';
import { formService } from '../services/formService';
import { extractionSchemaService } from '../services/extractionSchemaService';
import { ExtractClaimResponse } from '../types/ai';

/**
 * Controller handling AI extraction endpoints.
 */
export class AIController {
  /**
   * POST /api/ai/extract
   *
   * Converts raw natural language claim description into structured JSON facts
   * dynamically grounded in the active MongoDB FormSchema.
   */
  public async extractClaim(
    req: Request,
    res: Response<ExtractClaimResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      // 1. Validate inbound request body
      const parseResult = extractClaimRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const message = parseResult.error.errors.map((e) => e.message).join('; ');
        res.status(400).json({
          success: false,
          error: {
            message,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const { text, schemaId } = parseResult.data;
      const targetSchemaId = schemaId || 'auto-insurance-claim';

      // 2. Load schema from MongoDB to drive extraction definitions
      const formSchema = await formService.findLatestFormSchema(targetSchemaId);
      if (!formSchema) {
        res.status(404).json({
          success: false,
          error: {
            message: `Form schema '${targetSchemaId}' was not found.`,
            code: 'SCHEMA_NOT_FOUND',
          },
        });
        return;
      }

      // 3. Derive dynamic extraction definition from MongoDB schema
      const extractionDef = extractionSchemaService.createExtractionDefinition(formSchema);

      // 4. Execute extraction via service layer using dynamic schema
      const extractedData = await llmExtractionService.extractClaimData(text, extractionDef);

      res.status(200).json({
        success: true,
        data: extractedData,
      });
    } catch (error) {
      if (error instanceof LLMConfigurationError) {
        res.status(503).json({
          success: false,
          error: {
            message: error.message,
            code: 'AI_SERVICE_UNAVAILABLE',
          },
        });
        return;
      }

      if (error instanceof ZodError) {
        res.status(502).json({
          success: false,
          error: {
            message: 'LLM generated output failed schema validation',
            code: 'EXTRACTION_SCHEMA_MISMATCH',
          },
        });
        return;
      }

      next(error);
    }
  }
}

export const aiController = new AIController();
export default aiController;
