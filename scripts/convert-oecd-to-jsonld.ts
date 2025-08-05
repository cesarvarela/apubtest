import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import shared functions from AIID converter
import { 
  isOrganization, 
  generateOrganizationUri, 
  generatePersonUri,
  KNOWN_ORGANIZATIONS
} from './convert-aiid-to-jsonld.js';

interface OecdSubmitter {
  role: string;
  email: string;
  affiliation: string;
  stakeholder_group: string;
  relation_to_incident: string;
}

interface OecdAISystem {
  name: string;
  version: string;
}

interface OecdOrganizations {
  developer: string;
  deployer: string;
}

interface OecdHarmQuantification {
  affected_stakeholders?: string;
  economic_losses?: string;
  death?: number;
  injury?: number;
  compensation?: string;
  psychological_impact?: string;
  environmental_impact?: string;
  reputational_damage?: string;
}

interface OecdIncident {
  incident_id: string;
  title: string;
  description: string;
  ai_system_relation: string[];
  submitter: OecdSubmitter;
  date_of_occurrence: string;
  countries: string[];
  ai_system: OecdAISystem;
  organizations: OecdOrganizations;
  severity: string;
  harm_type: string[];
  harm_quantification: OecdHarmQuantification;
  unintended_use: boolean;
  unintended_use_description?: string;
  affected_stakeholders: string[];
  business_function: string[];
  sameAs?: string;
}

interface OecdData {
  data: {
    incidents: OecdIncident[];
    metadata?: any;
  };
}

// URI generation functions
function generateOecdIncidentUri(incidentId: string): string {
  return `https://oecd.ai/incident/${incidentId}`;
}

function generateCountryUri(country: string): string {
  const normalized = country.replace(/\s+/g, '_');
  return `https://www.wikidata.org/wiki/${normalized}`;
}

function generateSubmitterUri(submitter: OecdSubmitter): string {
  const normalized = submitter.email.split('@')[0].toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `https://example.org/submitter/${normalized}`;
}

// Convert OECD severity to standardized levels
function convertSeverity(severity: string): string {
  const severityMap: Record<string, string> = {
    'Hazard': 'oecd:Hazard',
    'Serious hazard': 'oecd:SeriousHazard',
    'Incident': 'oecd:Incident',
    'Serious incident': 'oecd:SeriousIncident',
    'Disaster': 'oecd:Disaster'
  };
  return severityMap[severity] || 'oecd:OtherSeverity';
}

// Convert harm types to URIs
function convertHarmTypes(harmTypes: string[]): string[] {
  const harmTypeMap: Record<string, string> = {
    'Physical': 'oecd:PhysicalHarm',
    'Psychological': 'oecd:PsychologicalHarm',
    'Reputational': 'oecd:ReputationalHarm',
    'Economic/property': 'oecd:EconomicHarm',
    'Environmental': 'oecd:EnvironmentalHarm',
    'Public interest/critical infrastructure': 'oecd:PublicInterestHarm',
    'Human or fundamental rights': 'oecd:HumanRightsHarm'
  };
  return harmTypes.map(type => harmTypeMap[type] || 'oecd:OtherHarm');
}

// Convert AI system relation to URIs
function convertAISystemRelation(relations: string[]): string[] {
  const relationMap: Record<string, string> = {
    'Direct cause': 'oecd:DirectCause',
    'Contributing factor': 'oecd:ContributingFactor',
    'Failure to act': 'oecd:FailureToAct',
    'Overreliance': 'oecd:Overreliance',
    'Intentional misuse': 'oecd:IntentionalMisuse',
    'Human error': 'oecd:HumanError',
    'Failure to comply with legal frameworks': 'oecd:LegalNonCompliance'
  };
  return relations.map(rel => relationMap[rel] || 'oecd:OtherRelation');
}

// Convert business functions to URIs
function convertBusinessFunctions(functions: string[]): string[] {
  const functionMap: Record<string, string> = {
    'Human resource management': 'oecd:HRManagement',
    'Sales': 'oecd:Sales',
    'ICT management and information security': 'oecd:ICTManagement',
    'Marketing and advertisement': 'oecd:Marketing',
    'Logistics': 'oecd:Logistics',
    'Citizen/customer service': 'oecd:CustomerService',
    'Procurement': 'oecd:Procurement',
    'Maintenance': 'oecd:Maintenance',
    'Accounting': 'oecd:Accounting',
    'Monitoring and quality control': 'oecd:QualityControl',
    'Production': 'oecd:Production',
    'Planning and budgeting': 'oecd:Planning',
    'Research and development': 'oecd:ResearchDevelopment',
    'Compliance and justice': 'oecd:Compliance'
  };
  return functions.map(func => {
    if (func.startsWith('Other')) return 'oecd:OtherFunction';
    return functionMap[func] || 'oecd:OtherFunction';
  });
}

// Convert stakeholder string to entity
function convertStakeholder(stakeholder: string) {
  // Check if it's a known organization
  const normalizedStakeholder = stakeholder.toLowerCase();
  
  // If it's a known organization from AIID data
  if (KNOWN_ORGANIZATIONS.has(normalizedStakeholder)) {
    return {
      "@type": "core:Organization",
      "@id": generateOrganizationUri({ entity_id: normalizedStakeholder, name: stakeholder }),
      "name": stakeholder
    };
  }
  
  // Common group/class indicators
  const groupIndicators = ['children', 'workers', 'patients', 'students', 'consumers', 
                          'users', 'public', 'minorities', 'women', 'men', 'groups'];
  
  if (groupIndicators.some(indicator => normalizedStakeholder.includes(indicator))) {
    return {
      "@type": "oecd:StakeholderGroup",
      "@id": `https://example.org/stakeholder-group/${normalizedStakeholder.replace(/\s+/g, '-')}`,
      "name": stakeholder
    };
  }
  
  // Default to person
  return {
    "@type": "core:Person",
    "@id": generatePersonUri({ entity_id: stakeholder.replace(/\s+/g, '-'), name: stakeholder }),
    "name": stakeholder
  };
}

// Main conversion function
function convertOecdIncidentToJsonLd(incident: OecdIncident) {
  const jsonLd: any = {
    "@context": [
      "http://localhost:3000/api/schemas/v1/core/context.jsonld",
      "http://localhost:3001/api/schemas/v1/oecd/context.jsonld"
    ],
    "@type": "oecd:Incident",
    "@id": generateOecdIncidentUri(incident.incident_id),
    "incident_id": incident.incident_id,
    "title": incident.title,
    "description": incident.description,
    "date": incident.date_of_occurrence,
    
    // AI System Information
    "aiSystem": {
      "@type": "oecd:AISystem",
      "name": incident.ai_system.name,
      "version": incident.ai_system.version,
      "relation": convertAISystemRelation(incident.ai_system_relation)
    },
    
    // Organizations
    "developer": {
      "@type": "core:Organization",
      "@id": generateOrganizationUri({ 
        entity_id: incident.organizations.developer.toLowerCase().replace(/\s+/g, '-'), 
        name: incident.organizations.developer 
      }),
      "name": incident.organizations.developer
    },
    "deployer": {
      "@type": "core:Organization",
      "@id": generateOrganizationUri({ 
        entity_id: incident.organizations.deployer.toLowerCase().replace(/\s+/g, '-'), 
        name: incident.organizations.deployer 
      }),
      "name": incident.organizations.deployer
    },
    
    // Severity and Harm
    "severity": convertSeverity(incident.severity),
    "harmType": convertHarmTypes(incident.harm_type),
    
    // Harm Quantification
    "harmQuantification": {
      "@type": "oecd:HarmQuantification",
      ...incident.harm_quantification
    },
    
    // Location
    "countries": incident.countries.map(country => ({
      "@type": "core:Country",
      "@id": generateCountryUri(country),
      "name": country
    })),
    
    // Affected Stakeholders
    "affectedStakeholders": incident.affected_stakeholders.map(convertStakeholder),
    
    // Business Functions
    "businessFunction": convertBusinessFunctions(incident.business_function),
    
    // Submitter Information
    "submitter": {
      "@type": "oecd:Submitter",
      "@id": generateSubmitterUri(incident.submitter),
      "role": incident.submitter.role,
      "affiliation": incident.submitter.affiliation,
      "stakeholderGroup": incident.submitter.stakeholder_group,
      "relationToIncident": incident.submitter.relation_to_incident
    },
    
    // Unintended Use
    "unintendedUse": incident.unintended_use
  };
  
  // Add optional fields
  if (incident.unintended_use_description) {
    jsonLd.unintendedUseDescription = incident.unintended_use_description;
  }
  
  if (incident.sameAs) {
    jsonLd.sameAs = incident.sameAs;
  }
  
  return jsonLd;
}

// Main execution
async function main() {
  try {
    // Get input file from command line arguments
    const inputFile = process.argv[2];
    
    if (!inputFile) {
      console.error('Error: Input file is required');
      console.error('Example: npx tsx convert-oecd-to-jsonld.ts data/oecd.json');
      process.exit(1);
    }
    
    // Generate output file path
    const inputDir = path.dirname(inputFile);
    const inputBasename = path.basename(inputFile, path.extname(inputFile));
    const outputFile = path.join(inputDir, `${inputBasename}-converted.json`);
    
    console.log('=== OECD to JSON-LD Conversion ===\n');
    console.log(`Input file: ${inputFile}`);
    console.log(`Output file: ${outputFile}\n`);
    
    // Load OECD data from input file
    const oecdData: OecdData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    console.log(`Processing ${oecdData.data.incidents.length} incident(s)...\n`);
    
    // Convert all incidents to array
    const initialPayload = oecdData.data.incidents.map(incident => {
      console.log(`Converting Incident ${incident.incident_id}: ${incident.title}`);
      return convertOecdIncidentToJsonLd(incident);
    });
    
    // Write to output file
    fs.writeFileSync(outputFile, JSON.stringify(initialPayload, null, 2));
    
    console.log('\nconst initialPayload = ');
    console.log(JSON.stringify(initialPayload.slice(0, 2), null, 2));
    console.log('... (showing first 2 incidents)');
    
    console.log(`\n=== Conversion Complete ===`);
    console.log(`Output saved to: ${outputFile}`);
    console.log(`Total incidents converted: ${initialPayload.length}`);
    console.log(`Incidents linked to AIID: ${oecdData.data.incidents.filter(i => i.sameAs).length}`);
    
  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { 
  convertOecdIncidentToJsonLd,
  generateOecdIncidentUri,
  convertSeverity,
  convertHarmTypes,
  convertAISystemRelation,
  convertBusinessFunctions
};