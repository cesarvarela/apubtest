import Ajv, { type SchemaObject } from "ajv";
import addFormats from "ajv-formats";
import { SchemaGenerator } from "./schemas";

export class Validator {

    private ajv: Ajv;
    private registry: Record<string, string> = {};
    private initialized = false;

    constructor() {
        this.ajv = new Ajv({ allErrors: true, strict: false });
        addFormats(this.ajv);
    }

    async initialize(schemaGenerator: SchemaGenerator) {
        if (this.initialized) {
            return;
        }

        try {
            const coreSchema = await schemaGenerator.getCoreSchema();
            this.registerSchema(schemaGenerator.coreContextUrl, coreSchema);

            if (await schemaGenerator.hasLocalSchema()) {
                const localSchema = await schemaGenerator.getLocalSchema();
                this.registerSchema(schemaGenerator.localContextUrl, localSchema);
            }

            this.initialized = true;
            console.log('Validator initialized with schemas');
        } catch (error) {
            console.error('Failed to initialize validator:', error);
            throw error;
        }
    }

    registerSchema(contextUrl: string, jsonSchema: SchemaObject) {
        if (this.registry[contextUrl]) {
            throw new Error(`Schema already registered for context: ${contextUrl}`);
        }

        if (!jsonSchema.$id) {
            throw new Error(`JSON Schema must have a $id property: ${contextUrl}`);
        }

        this.registry[contextUrl] = jsonSchema.$id;
        this.ajv.addSchema(jsonSchema, jsonSchema.$id);
        
        // Mark as initialized since schemas are being manually registered
        this.initialized = true;
    }

    validateIncident(payload: any) {

        if (!this.initialized) {
            throw new Error('Validator not initialized. Call initialize() first.');
        }

        if (!payload["@context"] || !this.registry[payload["@context"]]) {
            throw new Error(`No schema registered for context: ${payload["@context"]}`);
        }

        const schemaId = this.registry[payload["@context"]];
        const validate = this.ajv.getSchema(schemaId);

        if (!validate) {
            throw new Error(`No schema found for ID: ${schemaId}`);
        }

        const valid = validate(payload);

        if (!valid) {
            throw new Error(`Validation failed for payload: ${this.ajv.errorsText(validate.errors)}`);
        }

        return valid;
    }
}