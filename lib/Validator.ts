import Ajv from "ajv";
import addFormats from "ajv-formats";
import { SchemaManager } from "./SchemaManager";

export class Validator {

    private ajv: Ajv;
    private schemaManager: SchemaManager;
    private namespace: string;

    constructor(schemaManager: SchemaManager) {

        this.ajv = new Ajv({ allErrors: true, strict: false });
        this.schemaManager = schemaManager;
        this.namespace = schemaManager.namespace;

        addFormats(this.ajv);
    }

    async validate(payload: any): Promise<void> {

        const typesToValidate = this.extractTypesFromPayload(payload);

        if (!typesToValidate || typesToValidate.length === 0) {
            throw new Error('No types found in payload to validate against');
        }

        for (const type of typesToValidate) {
            // Determine namespace from type prefix
            const namespace = this.getNamespaceFromType(type);
            
            const schema = await this.schemaManager.getSchema('validation', namespace, type);
            
            if (!schema) {
                throw new Error(`Schema not found for type: ${type}`);
            }

            const validate = this.ajv.compile(schema);

            const valid = validate(payload);

            if (!valid) {
                const errorDetails = validate.errors?.map(error => ({
                    instancePath: error.instancePath,
                    schemaPath: error.schemaPath,
                    keyword: error.keyword,
                    message: error.message,
                    params: error.params,
                    data: error.data
                })) || [];

                throw new Error(`Validation failed for type "${type}": ${JSON.stringify(errorDetails, null, 2)}`);
            }
        }

        // All validations passed
    }

    private getNamespaceFromType(type: string): string {
        // Extract namespace from type (e.g., "core:Incident" -> "core", "aiid:Report" -> "aiid")
        const colonIndex = type.indexOf(':');
        if (colonIndex > 0) {
            return type.substring(0, colonIndex);
        }
        // If no colon, assume it's in the default namespace
        return this.namespace;
    }

    private extractTypesFromPayload(payload: any): string[] {
        const type = payload['@type'];
        if (!type) {
            return [];
        }

        return Array.isArray(type) ? type : [type];
    }
}