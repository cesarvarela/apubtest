// validate-aiid-typeScoped.ts
//------------------------------------------------------------
// npm i jsonld ajv ajv-formats
// npx ts-node validate-aiid-typeScoped.ts
//------------------------------------------------------------
import jsonld, { JsonLdDocument } from "jsonld";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { JsonLd, RemoteDocument } from "jsonld/jsonld-spec";

/* ────────────────────────────────
   1️⃣  JSON-LD contexts
   ────────────────────────────────*/

// — Core (unchanged) —
const coreContext: JsonLd = {
    "@context": {
        "core": "https://example.org/core#",
        "schema": "https://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",

        "Incident": { "@id": "core:Incident", "@type": "@id" },
        "System": { "@id": "core:System", "@type": "@id" },
        "Person": { "@id": "core:Person", "@type": "@id" },
        "Organization": { "@id": "core:Organization", "@type": "@id" },

        "id": "@id",
        "title": { "@id": "schema:name", "@type": "xsd:string" },
        "name": { "@id": "schema:name", "@type": "xsd:string" }
    }
};

// — AIID *type-scoped* (depends on core being loaded first) —
const aiidContext: JsonLd = {
    "@context": {
        "aiid": "https://example.org/aiid#",
        "core": "https://example.org/core#",

        "aiid:Incident": {
            "@id": "aiid:Incident",
            "@context": {
                "Report": { "@id": "aiid:Report", "@type": "@id" },

                "deployedBy": {
                    "@id": "aiid:deployedBy",
                    "@type": "@id",
                    "@container": "@set"
                },
                "reports": {
                    "@id": "aiid:reports",
                    "@type": "@id",
                    "@container": "@set"
                },

                /* Optional scalar re-exports */
                "title": { "@id": "schema:name", "@type": "xsd:string" },
                "url": { "@id": "schema:url", "@type": "@id" }
            }
        }
    }
};

/* ────────────────────────────────
   2️⃣  Sample payload (compact form)
   ────────────────────────────────*/
const payload = {
    "@context": [
        "https://example.org/core/context",
        "https://example.org/aiid/context"
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

/* ────────────────────────────────
   3️⃣  Expand JSON-LD (debug)
   ────────────────────────────────*/
async function expand(data: JsonLdDocument) {
    // Create a document loader that can resolve our context URLs
    const documentLoader = (url: string): Promise<RemoteDocument> => {
        if (url === "https://example.org/core/context") {
            return Promise.resolve({
                contextUrl: undefined,
                document: coreContext,
                documentUrl: url
            });
        }
        if (url === "https://example.org/aiid/context") {
            return Promise.resolve({
                contextUrl: undefined,
                document: aiidContext,
                documentUrl: url
            });
        }
        // Default behavior for other URLs
        return Promise.reject(new Error(`Unknown context URL: ${url}`));
    };

    const expanded = await jsonld.expand(data, { documentLoader });

    console.log("✓ JSON-LD expansion OK (showing first node):\n", JSON.stringify(expanded[0], null, 2));
    return expanded;
}

/* ────────────────────────────────
   4️⃣  JSON Schema for the compact form
   ────────────────────────────────*/
const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "ExtendedIncident (compact form)",
    type: "object",
    required: ["@id", "title", "deployedBy"],
    properties: {
        "@context": {
            type: "array",
            items: { type: "string", format: "uri" }
        },
        "@type": { type: "array", items: { type: "string", format: "uri" } },
        "@id": { type: "string", format: "uri" },
        "title": { type: "string" },

        "deployedBy": {
            type: "array",
            minItems: 1,
            items: {
                type: "object",
                required: ["@type", "@id", "name"],
                properties: {
                    "@type": { enum: ["core:Person", "core:Organization"] },
                    "@id": { type: "string", format: "uri" },
                    "name": { type: "string" }
                },
                additionalProperties: false
            }
        },

        "reports": {
            type: "array",
            items: {
                type: "object",
                required: ["@type", "@id", "title", "url"],
                properties: {
                    "@type": { const: "aiid:Report" },
                    "@id": { type: "string", format: "uri" },
                    "title": { type: "string" },
                    "url": { type: "string", format: "uri" }
                },
                additionalProperties: false
            }
        }
    },
    additionalProperties: false
};

function validate(data: unknown) {
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    const validateFn = ajv.compile(schema);
    const ok = validateFn(data);
    if (!ok) {
        console.error("✗ Schema validation errors:", validateFn.errors);
        process.exit(1);
    }
    console.log("✓ JSON Schema validation passed.");
}

/* ────────────────────────────────
   5️⃣  Run
   ────────────────────────────────*/
(async () => {
    console.log("Validating compact form...");
    validate(payload);               // validate the Incident itself

    console.log("\nExpanding JSON-LD...");
    await expand(payload);
})();