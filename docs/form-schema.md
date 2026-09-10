# Forma AI — Form Schema Specification

## 1. Purpose of Backend-Driven Form Schemas

A backend-driven form schema architecture enables flexible, dynamic, and maintainable data collection applications without requiring frontend code deployments for every form modification.

Key advantages include:

1. **Centralized Definition**: Form layouts, fields, labels, validation constraints, and visibility rules are managed in one place (database/backend) and delivered as JSON.
2. **Dynamic UI Generation**: The client dynamically instantiates and arranges UI components based purely on the schema structure.
3. **Dual Validation Parity**: Validation rules defined in the schema are shared and executed on both the client (for instant user feedback) and server (for strict data integrity).
4. **Conditional Logic Engine**: Complex dependency chains (e.g., showing a "Police Report Number" field only when "Did you report to police?" is checked) are evaluated declaratively.
5. **Schema Versioning**: Forms can evolve over time while maintaining compatibility with legacy submissions and existing audits.
6. **AI Pipeline Ready**: Standardized schemas provide the structured blueprint for LLM prompts to extract values from natural language text into matching form fields.

---

## 2. Core Concepts

| Concept | Description |
| :--- | :--- |
| `FormSchema` | Root object containing form metadata, version, and structured sections. |
| `FormSection` | Logical group of fields (e.g., "Personal Information", "Incident Details"). |
| `FormField` | An individual input field with ID, type, label, placeholder, and configuration. |
| `FieldType` | Supported input types (`text`, `number`, `select`, `checkbox`, `date`, `textarea`). |
| `FieldOption` | Label-value pair for selectable fields (`select`). |
| `ValidationRule` | Rules governing field value validity (`required`, `min`, `max`, `pattern`, etc.). |
| `ConditionalRule` | Rules controlling dynamic visibility or activation based on another field's value. |

---

## 3. Example Schema: Insurance Claim Form

Below is an illustrative JSON schema for an Insurance Claim form demonstrating sections, supported field types, validation rules, and conditional logic:

```json
{
  "id": "form-claim-auto-v1",
  "title": "Automobile Insurance Claim",
  "description": "Please provide details regarding your vehicle incident to process your claim.",
  "version": 1,
  "sections": [
    {
      "id": "section-claimant",
      "title": "Claimant Details",
      "description": "Information about the policyholder filing the claim",
      "fields": [
        {
          "id": "claimant_name",
          "name": "claimantName",
          "label": "Full Name",
          "type": "text",
          "placeholder": "Jane Doe",
          "validation": [
            {
              "type": "required",
              "message": "Full name is required."
            },
            {
              "type": "minLength",
              "value": 3,
              "message": "Name must be at least 3 characters."
            }
          ]
        },
        {
          "id": "policy_number",
          "name": "policyNumber",
          "label": "Policy Number",
          "type": "text",
          "placeholder": "POL-123456",
          "validation": [
            {
              "type": "required",
              "message": "Policy number is required."
            },
            {
              "type": "pattern",
              "value": "^POL-[0-9]{6}$",
              "message": "Policy number must follow format POL-XXXXXX."
            }
          ]
        }
      ]
    },
    {
      "id": "section-incident",
      "title": "Incident Details",
      "description": "Details about when and where the incident occurred",
      "fields": [
        {
          "id": "incident_date",
          "name": "incidentDate",
          "label": "Date of Incident",
          "type": "date",
          "validation": [
            {
              "type": "required",
              "message": "Incident date is required."
            }
          ]
        },
        {
          "id": "incident_type",
          "name": "incidentType",
          "label": "Incident Category",
          "type": "select",
          "placeholder": "Select incident type",
          "options": [
            { "label": "Collision with Vehicle", "value": "collision" },
            { "label": "Weather / Natural Hazard", "value": "weather" },
            { "label": "Theft or Vandalism", "value": "theft" },
            { "label": "Single Vehicle Incident", "value": "single_vehicle" }
          ],
          "validation": [
            {
              "type": "required",
              "message": "Incident category is required."
            }
          ]
        },
        {
          "id": "estimated_damage",
          "name": "estimatedDamage",
          "label": "Estimated Damage Amount ($)",
          "type": "number",
          "placeholder": "1500",
          "validation": [
            {
              "type": "min",
              "value": 0,
              "message": "Damage amount cannot be negative."
            }
          ]
        },
        {
          "id": "reported_to_police",
          "name": "reportedToPolice",
          "label": "Has this incident been reported to the police?",
          "type": "checkbox",
          "defaultValue": false
        },
        {
          "id": "police_report_number",
          "name": "policeReportNumber",
          "label": "Police Report Number",
          "type": "text",
          "placeholder": "RPT-987654",
          "conditional": {
            "field": "reportedToPolice",
            "operator": "equals",
            "value": true,
            "action": "show"
          },
          "validation": [
            {
              "type": "required",
              "message": "Police report number is required when reported to police."
            }
          ]
        },
        {
          "id": "incident_description",
          "name": "incidentDescription",
          "label": "Detailed Incident Description",
          "type": "textarea",
          "placeholder": "Describe what occurred in your own words...",
          "validation": [
            {
              "type": "required",
              "message": "Description is required."
            },
            {
              "type": "minLength",
              "value": 20,
              "message": "Description must contain at least 20 characters."
            }
          ]
        }
      ]
    }
  ]
}
```
