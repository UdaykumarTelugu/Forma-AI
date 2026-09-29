import { GoogleGenerativeAI } from '@google/generative-ai';
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
  constructor(
    message = 'Gemini API key is not configured. Please set GEMINI_API_KEY in server environment.'
  ) {
    super(message);
    this.name = 'LLMConfigurationError';
  }
}

/**
 * Fallback system prompt for legacy/unspecified extraction definitions.
 */
const DEFAULT_SYSTEM_PROMPT = `You are a precision AI data extraction engine for the Forma AI platform.

Extract only facts directly supported by the user's text.

If a field is not mentioned or cannot be determined directly from the text, return null.

Do NOT guess, assume, infer, or invent information.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside the JSON object.`;

/**
 * Service responsible for LLM-powered structured claim extraction.
 *
 * Uses Google Gemini for AI extraction while preserving the existing
 * Forma AI API contract and schema-driven extraction architecture.
 */
export class LLMExtractionService {
  /**
   * Evaluates whether Gemini credentials are configured.
   */
  public isConfigured(): boolean {
    return Boolean(
      ENV.GEMINI_API_KEY &&
        ENV.GEMINI_API_KEY.trim() !== '' &&
        ENV.GEMINI_API_KEY !== 'your_gemini_api_key_here'
    );
  }

  /**
   * Creates a Gemini model instance.
   */
  private getModel() {
    if (!this.isConfigured()) {
      throw new LLMConfigurationError();
    }

    const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);

    return genAI.getGenerativeModel({
      model: ENV.GEMINI_MODEL,
    });
  }

  /**
   * Extracts structured claim facts from unstructured natural language text.
   *
   * The MongoDB form schema remains the source of truth for allowed fields.
   */
  public async extractClaimData(
    text: string,
    extractionDef?: FormExtractionDefinition
  ): Promise<ClaimExtractionResult> {
    const model = this.getModel();

    if (extractionDef && Object.keys(extractionDef.fields).length > 0) {
      const dynamicSchema =
        extractionSchemaService.generateExtractionZodSchema(extractionDef);

      const dynamicPrompt =
        extractionSchemaService.generateExtractionPrompt(extractionDef);

      const prompt = `${dynamicPrompt}

OUTPUT REQUIREMENTS:
- Return ONLY a JSON object.
- Every schema field must be present in the JSON object.
- Use null when the information is not explicitly present.
- Do not create additional fields.
- Do not guess values.

USER CLAIM:
${text}`;

      const response = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.response.text().trim();

      let rawOutput: unknown;

      try {
        rawOutput = JSON.parse(responseText);
      } catch {
        throw new Error(
          'Gemini returned invalid JSON for claim extraction.'
        );
      }

      const parsed = dynamicSchema.parse(rawOutput) as Record<
        string,
        unknown
      >;

      // Strict safety filter: only fields defined by the form schema
      // and only non-null values are returned to the frontend.
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

    /**
     * Fallback static schema extraction.
     */
    const prompt = `${DEFAULT_SYSTEM_PROMPT}

EXPECTED FIELDS:
- incidentType
- incidentDate
- incidentDescription
- animalSpecies
- animalDamageConfirmed
- wildlifeReportNumber
- otherVehicleInvolved
- otherVehicleMake
- otherVehicleModel
- vehicleMake
- vehicleModel
- vehicleYear
- damageType
- damageDescription

Return these fields as JSON.
Use null for fields that are not mentioned.

USER CLAIM:
${text}`;

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.response.text().trim();

    let rawOutput: unknown;

    try {
      rawOutput = JSON.parse(responseText);
    } catch {
      throw new Error(
        'Gemini returned invalid JSON for claim extraction.'
      );
    }

    const validatedOutput: ValidatedClaimExtraction =
      claimExtractionSchema.parse(rawOutput);

    const result: ClaimExtractionResult = {};

    for (const [key, value] of Object.entries(validatedOutput)) {
      if (
        value !== null &&
        value !== undefined &&
        value !== ''
      ) {
        result[key] = value;
      }
    }

    return result;
  }
}

export const llmExtractionService = new LLMExtractionService();

export default llmExtractionService;
