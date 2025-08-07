import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate dates
function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

// Helper to pick random items from array
function pickRandom<T>(arr: T[], count: number = 1): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Helper to generate random amount in range
function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

// Countries pool (from IC3 report context)
const countries = [
  "United States", "Canada", "United Kingdom", "India", "Nigeria", 
  "China", "Philippines", "Ghana", "Mexico", "South Africa",
  "Pakistan", "Colombia", "Bangladesh", "Kenya", "Jamaica"
];

// Threat actor groups
const threatActors = [
  "Lazarus Group", "APT28", "FIN7", "Carbanak", "Evil Corp",
  "DarkHydrus", "TA505", "Silent Librarian", "Cobalt Group",
  "MoneyTaker", "BeagleBoyz", "Hidden Cobra", "Wizard Spider"
];

// Victim demographics
const victimGroups = [
  { ageRange: "Under 20", percentage: 2 },
  { ageRange: "20-29", percentage: 12 },
  { ageRange: "30-39", percentage: 18 },
  { ageRange: "40-49", percentage: 20 },
  { ageRange: "50-59", percentage: 19 },
  { ageRange: "Over 60", percentage: 29 }
];

// Business sectors
const sectors = [
  "Healthcare", "Financial Services", "Energy", "Government",
  "Manufacturing", "Retail", "Education", "Technology",
  "Transportation", "Real Estate", "Legal Services", "Non-Profit"
];

// IC3 Crime Types from 2024 report
const crimeCategories = {
  "Investment Fraud": {
    losses: 4570000000,
    complaints: 39570,
    techniques: ["Cryptocurrency fraud", "Ponzi schemes", "Advance fee fraud"],
    description: "Fraudulent investment opportunities promising high returns"
  },
  "Business Email Compromise": {
    losses: 2950000000,
    complaints: 21489,
    techniques: ["CEO fraud", "Account compromise", "False invoice schemes"],
    description: "Sophisticated scams targeting businesses through compromised email accounts"
  },
  "Tech Support Scams": {
    losses: 924500000,
    complaints: 37560,
    techniques: ["Pop-up warnings", "Remote access", "Fake refunds"],
    description: "Impersonating tech support to gain access to victims' devices"
  },
  "Data Breach": {
    losses: 734500000,
    complaints: 8951,
    techniques: ["Ransomware", "SQL injection", "Phishing"],
    description: "Unauthorized access to sensitive data"
  },
  "Romance Scams": {
    losses: 652500000,
    complaints: 9474,
    techniques: ["Catfishing", "Money requests", "Investment opportunities"],
    description: "Criminals exploit victims through online relationships"
  },
  "Ransomware": {
    losses: 594080000,
    complaints: 2825,
    techniques: ["File encryption", "Double extortion", "RaaS"],
    description: "Malware that encrypts data and demands payment"
  },
  "Government Impersonation": {
    losses: 394050000,
    complaints: 14591,
    techniques: ["Tax scams", "Social Security fraud", "Law enforcement impersonation"],
    description: "Criminals posing as government officials"
  },
  "Real Estate Fraud": {
    losses: 145240000,
    complaints: 9521,
    techniques: ["Wire fraud", "Title fraud", "Rental scams"],
    description: "Fraud related to property transactions"
  },
  "Identity Theft": {
    losses: 125450000,
    complaints: 12157,
    techniques: ["Account takeover", "Synthetic identity", "Tax fraud"],
    description: "Theft and misuse of personal information"
  },
  "Phishing": {
    losses: 118550000,
    complaints: 34029,
    techniques: ["Spear phishing", "Whaling", "Vishing", "Smishing"],
    description: "Deceptive messages to steal credentials or information"
  }
};

// Generate IC3 incident based on category
function generateIC3Incident(category: string, categoryData: any, index: number): any {
  const date = randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31));
  const victimCount = Math.floor(Math.random() * 100) + 1;
  const lossPerVictim = categoryData.losses / categoryData.complaints;
  const totalLoss = Math.floor(lossPerVictim * victimCount * (0.5 + Math.random()));
  
  // Pick random victim demographics
  const demographics = pickRandom(victimGroups, 3).map(group => ({
    ...group,
    count: Math.floor(victimCount * group.percentage / 100)
  }));

  const dateObj = new Date(date);
  const earlierDate = new Date(dateObj.getTime() - 30 * 24 * 60 * 60 * 1000);

  const incident = {
    "@context": [
      "http://localhost:3000/api/schemas/v1/core/context.jsonld",
      "http://localhost:3001/api/schemas/v1/ic3/context.jsonld"
    ],
    "@type": "ic3:Incident",
    "@id": `https://www.ic3.gov/incident/2024/${String(index).padStart(6, '0')}`,
    
    incidentId: `IC3-2024-${String(index).padStart(6, '0')}`,
    title: `${category} Campaign Targeting ${pickRandom(sectors)[0]} Sector`,
    description: `${categoryData.description}. This incident involved ${victimCount} victims across multiple states, utilizing ${pickRandom(categoryData.techniques)[0].toLowerCase()} techniques.`,
    
    dateReported: date,
    dateOccurred: randomDate(earlierDate, dateObj),
    
    incidentType: category,
    category: "Cyber-Enabled Fraud",
    
    totalLosses: totalLoss,
    victimCount: victimCount,
    
    techniques: pickRandom(categoryData.techniques, Math.min(2, categoryData.techniques.length)),
    
    threatActor: {
      "@type": "core:Organization",
      "@id": `https://attack.mitre.org/groups/${pickRandom(threatActors)[0].replace(/\s+/g, '_')}`,
      name: pickRandom(threatActors)[0],
      operatingCountries: pickRandom(countries.filter(c => c !== "United States"), 2).map(country => ({
        "@type": "core:Country",
        "@id": `https://en.wikipedia.org/wiki/${country.replace(/\s+/g, '_')}`,
        name: country
      }))
    },
    
    affectedCountries: ["United States", ...pickRandom(countries.filter(c => c !== "United States"), Math.random() > 0.5 ? 1 : 0)].map(country => ({
      "@type": "core:Country",
      "@id": `https://en.wikipedia.org/wiki/${country.replace(/\s+/g, '_')}`,
      name: country
    })),
    
    victimDemographics: [
      ...demographics.map(demo => ({
        "@type": "ic3:VictimGroup",
        ageRange: demo.ageRange,
        percentage: demo.percentage,
        count: demo.count
      })),
      {
        "@type": "ic3:VictimGroup",
        primarySector: pickRandom(sectors)[0]
      },
      {
        "@type": "ic3:VictimGroup",
        geographicDistribution: pickRandom(["Nationwide", "Regional", "State-specific", "International"])[0]
      }
    ],
    
    investigationStatus: pickRandom(["Open", "Under Investigation", "Referred to FBI", "Closed"])[0],
    
    relatedIncidents: Math.random() > 0.7 ? [
      `IC3-2024-${String(Math.floor(Math.random() * 500000)).padStart(6, '0')}`
    ] : undefined,
    
    indicators: {
      cryptocurrency: category === "Investment Fraud" || Math.random() > 0.6,
      businessEmailCompromise: category === "Business Email Compromise",
      elderFraud: demographics.find(d => d.ageRange === "Over 60")?.count > victimCount * 0.4,
      dataCompromise: category === "Data Breach" || category === "Ransomware"
    },
    
    mitigations: [
      "Multi-factor authentication",
      "Email filtering and authentication",
      "Security awareness training",
      "Incident response planning"
    ].filter(() => Math.random() > 0.5),
    
    sources: [
      {
        "@type": "core:Source",
        name: "IC3 Complaint Database",
        url: "https://www.ic3.gov/Home/ComplaintForm"
      }
    ]
  };

  // Add technique-specific fields
  if (category === "Ransomware") {
    incident["ransomwareVariant"] = pickRandom(["LockBit", "ALPHV/BlackCat", "Cl0p", "Royal", "Black Basta"])[0];
    incident["initialAccessVector"] = pickRandom(["Phishing", "RDP compromise", "Supply chain", "Zero-day exploit"])[0];
  }

  if (category === "Business Email Compromise") {
    incident["becType"] = pickRandom(["CEO Fraud", "Account Compromise", "False Invoice", "Attorney Impersonation", "Data Theft"])[0];
    incident["wireTransferRequested"] = true;
  }

  if (category === "Romance Scams") {
    incident["platform"] = pickRandom(["Dating app", "Social media", "Online game", "Professional networking site"])[0];
    incident["relationshipDuration"] = `${randomAmount(1, 12)} months`;
  }

  return incident;
}

// Generate synthetic variation of IC3 incident
function generateSyntheticVariation(baseCategory: string, index: number): any {
  const variations = {
    "Emerging Threats": [
      {
        title: "Deepfake Audio Used in Executive Impersonation",
        description: "Criminals used AI-generated voice cloning to impersonate company executives, convincing employees to transfer funds to fraudulent accounts.",
        techniques: ["Deepfake technology", "Voice cloning", "Social engineering"],
        losses: 2500000
      },
      {
        title: "Cryptocurrency Investment Scam via Social Media",
        description: "Fraudsters used social media platforms to promote fake cryptocurrency investment opportunities, targeting users with promises of guaranteed returns.",
        techniques: ["Pig butchering", "Cryptocurrency fraud", "Social media exploitation"],
        losses: 15000000
      },
      {
        title: "Supply Chain Ransomware Attack",
        description: "Threat actors compromised a software provider to distribute ransomware to multiple downstream victims through trusted update mechanisms.",
        techniques: ["Supply chain attack", "Ransomware", "Living off the land"],
        losses: 45000000
      }
    ],
    "Hybrid Attacks": [
      {
        title: "Combined BEC and Ransomware Campaign",
        description: "Attackers first compromised business email accounts to gather intelligence, then deployed ransomware for maximum impact.",
        techniques: ["Business email compromise", "Ransomware", "Data exfiltration"],
        losses: 8500000
      },
      {
        title: "Tech Support Scam Leading to Identity Theft",
        description: "Fake tech support gained remote access to devices, then harvested personal information for identity theft schemes.",
        techniques: ["Tech support fraud", "Remote access", "Identity theft"],
        losses: 3200000
      }
    ]
  };

  const categoryVariations = variations[baseCategory] || variations["Emerging Threats"];
  const variation = pickRandom(categoryVariations)[0];
  const date = randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31));
  const victimCount = randomAmount(10, 500);
  
  const dateObj = new Date(date);
  const earlierDate = new Date(dateObj.getTime() - 60 * 24 * 60 * 60 * 1000);

  return {
    "@context": [
      "http://localhost:3000/api/schemas/v1/core/context.jsonld",
      "http://localhost:3001/api/schemas/v1/ic3/context.jsonld"
    ],
    "@type": "ic3:Incident",
    "@id": `https://www.ic3.gov/incident/2024/${String(index).padStart(6, '0')}`,
    
    incidentId: `IC3-2024-${String(index).padStart(6, '0')}`,
    title: variation.title,
    description: variation.description,
    
    dateReported: date,
    dateOccurred: randomDate(earlierDate, dateObj),
    
    incidentType: "Emerging Cyber Threat",
    category: baseCategory,
    
    totalLosses: variation.losses,
    victimCount: victimCount,
    
    techniques: variation.techniques,
    
    threatActor: Math.random() > 0.3 ? {
      "@type": "core:Organization",
      "@id": `https://attack.mitre.org/groups/UNKNOWN`,
      name: "Unknown Threat Actor",
      operatingCountries: pickRandom(countries, 2).map(country => ({
        "@type": "core:Country",
        "@id": `https://en.wikipedia.org/wiki/${country.replace(/\s+/g, '_')}`,
        name: country
      }))
    } : undefined,
    
    affectedCountries: pickRandom(countries, randomAmount(1, 4)).map(country => ({
      "@type": "core:Country",
      "@id": `https://en.wikipedia.org/wiki/${country.replace(/\s+/g, '_')}`,
      name: country
    })),
    
    victimDemographics: [
      {
        "@type": "ic3:VictimGroup",
        primarySector: pickRandom(sectors)[0]
      },
      {
        "@type": "ic3:VictimGroup",
        geographicDistribution: "Multi-state"
      }
    ],
    
    investigationStatus: "Under Investigation",
    
    indicators: {
      cryptocurrency: variation.techniques.includes("Cryptocurrency fraud"),
      businessEmailCompromise: variation.techniques.includes("Business email compromise"),
      elderFraud: false,
      dataCompromise: variation.techniques.includes("Data exfiltration")
    },
    
    emergingThreatIndicators: {
      usesAI: variation.techniques.some(t => t.includes("Deepfake") || t.includes("AI")),
      targetsCriticalInfrastructure: Math.random() > 0.7,
      crossBorder: true
    },
    
    sources: [
      {
        "@type": "core:Source",
        name: "IC3 Complaint Database",
        url: "https://www.ic3.gov/Home/ComplaintForm"
      },
      {
        "@type": "core:Source",
        name: "FBI Cyber Division",
        url: "https://www.fbi.gov/investigate/cyber"
      }
    ]
  };
}

// Main generation function
function generateIC3Incidents() {
  const incidents = [];
  let incidentIndex = 1;

  // Generate incidents for each major category (about 200 incidents)
  for (const [category, data] of Object.entries(crimeCategories)) {
    // Generate 15-25 incidents per category
    const incidentCount = randomAmount(15, 25);
    for (let i = 0; i < incidentCount; i++) {
      incidents.push(generateIC3Incident(category, data, incidentIndex++));
    }
  }

  // Generate synthetic/emerging threat incidents (about 50 incidents)
  const syntheticCount = 50;
  for (let i = 0; i < syntheticCount; i++) {
    const baseCategory = Math.random() > 0.5 ? "Emerging Threats" : "Hybrid Attacks";
    incidents.push(generateSyntheticVariation(baseCategory, incidentIndex++));
  }

  // Sort by date
  incidents.sort((a, b) => a.dateReported.localeCompare(b.dateReported));

  // Renumber based on sorted order
  incidents.forEach((incident, index) => {
    incident.incidentId = `IC3-2024-${String(index + 1).padStart(6, '0')}`;
    incident["@id"] = `https://www.ic3.gov/incident/2024/${String(index + 1).padStart(6, '0')}`;
  });

  // Return just the array of incidents, like the AIID converted sample
  return incidents;
}

// Generate and save
const ic3Data = generateIC3Incidents();
const outputPath = path.join(__dirname, '../data/ic3-incidents.json');
fs.writeFileSync(outputPath, JSON.stringify(ic3Data, null, 2));

console.log(`Generated ${ic3Data.length} IC3 incidents`);

// Calculate stats for logging
const totalLosses = ic3Data.reduce((sum, inc) => sum + inc.totalLosses, 0);
const totalVictims = ic3Data.reduce((sum, inc) => sum + inc.victimCount, 0);

console.log(`Total losses: $${totalLosses.toLocaleString()}`);
console.log(`Total victims: ${totalVictims.toLocaleString()}`);
console.log(`Output saved to: ${outputPath}`);

// Also create a simpler version for easier processing
const simplifiedIncidents = {
  data: {
    incidents: ic3Data.map(inc => ({
      incidentId: inc.incidentId,
      title: inc.title,
      type: inc.incidentType,
      losses: inc.totalLosses,
      victims: inc.victimCount,
      date: inc.dateReported,
      techniques: inc.techniques
    }))
  }
};

const simplifiedPath = path.join(__dirname, '../data/ic3-incidents-simple.json');
fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedIncidents, null, 2));
console.log(`Simplified version saved to: ${simplifiedPath}`);