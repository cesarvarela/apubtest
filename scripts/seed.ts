#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

// Load environment variables based on NODE_INDEX
const nodeIndex = process.env.NODE_INDEX;
if (!nodeIndex) {
  console.error('ERROR: NODE_INDEX environment variable is required');
  console.error('   Example: export NODE_INDEX=1 && npm run seed');
  process.exit(1);
}

const envFile = `.env.local.${nodeIndex}`;
const envPath = resolve(process.cwd(), envFile);

console.log(`Loading environment from: ${envFile}`);
config({ path: envPath });

// Verify required environment variables are loaded
const requiredEnvVars = ['NEXT_PUBLIC_LOCAL_DOMAIN', 'NEXT_PUBLIC_NAMESPACE'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`ERROR: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log(`Environment loaded successfully`);
console.log(`Local domain: ${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}`);
console.log(`Namespace: ${process.env.NEXT_PUBLIC_NAMESPACE}`);
console.log(`Node index: ${nodeIndex}`);

async function loadSchemaFiles() {
  const schemaBasePath = resolve(process.cwd(), 'schemas');
  const contextFile = `local-context-seed-${nodeIndex}.jsonld`;
  const schemaFile = `local-schema-seed-${nodeIndex}.json`;
  
  const contextPath = resolve(schemaBasePath, contextFile);
  const schemaPath = resolve(schemaBasePath, schemaFile);
  
  console.log(`Looking for schema files:`);
  console.log(`   Context: ${contextFile}`);
  console.log(`   Schema: ${schemaFile}`);
  
  let contextData = null;
  let schemaData = null;
  
  if (existsSync(contextPath)) {
    console.log(`Found context file: ${contextFile}`);
    contextData = JSON.parse(readFileSync(contextPath, 'utf-8'));
  } else {
    console.log(`Context file not found: ${contextFile}`);
  }
  
  if (existsSync(schemaPath)) {
    console.log(`Found schema file: ${schemaFile}`);
    schemaData = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  } else {
    console.log(`Schema file not found: ${schemaFile}`);
  }
  
  return { contextData, schemaData };
}

async function makeApiRequest(endpoint: string, method: string = 'GET', data?: any) {
  const baseUrl = process.env.NEXT_PUBLIC_LOCAL_DOMAIN;
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`${method} ${url}`);
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody.error) {
          errorMessage += ` - ${errorBody.error}`;
        }
        console.error(`Server error details:`, errorBody);
      } catch (e) {
        console.error(`Could not parse error response`);
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log(`API call successful:`, result);
    return result;
  } catch (error) {
    console.error(`API call failed:`, error);
    throw error;
  }
}

async function seed() {
  try {
    console.log('Starting API-based seed...');
    
    // Load schema files
    const { contextData, schemaData } = await loadSchemaFiles();
    
    if (!contextData && !schemaData) {
      console.log('No schema files found to seed. Make sure you have:');
      console.log(`   schemas/local-context-seed-${nodeIndex}.jsonld`);
      console.log(`   schemas/local-schema-seed-${nodeIndex}.json`);
      return;
    }
    
    const namespace = process.env.NEXT_PUBLIC_NAMESPACE!;
    
    if (contextData) {
      console.log('Seeding context data...');
      const contextPayload = {
        namespace,
        schema: contextData,
        type: 'context'
      };
      console.log('Context payload:', JSON.stringify(contextPayload, null, 2));
      await makeApiRequest('/api/schemas/manage', 'POST', contextPayload);
    }
    
    if (schemaData) {
      console.log('Seeding validation schema data...');
      const schemaPayload = {
        namespace,
        schema: schemaData,
        type: 'validation'
      };
      console.log('Schema payload:', JSON.stringify(schemaPayload, null, 2));
      await makeApiRequest('/api/schemas/manage', 'POST', schemaPayload);
    }
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

// Run the seed function
seed().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
