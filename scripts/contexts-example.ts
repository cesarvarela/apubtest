import jsonld from "jsonld";
import { JsonLd, RemoteDocument } from "jsonld/jsonld-spec";
import { ContextMerger } from "../lib/ContextMerger";

// Core contexts - one per type for easier management
const coreIncidentContext: JsonLd = {
    "@context": {
        "@protected": true,
        
        "core": "https://example.org/core#",
        "schema": "https://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        
        // Type definition (matching nested-context.ts)
        "Incident": { "@id": "core:Incident", "@type": "@id" },
        
        // Incident-specific properties
        "id": "@id",
        "title": { "@id": "schema:name", "@type": "xsd:string" },
        "name": { "@id": "schema:name", "@type": "xsd:string" }
    }
};

const coreOrganizationContext: JsonLd = {
    "@context": {
        "@protected": true,
        
        "core": "https://example.org/core#",
        "schema": "https://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        
        // Type definition (matching nested-context.ts)
        "Organization": { "@id": "core:Organization", "@type": "@id" },
        
        // Organization-specific properties
        "id": "@id",
        "title": { "@id": "schema:name", "@type": "xsd:string" },
        "name": { "@id": "schema:name", "@type": "xsd:string" }
    }
};

const corePersonContext: JsonLd = {
    "@context": {
        "@protected": true,
        
        "core": "https://example.org/core#",
        "schema": "https://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        
        // Type definition  
        "Person": { "@id": "core:Person", "@type": "@id" },
        
        // Person-specific properties
        "id": "@id",
        "name": { "@id": "schema:name", "@type": "xsd:string" },
        "email": { "@id": "schema:email", "@type": "xsd:string" }
    }
};

// AIID contexts - extend core types with domain-specific properties
const aiidIncidentContext: JsonLd = {
    "@context": {
        "@protected": true,
        
        "aiid": "https://example.org/aiid#",
        "core": "https://example.org/core#",
        "schema": "https://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        
        "aiid:Incident": { "@id": "aiid:Incident", "@type": "@id" },
        
        "deployedBy": {
            "@id": "aiid:deployedBy",
            "@type": "@id",
            "@container": "@set"
        },
        "reports": {
            "@id": "aiid:reports",
            "@type": "@id",
            "@container": "@set"
        }
    }
};

// AIID Report context - separate from incident context
const aiidReportContext: JsonLd = {
    "@context": {
        "@protected": true,
        
        "aiid": "https://example.org/aiid#",
        "schema": "https://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        
        // AIID Report type
        "Report": { "@id": "aiid:Report", "@type": "@id" },
        
        // Report-specific properties
        "id": "@id"
    }
};

// Create merged contexts using the ContextMerger
const mergedCoreContext = ContextMerger.mergeContexts([
    coreIncidentContext,
    coreOrganizationContext,
    corePersonContext
]);

const mergedAiidContext = ContextMerger.mergeContexts([
    aiidIncidentContext,
    aiidReportContext
]);

// Example payload using the hybrid approach with merged contexts
const hybridPayload = {
    "@context": [
        "https://example.org/core/context",      // Merged core context
        "https://example.org/aiid/context"       // Merged AIID context
    ],
    "@type": [
        "core:Incident",
        "aiid:Incident"
    ],
    "@id": "https://aiid.example.org/incident/42",
    "title": "Robot mis-classification leads to recall",
    
    "deployedBy": [
        {
            "@type": "core:Organization",
            "@id": "https://example.org/org/AcmeCorp",
            "name": "Acme Corp"
        }
    ],
    
    "reports": [
        {
            "@type": "aiid:Report",
            "@id": "https://example.org/report/123",
            "title": "Initial press coverage",
            "url": "https://news.example.com/story/abc"
        }
    ]
};


// Document loader
const documentLoader = (url: string): Promise<RemoteDocument> => {
    // Merged contexts
    if (url === "https://example.org/core/context") {
        return Promise.resolve({
            contextUrl: undefined,
            document: mergedCoreContext,
            documentUrl: url
        });
    }
    if (url === "https://example.org/aiid/context") {
        return Promise.resolve({
            contextUrl: undefined,
            document: mergedAiidContext,
            documentUrl: url
        });
    }
    
    return Promise.reject(new Error(`Unknown context: ${url}`));
};

async function showExpansion(name: string, data: JsonLd) {
    console.log(`\n=== ${name} ===`);
    console.log("Compact form:", JSON.stringify(data, null, 2));
    
    try {
        const expanded = await jsonld.expand(data, { documentLoader });
        console.log("\nExpanded form:");
        console.log(JSON.stringify(expanded[0], null, 2));
    } catch (e) {
        console.error("Expansion failed:", e);
    }
}


(async () => {
    console.log("=== Hybrid Approach: Merged Contexts ===\n");
    
    await showExpansion("Hybrid Incident with Merged Contexts", hybridPayload);
    
    console.log("\n=== Merged Core Context ===");
    console.log(JSON.stringify(mergedCoreContext, null, 2));
    
    console.log("\n=== Merged AIID Context ===");
    console.log(JSON.stringify(mergedAiidContext, null, 2));
})();