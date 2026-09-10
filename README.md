# Forma AI — AI-Augmented Dynamic Form Engine

Forma AI is an intelligent dynamic form rendering engine and extraction platform that bridges natural language data collection and structured form workflows.

## Overview

Forma AI allows complex, schema-driven forms to be dynamically rendered on the frontend and validated consistently across both client and server. In future iterations, an AI pipeline will extract structured form fields directly from natural language input, mapping them seamlessly into dynamic schemas with conditional logic.

## Architecture

- **Frontend (`client/`)**: Built with React, TypeScript, and Vite. Utilizes React Hook Form for form state management, Zustand for global application state, Axios for API communication, and Zod for schema validation.
- **Backend (`server/`)**: Built with Node.js, Express, and TypeScript. Uses MongoDB with Mongoose for schema and submission persistence, Zod for request validation, and an upcoming LangChain integration for LLM-driven field extraction.
- **Shared Contracts (`shared/`)**: Canonical TypeScript interfaces for form schemas, validation rules, field definitions, and conditional logic shared between client and server.
- **Documentation (`docs/`)**: Architectural overviews, schema specifications, and API documentation.

## Project Structure

```text
forma-ai/
├── client/          # Frontend React + TypeScript application
├── server/          # Backend Node.js + Express API server
├── shared/          # Shared TypeScript contracts and schemas
├── docs/            # Architecture, schema, and API documentation
├── .gitignore       # Git ignore specifications
├── package.json     # Root orchestration package
└── README.md        # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- MongoDB (local or MongoDB Atlas connection)

### Installation

Install dependencies for root, server, and client:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

### Environment Configuration

1. Copy `.env.example` to `.env` in both `client/` and `server/`:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
2. Update the environment variables in `server/.env` and `client/.env` as needed.

### Running in Development

Run both server and client concurrently from the project root:

```bash
npm run dev
```

Or run them individually:

```bash
npm run dev:server    # Starts Express API server
npm run dev:client    # Starts Vite dev server
```

## Available Scripts

- `npm run dev`: Runs both client and server concurrently in development mode.
- `npm run dev:server`: Starts backend server in development mode.
- `npm run dev:client`: Starts frontend development server.
- `npm run build`: Builds both backend and frontend applications for production.
- `npm run build:server`: Compiles server TypeScript to JavaScript.
- `npm run build:client`: Builds the client application bundle with Vite.
- `npm run lint`: Runs ESLint checks across both client and server workspaces.

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Form Schema Specification](docs/form-schema.md)
- [API Documentation](docs/api.md)

## License

MIT
