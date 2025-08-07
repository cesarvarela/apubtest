import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tesla model mapping
const TESLA_MODELS: Record<string, string> = {
  'S': 'Model S',
  'X': 'Model X',
  '3': 'Model 3',
  'Y': 'Model Y',
  'Cybertruck': 'Cybertruck',
  'Roadster': 'Roadster',
  'Semi': 'Semi'
};

// Country code mapping for common variations
const COUNTRY_MAPPING: Record<string, string> = {
  'USA': 'United States',
  'US': 'United States',
  'UK': 'United Kingdom',
  'UAE': 'United Arab Emirates',
  'NL': 'Netherlands',
  'DE': 'Germany',
  'FR': 'France',
  'CN': 'China',
  'CA': 'Canada',
  'AU': 'Australia',
  'JP': 'Japan',
  'KR': 'South Korea',
  'IN': 'India',
  'NO': 'Norway',
  'SE': 'Sweden',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'IT': 'Italy',
  'ES': 'Spain',
  'BR': 'Brazil'
};

interface TeslaIncidentRow {
  'Case #'?: number;
  'Year'?: number;
  'Date'?: string | number;
  'Country'?: string;
  'State'?: string;
  'Description'?: string;
  'Deaths'?: number;
  'Tesla driver'?: number | string;
  'Tesla occupant'?: number | string;
  'Other vehicle'?: number | string;
  'Cyclist/ Pedestrian'?: number | string;
  'Tesla Model'?: string;
  'Autopilot claimed'?: string;
  'Verified Tesla Autopilot Death'?: string;
  'Source'?: string;
  'Deceased 1'?: string;
  'Deceased 2'?: string;
  'Deceased 3'?: string;
  'Deceased 4'?: string;
  'NHTSA Case Number'?: string;
  'NHTSA Case Number.1'?: string;
  'Note'?: string;
}

function parseExcelDate(excelDate: number | string): string {
  if (typeof excelDate === 'string') {
    // Already a string date
    const date = new Date(excelDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return excelDate;
  }
  
  // Excel stores dates as numbers - days since 1900-01-01
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

function normalizeCountry(country: string | undefined): string {
  if (!country) return 'Unknown';
  const trimmed = country.trim();
  return COUNTRY_MAPPING[trimmed] || trimmed;
}

function parseVictimType(value: number | string | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'yes' || lower === 'y' || lower === '1' || lower === 'true';
  }
  return false;
}

function parseAutopilotStatus(value: string | number | undefined): string {
  if (!value) return 'Unknown';
  const strValue = typeof value === 'string' ? value : String(value);
  const lower = strValue.toLowerCase();
  if (lower.includes('yes') || lower.includes('engaged')) return 'Engaged';
  if (lower.includes('no') || lower.includes('disengaged')) return 'Not Engaged';
  if (lower.includes('claimed') || lower.includes('suspected')) return 'Claimed';
  return strValue;
}

function extractVictimNames(row: TeslaIncidentRow): string[] {
  const victims: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const key = `Deceased ${i}` as keyof TeslaIncidentRow;
    const name = row[key];
    if (name && typeof name === 'string' && name.trim()) {
      victims.push(name.trim());
    }
  }
  return victims;
}

function convertTeslaIncident(row: TeslaIncidentRow, index: number): any {
  const caseNumber = row['Case #'] || index + 1;
  const date = row['Date'] ? parseExcelDate(row['Date']) : '2024-01-01';
  const country = normalizeCountry(row['Country']);
  const state = row['State']?.trim();
  
  const incident: any = {
    "@context": [
      "http://localhost:3000/api/schemas/v1/core/context.jsonld",
      "http://localhost:3001/api/schemas/v1/tesla/context.jsonld"
    ],
    "@type": "tesla:Incident",
    "@id": `https://www.tesladeaths.com/incident/${caseNumber}`,
    
    caseNumber: caseNumber,
    title: row['Description'] || `Tesla Incident #${caseNumber}`,
    description: row['Description'] || 'No description available',
    date: date,
    year: row['Year'] || new Date(date).getFullYear(),
    
    location: {
      "@type": "core:Location",
      country: {
        "@type": "core:Country",
        "@id": `https://en.wikipedia.org/wiki/${country.replace(/\s+/g, '_')}`,
        name: country
      }
    },
    
    totalDeaths: row['Deaths'] || 0,
    
    victims: {
      "@type": "tesla:VictimCategories",
      teslaDriver: parseVictimType(row['Tesla driver']),
      teslaOccupant: parseVictimType(row['Tesla occupant']),
      otherVehicle: parseVictimType(row['Other vehicle']),
      pedestrianCyclist: parseVictimType(row['Cyclist/ Pedestrian'])
    }
  };
  
  // Add state if available
  if (state) {
    incident.location.state = {
      "@type": "core:State",
      "@id": `https://en.wikipedia.org/wiki/${state.replace(/\s+/g, '_')}`,
      name: state
    };
  }
  
  // Add vehicle information if available
  if (row['Tesla Model']) {
    const modelRaw = row['Tesla Model'];
    const model = typeof modelRaw === 'string' ? modelRaw.trim() : String(modelRaw || '').trim();
    if (model) {
      const normalizedModel = TESLA_MODELS[model] || model;
      incident.vehicle = {
        "@type": "tesla:Vehicle",
        "@id": `https://en.wikipedia.org/wiki/Tesla_${normalizedModel.replace(/\s+/g, '_')}`,
        model: normalizedModel,
        autopilotStatus: parseAutopilotStatus(row['Autopilot claimed'])
      };
      
      // Add verified autopilot death flag if present
      if (row['Verified Tesla Autopilot Death']) {
        incident.vehicle.verifiedAutopilotDeath = parseVictimType(row['Verified Tesla Autopilot Death']);
      }
    }
  }
  
  // Add victim names if available
  const victimNames = extractVictimNames(row);
  if (victimNames.length > 0) {
    incident.deceasedPersons = victimNames.map(name => ({
      "@type": "core:Person",
      "@id": `https://www.tesladeaths.com/victim/${name.toLowerCase().replace(/\s+/g, '-')}`,
      name: name
    }));
  }
  
  // Add NHTSA case numbers if available
  const nhtsaCases: string[] = [];
  if (row['NHTSA Case Number']) nhtsaCases.push(row['NHTSA Case Number'].toString());
  if (row['NHTSA Case Number.1']) nhtsaCases.push(row['NHTSA Case Number.1'].toString());
  if (nhtsaCases.length > 0) {
    incident.nhtsaCaseNumbers = nhtsaCases;
  }
  
  // Skip adding source - removed per request
  
  // Add note if available
  if (row['Note']) {
    incident.note = row['Note'];
  }
  
  return incident;
}

function convertTeslaToJsonLd(inputFile: string): any[] {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(inputFile);
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row specified
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { 
      header: 1,  // Use array format
      defval: undefined 
    });
    
    console.log(`Found ${jsonData.length} rows in Excel file`);
    
    // Find header row (should be row 1 or 2)
    let headerRow = -1;
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row[0] === 'Case #' || (row[1] && row[1].toString().includes('Year'))) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) {
      console.error('Could not find header row');
      return [];
    }
    
    console.log(`Header row found at index ${headerRow}`);
    
    // Process data rows (skip header)
    const incidents: any[] = [];
    for (let i = headerRow + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      // Map array values to object
      const incidentRow: TeslaIncidentRow = {
        'Case #': row[0],
        'Year': row[1],
        'Date': row[2],
        'Country': row[3],
        'State': row[4],
        'Description': row[5],
        'Deaths': row[6],
        'Tesla driver': row[7],
        'Tesla occupant': row[8],
        'Other vehicle': row[9],
        'Cyclist/ Pedestrian': row[10],
        'Tesla Model': row[12],
        'Autopilot claimed': row[13],
        'Verified Tesla Autopilot Death': row[15],
        'Source': row[16],
        'Deceased 1': row[17],
        'Deceased 2': row[18],
        'Deceased 3': row[19],
        'Deceased 4': row[20],
        'NHTSA Case Number': row[21],
        'NHTSA Case Number.1': row[22],
        'Note': row[23]
      };
      
      // Skip empty rows
      if (!incidentRow['Case #'] && !incidentRow['Description'] && !incidentRow['Deaths']) {
        continue;
      }
      
      incidents.push(convertTeslaIncident(incidentRow, i - headerRow - 1));
    }
    
    console.log(`Converted ${incidents.length} incidents`);
    return incidents;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
}

// Main execution
function main() {
  const inputFile = path.join(__dirname, '../sources/Tesla Deaths.xlsx');
  const outputFile = path.join(__dirname, '../data/tesla-incidents.json');
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }
  
  console.log('Converting Tesla Deaths Excel to JSON-LD...');
  
  try {
    const incidents = convertTeslaToJsonLd(inputFile);
    
    // Write to output file
    fs.writeFileSync(outputFile, JSON.stringify(incidents, null, 2));
    
    console.log(`Successfully converted ${incidents.length} incidents`);
    console.log(`Output saved to: ${outputFile}`);
    
    // Print some statistics
    const withAutopilot = incidents.filter(i => i.vehicle?.autopilotStatus === 'Engaged').length;
    const totalDeaths = incidents.reduce((sum, i) => sum + (i.totalDeaths || 0), 0);
    
    console.log('\nStatistics:');
    console.log(`- Total incidents: ${incidents.length}`);
    console.log(`- Total deaths: ${totalDeaths}`);
    console.log(`- Incidents with autopilot engaged: ${withAutopilot}`);
    
  } catch (error) {
    console.error('Conversion failed:', error);
    process.exit(1);
  }
}

// Run the conversion
main();