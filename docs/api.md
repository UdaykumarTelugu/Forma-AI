# Forma AI — API Specification

This document details the planned REST API endpoints for **Forma AI**, outlining their purpose, HTTP method, path, request payloads, and response structures.

---

## 1. System Endpoints

### Health Check
- **Endpoint**: `GET /api/health`
- **Purpose**: Verifies that the API server is operational and database connectivity is established.
- **Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-09T12:00:00.000Z",
    "uptime": 120.45,
    "database": "connected"
  }
  ```

---

## 2. Form Schema Endpoints

### List Forms
- **Endpoint**: `GET /api/forms`
- **Purpose**: Retrieves a list of all active form schemas (summary metadata).
- **Response**:
  ```json
  [
    {
      "id": "form-claim-auto-v1",
      "title": "Automobile Insurance Claim",
      "description": "Vehicle incident report form",
      "version": 1,
      "updatedAt": "2026-09-01T10:00:00.000Z"
    }
  ]
  ```

### Get Form by ID
- **Endpoint**: `GET /api/forms/:formId`
- **Purpose**: Fetches the complete form schema definition (including sections, fields, validations, and conditional rules) for rendering.
- **Parameters**: `formId` (string, path)
- **Response**: Returns the full `FormSchema` JSON object.

### Get Form Versions
- **Endpoint**: `GET /api/forms/:formId/versions`
- **Purpose**: Retrieves version history for a specific form schema.
- **Parameters**: `formId` (string, path)
- **Response**:
  ```json
  [
    { "version": 1, "createdAt": "2026-08-01T00:00:00.000Z" },
    { "version": 2, "createdAt": "2026-09-01T00:00:00.000Z" }
  ]
  ```

---

## 3. AI Extraction Endpoints (Future)

### Extract Structured Form Data
- **Endpoint**: `POST /api/extraction/extract`
- **Purpose**: Accepts unstructured natural language text and uses an LLM to extract field values aligned with a specified form schema.
- **Request Body**:
  ```json
  {
    "formId": "form-claim-auto-v1",
    "text": "My name is Jane Doe and on Sept 5th I had an accident with another car on Main St. Damage was about $1500. I reported it to the police, report number RPT-987654."
  }
  ```
- **Response**:
  ```json
  {
    "extractedValues": {
      "claimantName": "Jane Doe",
      "incidentDate": "2026-09-05",
      "incidentType": "collision",
      "estimatedDamage": 1500,
      "reportedToPolice": true,
      "policeReportNumber": "RPT-987654",
      "incidentDescription": "Accident with another car on Main St."
    },
    "confidenceScores": {
      "claimantName": 0.98,
      "incidentDate": 0.95
    }
  }
  ```

---

## 4. Submission Endpoints

### Create Submission (Draft)
- **Endpoint**: `POST /api/submissions`
- **Purpose**: Initiates a new form submission draft or direct submission.
- **Request Body**:
  ```json
  {
    "formId": "form-claim-auto-v1",
    "formVersion": 1,
    "data": {
      "claimantName": "Jane Doe",
      "policyNumber": "POL-123456"
    },
    "status": "draft"
  }
  ```
- **Response**: Returns the created `FormSubmission` object with its unique `_id`.

### Get Submission by ID
- **Endpoint**: `GET /api/submissions/:id`
- **Purpose**: Retrieves an existing submission record with populated field values and current status.
- **Parameters**: `id` (string, path)

### Update Submission (Partial / Draft Save)
- **Endpoint**: `PATCH /api/submissions/:id`
- **Purpose**: Incrementally updates submission data without finalizing.
- **Request Body**:
  ```json
  {
    "data": {
      "estimatedDamage": 1800
    }
  }
  ```

### Finalize Submission
- **Endpoint**: `POST /api/submissions/:id/submit`
- **Purpose**: Runs full server-side validation against the form schema and marks the submission status as `submitted`.
- **Response**:
  ```json
  {
    "success": true,
    "submissionId": "66dec09a123456789abcdef0",
    "status": "submitted",
    "submittedAt": "2026-09-09T12:30:00.000Z"
  }
  ```
