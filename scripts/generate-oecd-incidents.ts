import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read AIID data to understand real incidents
const aiidPath = path.join(__dirname, '../data/aiid.json');
const aiidData = JSON.parse(fs.readFileSync(aiidPath, 'utf-8'));
const aiidIncidents = aiidData.data.incidents;

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

// Countries pool
const countries = [
  "United States", "United Kingdom", "Germany", "France", "Japan", "China", 
  "India", "Brazil", "Canada", "Australia", "South Korea", "Netherlands",
  "Sweden", "Italy", "Spain", "Mexico", "Singapore", "Israel", "Norway"
];

// Stakeholder groups
const stakeholderGroups = [
  "Consumer", "Children", "Workers", "Trade unions", "Business", 
  "Government", "Civil society", "General public"
];

// Business functions
const businessFunctions = [
  "Human resource management", "Sales", "ICT management and information security",
  "Marketing and advertisement", "Logistics", "Citizen/customer service",
  "Procurement", "Maintenance", "Accounting", "Monitoring and quality control",
  "Production", "Planning and budgeting", "Research and development",
  "Compliance and justice"
];

// Real organizations from AIID
const techCompanies = [
  "Google", "Microsoft", "Amazon", "Apple", "Tesla", "Uber", "YouTube",
  "LinkedIn", "Wikipedia", "Starbucks", "Boeing", "Volkswagen", "Nest Labs"
];

const researchOrgs = [
  "Microsoft Research", "Boston University", "MIT Media Lab", 
  "University of Washington", "USC Information Sciences Institute"
];

const governmentOrgs = [
  "United States Government", "New York city Dept. of Education",
  "Delhi Metro Rail Corporation", "New Zealand"
];

const otherOrgs = [
  "Hospitals", "Doctors", "Northpointe", "Equivant", "Keolis North America",
  "Navya", "Delphi Technologies", "St George's Hospital Medical School",
  "Youth Laboratories", "The DAO", "Frontier Development"
];

// Affected parties from AIID
const affectedParties = [
  "Children", "Black people", "Women", "Minority Groups", "Workers",
  "Students", "Patients", "Pedestrians", "Motorists", "Airplane Passengers",
  "Bus passengers", "Medical Residents", "Job applicants", "Consumers"
];

// Generate incident based on AIID data
function generateAIIDLinkedIncident(aiidIncident: any, index: number) {
  const baseYear = parseInt(aiidIncident.date.split('-')[0]);
  const newDate = randomDate(
    new Date(baseYear, 0, 1), 
    new Date(baseYear + 2, 11, 31)
  );

  // Create variations based on the original incident
  const variations = {
    1: { // YouTube Kids
      title: "AI Content Moderation Failure Exposes Children to Harmful Content",
      description: "An AI-powered content filtering system failed to detect and remove disturbing videos targeted at children on a video platform. The system's machine learning algorithms were unable to identify harmful content disguised with child-friendly thumbnails and titles, exposing thousands of children to violent and inappropriate material.",
      ai_system_relation: ["Direct cause", "Failure to act"],
      severity: "Serious incident",
      harm_type: ["Psychological", "Human or fundamental rights"]
    },
    23: { // Las Vegas shuttle
      title: "Autonomous Vehicle Navigation Failure in Mixed Traffic Environment",
      description: "An autonomous shuttle's AI system failed to properly communicate its intentions to human drivers, resulting in a collision. The vehicle's prediction algorithms did not account for aggressive human driving behaviors, leading to situations where the AV's conservative responses created dangerous scenarios.",
      ai_system_relation: ["Contributing factor", "Failure to act"],
      severity: "Incident",
      harm_type: ["Economic/property", "Public interest/critical infrastructure"]
    },
    4: { // Uber AV
      title: "Computer Vision System Fails to Detect Pedestrian in Low Light Conditions",
      description: "An autonomous vehicle's perception system failed to correctly classify and track a pedestrian crossing outside of designated areas at night. The AI system's object detection algorithms showed critical weaknesses in edge cases involving unusual pedestrian behavior and poor lighting conditions.",
      ai_system_relation: ["Direct cause", "Failure to act"],
      severity: "Disaster",
      harm_type: ["Physical"]
    },
    12: { // Word embeddings
      title: "AI Language Model Perpetuates Gender Stereotypes in Job Matching",
      description: "A job recommendation system using word embeddings consistently associated technical roles with male candidates and caregiving roles with female candidates. The bias in the underlying language model led to discriminatory job suggestions affecting thousands of job seekers.",
      ai_system_relation: ["Direct cause", "Contributing factor"],
      severity: "Serious incident",
      harm_type: ["Economic/property", "Human or fundamental rights"]
    },
    6: { // Tay bot
      title: "Conversational AI System Manipulated to Generate Extremist Content",
      description: "A chatbot designed for customer service was exploited through adversarial inputs to generate hateful and extremist responses. The system's learning algorithms were vulnerable to coordinated manipulation, requiring emergency shutdown and complete retraining.",
      ai_system_relation: ["Direct cause", "Intentional misuse"],
      severity: "Serious incident",
      harm_type: ["Psychological", "Reputational", "Human or fundamental rights"]
    }
  };

  const variation = variations[aiidIncident.incident_id as keyof typeof variations] || {
    title: `AI System Failure Related to ${aiidIncident.title}`,
    description: `An AI system failure occurred with similar characteristics to the documented incident involving ${aiidIncident.AllegedDeployerOfAISystem[0]?.name}. The system exhibited comparable failure modes resulting in harm to affected stakeholders.`,
    ai_system_relation: ["Direct cause"],
    severity: "Serious incident",
    harm_type: ["Other (various)"]
  };

  return {
    incident_id: `OECD-${newDate.substring(0, 4)}-${String(index).padStart(3, '0')}`,
    title: variation.title,
    description: variation.description,
    ai_system_relation: variation.ai_system_relation,
    submitter: {
      role: pickRandom([
        "AI Safety Researcher", "Industry Analyst", "Government Inspector",
        "Academic Researcher", "Journalist", "Ethics Officer"
      ])[0],
      email: "submitter@example.org",
      affiliation: pickRandom([
        "AI Safety Institute", "Tech Policy Center", "Digital Rights Foundation",
        "University Research Lab", "Government Oversight Committee"
      ])[0],
      stakeholder_group: pickRandom([
        "I represent a government or regulatory body",
        "I work or am affiliated to a public interest body or NGO",
        "None of the above, but have partial or substantial knowledge of the incident"
      ])[0],
      relation_to_incident: pickRandom([
        "None of the above, but have partial or substantial knowledge of the incident (e.g. first-hand knowledge, research etc.)",
        "I am a user of the related AI system",
        "I am an affected stakeholder"
      ])[0]
    },
    date_of_occurrence: newDate,
    countries: pickRandom(countries, Math.floor(Math.random() * 3) + 1),
    ai_system: {
      name: `${pickRandom(["Smart", "AI", "Automated", "Intelligent"])[0]} ${pickRandom(["System", "Platform", "Engine", "Solution"])[0]}`,
      version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}`
    },
    organizations: {
      developer: aiidIncident.AllegedDeployerOfAISystem?.[0]?.name || pickRandom([...techCompanies, ...researchOrgs])[0],
      deployer: aiidIncident.AllegedDeployerOfAISystem?.[0]?.name || pickRandom([...techCompanies, ...governmentOrgs, ...otherOrgs])[0]
    },
    severity: variation.severity,
    harm_type: variation.harm_type,
    harm_quantification: {
      affected_stakeholders: `${Math.floor(Math.random() * 50000) + 100} individuals`,
      economic_losses: Math.random() > 0.5 ? `$${Math.floor(Math.random() * 10) + 1} million` : undefined,
      injury: aiidIncident.incident_id === 4 ? Math.floor(Math.random() * 5) : undefined,
      death: aiidIncident.incident_id === 4 && Math.random() > 0.8 ? 1 : undefined
    },
    unintended_use: Math.random() > 0.7,
    affected_stakeholders: aiidIncident.AllegedHarmedOrNearlyHarmedParties?.map((p: any) => p.name) || pickRandom(affectedParties, Math.floor(Math.random() * 2) + 1),
    business_function: pickRandom(businessFunctions, Math.floor(Math.random() * 2) + 1),
    sameAs: `https://incidentdatabase.ai/cite/${aiidIncident.incident_id}`
  };
}

// Generate completely synthetic incidents
function generateSyntheticIncident(index: number) {
  const incidentTypes = [
    {
      category: "Medical AI",
      templates: [
        {
          title: "AI Diagnostic System Misses Critical Symptoms in Emergency Department",
          description: "An AI triage system in emergency departments failed to identify critical symptoms in patients presenting with atypical manifestations of serious conditions. The system's training data lacked diversity in symptom presentations across different demographics.",
          harm_type: ["Physical", "Human or fundamental rights"],
          severity: "Serious hazard",
          business_function: ["Other (healthcare services)"]
        },
        {
          title: "Surgical Robot Malfunction During Minimally Invasive Procedure",
          description: "An AI-assisted surgical robot experienced a control system failure during a procedure, requiring emergency conversion to traditional surgery. The AI's motion planning algorithms failed to account for unexpected tissue resistance.",
          harm_type: ["Physical"],
          severity: "Serious incident",
          business_function: ["Other (healthcare services)"]
        }
      ]
    },
    {
      category: "Financial AI",
      templates: [
        {
          title: "AI Credit Scoring System Discriminates Against Recent Immigrants",
          description: "An automated credit scoring system systematically assigned lower credit scores to recent immigrants despite strong financial indicators. The AI model heavily weighted credit history length, creating unfair barriers to financial services.",
          harm_type: ["Economic/property", "Human or fundamental rights"],
          severity: "Serious incident",
          business_function: ["Other (financial services)"]
        },
        {
          title: "Algorithmic Trading System Triggers Market Manipulation Investigation",
          description: "High-frequency trading algorithms were found to be creating artificial price movements through coordinated trades. The AI systems learned to exploit market microstructure in ways that resembled illegal manipulation.",
          harm_type: ["Economic/property", "Public interest/critical infrastructure"],
          severity: "Serious hazard",
          business_function: ["Other (financial trading)"]
        }
      ]
    },
    {
      category: "Security/Surveillance",
      templates: [
        {
          title: "Facial Recognition System Falsely Identifies Protesters as Criminals",
          description: "A law enforcement facial recognition system incorrectly matched peaceful protesters with criminal database entries, leading to wrongful detentions. The AI system showed higher error rates for certain ethnic groups and in crowded scenarios.",
          harm_type: ["Physical", "Human or fundamental rights", "Reputational"],
          severity: "Serious incident",
          business_function: ["Compliance and justice"]
        },
        {
          title: "Predictive Policing Algorithm Creates Feedback Loops in Minority Neighborhoods",
          description: "An AI system for predicting crime hotspots consistently directed more police presence to minority neighborhoods, creating a self-reinforcing cycle where increased police presence led to more reported incidents, further biasing the algorithm.",
          harm_type: ["Human or fundamental rights", "Psychological"],
          severity: "Serious hazard",
          business_function: ["Compliance and justice", "Planning and budgeting"]
        }
      ]
    },
    {
      category: "Workplace AI",
      templates: [
        {
          title: "Employee Monitoring AI Incorrectly Flags Remote Workers as Unproductive",
          description: "An AI-powered employee productivity monitoring system incorrectly categorized focused work activities as idle time, leading to unfair performance reviews and terminations. The system failed to understand different working styles and break patterns.",
          harm_type: ["Economic/property", "Psychological", "Reputational"],
          severity: "Serious incident",
          business_function: ["Human resource management", "Monitoring and quality control"]
        },
        {
          title: "AI Interview System Shows Bias Against Non-Native Speakers",
          description: "An automated video interview analysis system consistently gave lower scores to qualified candidates with accents or non-native speech patterns. The AI's speech recognition and sentiment analysis components showed significant bias.",
          harm_type: ["Economic/property", "Human or fundamental rights"],
          severity: "Serious incident",
          business_function: ["Human resource management"]
        }
      ]
    },
    {
      category: "Autonomous Systems",
      templates: [
        {
          title: "Delivery Robot Swarm Blocks Emergency Vehicle Access",
          description: "A fleet of autonomous delivery robots failed to coordinate their movements during an emergency, blocking paramedic access to a medical emergency. The swarm intelligence system lacked proper emergency vehicle detection and response protocols.",
          harm_type: ["Physical", "Public interest/critical infrastructure"],
          severity: "Serious hazard",
          business_function: ["Logistics", "Other (delivery services)"]
        },
        {
          title: "Agricultural AI Misidentifies Crops Leading to Herbicide Damage",
          description: "An AI-powered crop monitoring and treatment system misidentified valuable crops as weeds, resulting in herbicide application that destroyed thousands of acres of produce. The computer vision model was not properly validated for the specific crop varieties.",
          harm_type: ["Economic/property", "Environmental"],
          severity: "Serious incident",
          business_function: ["Production", "Other (agriculture)"]
        }
      ]
    },
    {
      category: "Consumer AI",
      templates: [
        {
          title: "Smart Home AI Creates Dangerous Living Conditions for Elderly",
          description: "An AI-powered smart home system learned incorrect patterns from an elderly resident with dementia, subsequently creating dangerous conditions by adjusting heating, lighting, and security settings inappropriately.",
          harm_type: ["Physical", "Psychological"],
          severity: "Serious hazard",
          business_function: ["Citizen/customer service", "Other (home automation)"]
        },
        {
          title: "AI Personal Assistant Shares Private Information in Group Settings",
          description: "A voice-activated AI assistant failed to recognize multi-user environments and shared personal calendar entries, medical reminders, and financial information when responding to queries in group settings.",
          harm_type: ["Reputational", "Human or fundamental rights"],
          severity: "Serious incident",
          business_function: ["Citizen/customer service", "ICT management and information security"]
        }
      ]
    }
  ];

  const type = pickRandom(incidentTypes)[0];
  const template = pickRandom(type.templates)[0];
  const date = randomDate(new Date(2015, 0, 1), new Date(2024, 11, 31));

  return {
    incident_id: `OECD-${date.substring(0, 4)}-${String(index).padStart(3, '0')}`,
    title: template.title,
    description: template.description,
    ai_system_relation: pickRandom([
      ["Direct cause"],
      ["Contributing factor"],
      ["Direct cause", "Contributing factor"],
      ["Direct cause", "Failure to act"],
      ["Contributing factor", "Human error"]
    ])[0],
    submitter: {
      role: pickRandom([
        "Industry Whistleblower", "Academic Researcher", "Government Auditor",
        "Consumer Advocate", "Safety Engineer", "Data Scientist"
      ])[0],
      email: "reporter@example.org",
      affiliation: pickRandom([
        "Consumer Protection Agency", "University Ethics Lab", "Tech Accountability Project",
        "Digital Rights Organization", "AI Safety Coalition"
      ])[0],
      stakeholder_group: pickRandom([
        "I work or am affiliated to a public interest body or NGO",
        "I represent a government or regulatory body",
        "I am an affected stakeholder",
        "None of the above, but have partial or substantial knowledge of the incident"
      ])[0],
      relation_to_incident: "None of the above, but have partial or substantial knowledge of the incident (e.g. first-hand knowledge, research etc.)"
    },
    date_of_occurrence: date,
    countries: pickRandom(countries, Math.floor(Math.random() * 2) + 1),
    ai_system: {
      name: `${type.category} ${pickRandom(["System", "Platform", "Solution", "Engine"])[0]} ${Math.random() > 0.5 ? "Pro" : ""}`.trim(),
      version: `${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 20)}.${Math.floor(Math.random() * 100)}`
    },
    organizations: {
      developer: pickRandom([...techCompanies, ...researchOrgs, ...otherOrgs])[0],
      deployer: pickRandom([...techCompanies, ...governmentOrgs, ...otherOrgs, "Various organizations"])[0]
    },
    severity: template.severity,
    harm_type: template.harm_type,
    harm_quantification: {
      affected_stakeholders: `${Math.floor(Math.random() * 100000) + 100} ${pickRandom(["individuals", "users", "patients", "customers", "workers"])[0]}`,
      economic_losses: Math.random() > 0.3 ? `$${(Math.random() * 50).toFixed(1)} million` : undefined,
      psychological_impact: template.harm_type.includes("Psychological") ? "Documented stress and anxiety in affected population" : undefined
    },
    unintended_use: Math.random() > 0.8,
    affected_stakeholders: pickRandom(affectedParties, Math.floor(Math.random() * 3) + 1),
    business_function: template.business_function
  };
}

// Main generation function
function generateOECDIncidents() {
  const incidents = [];
  let incidentIndex = 1;

  // Generate AIID-linked incidents (about 60-80 incidents)
  const selectedAIIDIncidents = pickRandom(aiidIncidents, 15);
  for (const aiidIncident of selectedAIIDIncidents) {
    // Generate 4-6 variations for each AIID incident
    const variationCount = Math.floor(Math.random() * 3) + 4;
    for (let i = 0; i < variationCount; i++) {
      incidents.push(generateAIIDLinkedIncident(aiidIncident, incidentIndex++));
    }
  }

  // Generate synthetic incidents (about 200-250 incidents)
  const syntheticCount = 250 - incidents.length;
  for (let i = 0; i < syntheticCount; i++) {
    incidents.push(generateSyntheticIncident(incidentIndex++));
  }

  // Sort by date
  incidents.sort((a, b) => a.date_of_occurrence.localeCompare(b.date_of_occurrence));

  // Renumber based on sorted order
  incidents.forEach((incident, index) => {
    const year = incident.date_of_occurrence.substring(0, 4);
    incident.incident_id = `OECD-${year}-${String(index + 1).padStart(3, '0')}`;
  });

  return {
    data: {
      incidents: incidents,
      metadata: {
        total_incidents: incidents.length,
        aiid_linked: incidents.filter(i => 'sameAs' in i && i.sameAs).length,
        date_range: {
          earliest: incidents[0].date_of_occurrence,
          latest: incidents[incidents.length - 1].date_of_occurrence
        },
        generation_date: new Date().toISOString()
      }
    }
  };
}

// Generate and save
const oecdData = generateOECDIncidents();
const outputPath = path.join(__dirname, '../data/oecd.json');
fs.writeFileSync(outputPath, JSON.stringify(oecdData, null, 2));

console.log(`Generated ${oecdData.data.incidents.length} OECD incidents`);
console.log(`AIID-linked incidents: ${oecdData.data.metadata.aiid_linked}`);
console.log(`Output saved to: ${outputPath}`);