# Forma AI — Architecture Overview

This document describes the high-level system architecture for **Forma AI — AI-Augmented Dynamic Form Engine**, covering current foundational layers and the planned AI extraction pipeline.

---

## 1. System Architecture

The core application follows a modern decoupled client-server architecture with a shared type contract:

```text
React (Vite + TypeScript)
          ↓
   Axios HTTP Client
          ↓
  REST API Endpoints
          ↓
Node.js + Express Server
          ↓
  Mongoose ODM Layer
          ↓
    MongoDB Database
```

### Architectural Layers

1. **Client Layer (`client/`)**
   - **Framework**: React 18+ with TypeScript bundled via Vite.
   - **Form Management**: React Hook Form manages dynamic field registration, values, and client-side validation.
   - **State Management**: Zustand manages active form metadata, schema loading state, and extracted data staging.
   - **Component Hierarchy**:
     - `DynamicForm`: Root coordinator managing form lifecycle and submission.
     - `FormSection`: Renders logical groups of fields.
     - `FieldRenderer`: Dynamic factory rendering specific field components based on `fieldType`.
     - `ConditionalField`: Evaluates conditional visibility rules against real-time form state.
     - Field Components: Specialized inputs (`TextField`, `NumberField`, `SelectField`, `CheckboxField`, `DateField`, `TextareaField`).

2. **API & Server Layer (`server/`)**
   - **Runtime**: Node.js with Express and TypeScript.
   - **Validation**: Zod validates incoming payloads before controllers execute business logic.
   - **Services**: Decoupled service layer (`formService`, `submissionService`) encapsulating data access and operations.
   - **Models**: Mongoose schemas defining MongoDB document structure for forms and submissions.

3. **Data Layer (`MongoDB`)**
   - **FormSchemas**: Stores schema definitions, version history, sections, and field configurations.
   - **FormSubmissions**: Stores submitted data payloads, submission status (draft, submitted, processed), and timestamps.

4. **Shared Layer (`shared/`)**
   - Single source of truth for TypeScript types and interfaces (`FormSchema`, `FormField`, `FieldType`, `ValidationRule`, `ConditionalRule`).
   - Ensures type safety across network boundaries without duplicating type definitions.

---

## 2. Planned AI Extraction Pipeline

The future AI pipeline allows unstructured natural language (e.g., customer narratives, claim descriptions, incident notes) to be automatically converted into structured form data:

```text
Natural Language Input (Narrative / Audio Transcript / Document)
                            ↓
             LangChain + LLM Provider (e.g., OpenAI / Gemini)
                            ↓
               Structured JSON Extraction
                            ↓
             Schema Validation (Zod Validation)
                            ↓
          Hydration into React Hook Form State
                            ↓
    Evaluation of Dynamic Form Conditional Logic
                            ↓
        Interactive User Review and Submission
```

### AI Pipeline Stages

1. **Input Ingestion**: User provides free-text narrative, voice transcript, or document text.
2. **LLM Extraction**: An extraction prompt guided by the active `FormSchema` instructs the LLM to extract field values matching schema types and constraints.
3. **Structured Validation**: The extracted JSON is validated against Zod validators matching the form schema rules to ensure data types, formats, and ranges are strictly adhered to.
4. **Form Hydration**: Validated fields are pre-populated into React Hook Form state, highlighting filled fields for user awareness.
5. **Conditional Evaluation**: Dynamic conditions are immediately recalculated to reveal or hide dependent sections based on the extracted answers.
6. **User Review**: The user reviews, modifies, or confirms the pre-filled form before final submission.
