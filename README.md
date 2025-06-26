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