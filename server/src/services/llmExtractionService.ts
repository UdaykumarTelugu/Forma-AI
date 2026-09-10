import { ChatOpenAI } from '@langchain/openai';
import { ENV } from '../config/env';
import {
  claimExtractionSchema,
  ValidatedClaimExtraction,
} from '../validators/claimExtractionValidator';
import {
  extractionSchemaService,
  FormExtractionDefinition,
} from './extractionSchemaService';
import { ClaimExtractionResult } from '../types/ai';

/**
 * Custom error thrown when the LLM service lacks required API configuration.
 */
export class LLMConfigurationError extends Error {
  constructor(message = 'OpenAI API key is not configured. Please set OPENAI_API_KEY in server environment.') {
    super(message);
    this.name = 'LLMConfigurationError';
  }
}

/**
 * Fallback system prompt for legacy/unspecified extraction definitions.
 */
const DEFAULT_SYSTEM_PROMPT = `You are a precision AI data extraction engine for the Forma AI platform.
Extract only facts directly supported by the text. If a field is not mentioned, OMIT it.
Do NOT invent or extrapolate unmentioned details. Return strictly valid structured data.`;

/**
 * Service responsible for LLM-powered structured claim extraction.
 * Supports dynamic schema-driven extraction definitions derived directly from MongoDB FormSchemas.
 */
export class LLMExtractionService {
  /**
   * Evaluates whether the LLM service has valid credentials configured.
   */
  public isConfigured(): boolean {
    return Boolean(
      ENV.OPENAI_API_KEY &&
        ENV.OPENAI_API_KEY.trim() !== '' &&
        ENV.OPENAI_API_KEY !== 'your_openai_api_key_here'
    );
  }

  /**
   * Extracts structured claim facts from unstructured natural language text.
   * Derives allowed fields, select options, and validation rules from the provided FormExtractionDefinition.
   *
   * @param text Raw unstructured text input provided by the claimant
   * @param extractionDef Optional schema-derived extraction definition. If omitted, uses fallback static schema.
   * @returns Validated ClaimExtractionResult
   * @throws LLMConfigurationError if OPENAI_API_KEY is not configured
   */
  public async extractClaimData(
    text: string,
    extractionDef?: FormExtractionDefinition
  ): Promise<ClaimExtractionResult> {
    if (!this.isConfigured()) {
      throw new LLMConfigurationError();
    }

    const model = new ChatOpenAI({
      modelName: ENV.OPENAI_MODEL,
      openAIApiKey: ENV.OPENAI_API_KEY,
      configuration: ENV.OPENAI_BASE_URL ? { baseURL: ENV.OPENAI_BASE_URL } : undefined,
      temperature: 0,
      maxRetries: 2,
    });

    if (extractionDef && Object.keys(extractionDef.fields).length > 0) {
      // Dynamic schema-driven extraction
      const dynamicSchema = extractionSchemaService.generateExtractionZodSchema(extractionDef);
      const dynamicPrompt = extractionSchemaService.generateExtractionPrompt(extractionDef);

      const structuredLlm = model.withStructuredOutput(dynamicSchema, {
        name: 'extract_schema_claim',
      });

      const rawOutput = await structuredLlm.invoke([
        { role: 'system', content: dynamicPrompt },
        { role: 'user', content: text },
      ]);

      const parsed = dynamicSchema.parse(rawOutput) as Record<string, unknown>;

      // Strict safety filter: ensure ONLY fields defined in the schema are returned
      const result: ClaimExtractionResult = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (
          key in extractionDef.fields &&
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {
          result[key] = value;
        }
      }

      return result;
    }

    // Fallback static schema extraction
    const structuredLlm = model.withStructuredOutput(claimExtractionSchema, {
      name: 'extract_insurance_claim',
    });

    const rawOutput = await structuredLlm.invoke([
      { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ]);

    const validatedOutput: ValidatedClaimExtraction = claimExtractionSchema.parse(rawOutput);
    return validatedOutput;
  }
}

export const llmExtractionService = new LLMExtractionService();
export default llmExtractionService;
