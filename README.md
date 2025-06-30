# Semantic Incident Database Prototype

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- PostgreSQL database server
- npm package manager

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database**
   
   Create a PostgreSQL database for the application:
   ```bash
   # Connect to PostgreSQL as superuser
   psql -U postgres
   
   # Create the database
   CREATE DATABASE "db-prototype-1";
   
   # Exit psql
   \q
   ```

3. **Configure environment variables**
   
   Create environment files for each node you want to run. The application supports multiple nodes using indexed environment files.
   
   Example `.env.local.1`:
   ```bash
   # points to current node (3001 for NODE_INDEX=1, 3002 for NODE_INDEX=2, etc.)
   NEXT_PUBLIC_LOCAL_DOMAIN=http://localhost:3001 
   # this always points to port 3000
   NEXT_PUBLIC_CORE_DOMAIN=http://localhost:3000 
   NEXT_PUBLIC_NAMESPACE=aiid
   DATABASE_URL=postgres://localhost:5432/db-prototype-1
   ```
   
   For additional nodes, create `.env.local.2`, `.env.local.3`, etc., adjusting the `NEXT_PUBLIC_LOCAL_DOMAIN` port accordingly (3002, 3003, etc.) and the `DATABASE_URL` to point to different databases.

### Running the Application

#### Single Node Setup

1. **Run database migrations**
   ```bash
   NODE_INDEX=1 npm run db:migrate
   ```
   
   This will load the `.env.local.1` environment file and run the migrations.

2. **Start the development server**
   ```bash
   NODE_INDEX=1 npm run dev
   ```
   
   The application will start on port 3001 (as specified in the environment file).

#### Multiple Node Setup

To run multiple nodes simultaneously, you need to specify different `NODE_INDEX` values:

**Node 1:**
```bash
# Terminal 1
NODE_INDEX=1 npm run dev
```

**Node 2:**
```bash
# Terminal 2
NODE_INDEX=2 npm run dev
```

Each node will:
- Load its corresponding `.env.local.[NODE_INDEX]` file
- Run on port `300${NODE_INDEX}` (3001 for NODE_INDEX=1, 3002 for NODE_INDEX=2, etc.)
- Connect to the database using the `DATABASE_URL` from its environment file

### Example Schemas

The `schemas/` folder contains example schema files that demonstrate how to define and structure schemas for the application:

- `core-schema.json` - Core schema definition
- `core-context.jsonld` - Core JSON-LD context
- `local-schema-example.json` - Example local schema extending the core schema
- `local-context-example.jsonld` - Example local JSON-LD context

These files serve as templates and references for creating your own schemas within the semantic incident database system.

### Available Scripts

For a complete list of available scripts and their functionality, check the `package.json` file:

- `NODE_INDEX=n npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production (includes migration)
- `NODE_INDEX=n npm run build:local` - Build with local environment
- `NODE_INDEX=n npm run start` - Start production server
- `NODE_INDEX=n npm run db:migrate` - Run database migrations
- `NODE_INDEX=n npm run db:generate:local` - Generate migration files
- `NODE_INDEX=n npm run db:migrate:local` - Run migrations with local environment
- `NODE_INDEX=n npm run db:studio:local` - Open Drizzle Studio on port 498[NODE_INDEX]

### Database Management

**Generate new migrations:**
```bash
NODE_INDEX=1 npm run db:generate:local
```

**Open Drizzle Studio:**
```bash
NODE_INDEX=1 npm run db:studio:local
```

This will open Drizzle Studio on port 4981 (for NODE_INDEX=1).

### Schema Seeding

The application includes a seeding system to populate your database with schema data from JSON and JSON-LD files.

#### Seeding Requirements

1. **NODE_INDEX**: The seeding process requires the `NODE_INDEX` environment variable to be set explicitly. This determines which environment file and schema files to use.

2. **Running Server**: The target server must be running on the port specified in your environment file before seeding.

3. **Schema Files**: Create schema files following the naming convention:
   - `schemas/local-context-seed-{NODE_INDEX}.jsonld` - JSON-LD context file
   - `schemas/local-schema-seed-{NODE_INDEX}.json` - JSON schema validation file

#### Environment Configuration

Your `.env.local.{NODE_INDEX}` file must contain:
- `NEXT_PUBLIC_LOCAL_DOMAIN`: Must match your local development server URL
- `NEXT_PUBLIC_NAMESPACE`: The namespace for your schemas

**Important**: When working locally, `NEXT_PUBLIC_LOCAL_DOMAIN` must match the port pattern `http://localhost:300{NODE_INDEX}`:
- NODE_INDEX=1 → `http://localhost:3001`
- NODE_INDEX=2 → `http://localhost:3002`

#### Seeding Process

1. **Start your development server**:
   ```bash
   NODE_INDEX=1 npm run dev
   ```

2. **Run the seed command** (in a separate terminal):
   ```bash
   NODE_INDEX=1 npm run seed
   ```

#### Troubleshooting Seeding

- **"NODE_INDEX environment variable is required"**: Make sure to set NODE_INDEX before running the seed command
- **"API call failed"**: Ensure your development server is running on the correct port
- **"Schema validation errors"**: Check that your schema files follow the required structure and reference the correct core schema URL
- **"Missing environment variables"**: Verify your `.env.local.{NODE_INDEX}` file contains all required variables

### Environment Variables

The application uses indexed environment files to support multiple nodes:

- `NODE_INDEX=1` loads `.env.local.1`
- `NODE_INDEX=2` loads `.env.local.2`
- And so on...

Each environment file should contain:
- `NEXT_PUBLIC_LOCAL_DOMAIN` - The local domain and port for this node
- `NEXT_PUBLIC_CORE_DOMAIN` - Always points to port 3000
- `NEXT_PUBLIC_NAMESPACE` - Application namespace
- `DATABASE_URL` - PostgreSQL connection string

### Troubleshooting

- Ensure PostgreSQL is running and accessible
- Verify the database specified in `DATABASE_URL` exists
- Check that the ports in your environment files are not in use
- Make sure you're using the correct `NODE_INDEX` for your intended node