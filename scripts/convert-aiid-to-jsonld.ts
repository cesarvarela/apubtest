import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Organization lookup table based on AIID entity data
const KNOWN_ORGANIZATIONS = new Set([
  'facebook',
  'google', 
  'openai',
  'tesla',
  'meta',
  'amazon',
  'microsoft',
  'apple',
  'youtube',
  'nvidia',
  'uber',
  'netflix',
  'twitter',
  'x',
  'spotify',
  'linkedin',
  'instagram',
  'whatsapp',
  'snapchat',
  'tiktok',
  'zoom',
  'slack',
  'discord',
  'reddit',
  'pinterest',
  'airbnb',
  'lyft',
  'doordash',
  'grubhub',
  'postmates',
  'instacart',
  'shopify',
  'paypal',
  'stripe',
  'square',
  'robinhood',
  'coinbase',
  'binance',
  'salesforce',
  'oracle',
  'ibm',
  'intel',
  'amd',
  'qualcomm',
  'broadcom',
  'cisco',
  'vmware',
  'adobe',
  'autodesk',
  'intuit',
  'atlassian',
  'dropbox',
  'box',
  'github',
  'gitlab',
  'bitbucket',
  'jira',
  'confluence',
  'trello',
  'asana',
  'monday.com',
  'notion',
  'evernote',
  'onenote',
  'navya',
  'keolis',
  'keolis-north-america',
  'reuters',
  'associated-press',
  'ap-news',
  'bbc',
  'bbc-news'
]);

interface AiidEntity {
  entity_id: string;
  name: string;
}

interface AiidReport {
  title: string;
  report_number: number;
  url: string;
  authors: string[];
}

interface AiidIncident {
  incident_id: number;
  title: string;
  AllegedDeployerOfAISystem: AiidEntity[];
  reports: AiidReport[];
  AllegedHarmedOrNearlyHarmedParties: AiidEntity[];
}

interface AiidData {
  data: {
    incidents: AiidIncident[];
  };
}

// Organization to Wikipedia URL mapping
const ORGANIZATION_WIKI_URLS: Record<string, string> = {
  'navya': 'https://en.wikipedia.org/wiki/Navya_(company)',
  'keolis': 'https://en.wikipedia.org/wiki/Keolis',
  'keolis-north-america': 'https://en.wikipedia.org/wiki/Keolis',
  'facebook': 'https://en.wikipedia.org/wiki/Meta_Platforms',
  'meta': 'https://en.wikipedia.org/wiki/Meta_Platforms',
  'google': 'https://en.wikipedia.org/wiki/Google',
  'openai': 'https://en.wikipedia.org/wiki/OpenAI',
  'tesla': 'https://en.wikipedia.org/wiki/Tesla,_Inc.',
  'amazon': 'https://en.wikipedia.org/wiki/Amazon_(company)',
  'microsoft': 'https://en.wikipedia.org/wiki/Microsoft',
  'apple': 'https://en.wikipedia.org/wiki/Apple_Inc.',
  'youtube': 'https://en.wikipedia.org/wiki/YouTube',
  'nvidia': 'https://en.wikipedia.org/wiki/Nvidia',
  'ibm': 'https://en.wikipedia.org/wiki/IBM',
  'intel': 'https://en.wikipedia.org/wiki/Intel',
  'deepmind': 'https://en.wikipedia.org/wiki/DeepMind',
  'reuters': 'https://en.wikipedia.org/wiki/Reuters',
  'associated-press': 'https://en.wikipedia.org/wiki/Associated_Press',
  'ap-news': 'https://en.wikipedia.org/wiki/Associated_Press',
  'bbc': 'https://en.wikipedia.org/wiki/BBC',
  'bbc-news': 'https://en.wikipedia.org/wiki/BBC_News'
};


// URI generation functions
function normalizeEntityId(entityId: string): string {
  return entityId.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateOrganizationUri(entity: AiidEntity): string {
  const normalized = normalizeEntityId(entity.entity_id);
  return ORGANIZATION_WIKI_URLS[normalized] || `https://en.wikipedia.org/wiki/${entity.name.replace(/\s+/g, '_')}`;
}

function generatePersonUri(entity: AiidEntity): string {
  const normalized = normalizeEntityId(entity.entity_id);
  return `https://example.org/entities/person/${normalized}`;
}

function generateReportUri(report: AiidReport): string {
  return `https://incidentdatabase.ai/report/${report.report_number}`;
}

function generateIncidentUri(incidentId: number): string {
  return `https://incidentdatabase.ai/incident/${incidentId}`;
}

function generateAuthorUri(authorName: string): string {
  const normalized = authorName.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `https://example.org/person/${normalized}`;
}

function convertAuthorsToPersons(authors: string[]) {
  return authors.map(authorName => ({
    "@type": "core:Person",
    "@id": generateAuthorUri(authorName),
    "name": authorName
  }));
}


// Entity classification functions
function isOrganization(entity: AiidEntity): boolean {
  const normalizedEntityId = entity.entity_id.toLowerCase();
  const normalizedName = entity.name.toLowerCase();
  
  // Check entity_id first
  if (KNOWN_ORGANIZATIONS.has(normalizedEntityId)) {
    return true;
  }
  
  // Check if name contains known organization names
  for (const org of KNOWN_ORGANIZATIONS) {
    if (normalizedName.includes(org) || normalizedEntityId.includes(org)) {
      return true;
    }
  }
  
  // Additional heuristics for organization detection
  const orgIndicators = [
    'corp', 'corporation', 'company', 'inc', 'ltd', 'llc', 
    'technologies', 'systems', 'solutions', 'enterprises',
    'group', 'holdings', 'ventures', 'labs', 'studio',
    'university', 'institute', 'foundation', 'association'
  ];
  
  return orgIndicators.some(indicator => 
    normalizedName.includes(indicator) || normalizedEntityId.includes(indicator)
  );
}

function convertToOrganization(entity: AiidEntity) {
  return {
    "@type": "core:Organization",
    "@id": generateOrganizationUri(entity),
    "name": entity.name
  };
}

function convertToPerson(entity: AiidEntity) {
  return {
    "@type": "core:Person", 
    "@id": generatePersonUri(entity),
    "name": entity.name
  };
}

function convertToReport(report: AiidReport) {
  return {
    "@type": "aiid:Report",
    "@id": generateReportUri(report),
    "title": report.title,
    "url": report.url,
    "authors": convertAuthorsToPersons(report.authors)
  };
}

// Main conversion function
function convertAiidIncidentToJsonLd(incident: AiidIncident) {
  // Convert deployers (always organizations)
  const deployedBy = incident.AllegedDeployerOfAISystem.map(convertToOrganization);
  
  // Convert reports  
  const reports = incident.reports.map(convertToReport);
  
  // Convert affected parties (mixed organizations and persons)
  const affectedParties = incident.AllegedHarmedOrNearlyHarmedParties.map(entity => {
    return isOrganization(entity) ? convertToOrganization(entity) : convertToPerson(entity);
  });
  
  return {
    "@context": [
      "http://localhost:3000/api/schemas/v1/core/context.jsonld",
      "http://localhost:3001/api/schemas/v1/aiid/context.jsonld"
    ],
    "@type": "aiid:Incident",
    "@id": generateIncidentUri(incident.incident_id),
    "incident_id": incident.incident_id,
    "title": incident.title,
    "deployedBy": deployedBy,
    "reports": reports,
    "affectedParties": affectedParties
  };
}

// Main execution
async function main() {
  try {
    // Get input file from command line arguments
    const inputFile = process.argv[2];
    
    if (!inputFile) {
      console.error('Error: Input file is required');
      console.error('Example: npx tsx convert-aiid-to-jsonld.ts data/sample-aiid.json');
      process.exit(1);
    }
    
    // Generate output file path
    const inputDir = path.dirname(inputFile);
    const inputBasename = path.basename(inputFile, path.extname(inputFile));
    const outputFile = path.join(inputDir, `${inputBasename}-converted.jsonld`);
    
    console.log('=== AIID to JSON-LD Conversion ===\n');
    console.log(`Input file: ${inputFile}`);
    console.log(`Output file: ${outputFile}\n`);
    
    // Load AIID data from input file
    const aiidData: AiidData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    console.log(`Processing ${aiidData.data.incidents.length} incident(s)...\n`);
    
    // Convert all incidents to array
    const initialPayload = aiidData.data.incidents.map(incident => {
      console.log(`Converting Incident ${incident.incident_id}: ${incident.title}`);
      return convertAiidIncidentToJsonLd(incident);
    });
    
    // Write to output file
    fs.writeFileSync(outputFile, JSON.stringify(initialPayload, null, 2));
    
    console.log('\nconst initialPayload = ');
    console.log(JSON.stringify(initialPayload, null, 2));
    
    console.log(`\n=== Conversion Complete ===`);
    console.log(`Output saved to: ${outputFile}`);
    
  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { 
  convertAiidIncidentToJsonLd, 
  isOrganization,
  generateIncidentUri,
  generateOrganizationUri,
  generatePersonUri,
  generateReportUri
};