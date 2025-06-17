import Ajv, { type SchemaObject } from "ajv";
import addFormats from "ajv-formats";
import { SchemaGenerator } from "./schemas";

export class Validator {

    private ajv: Ajv;
    private registry: Record<string, string> = {};

    constructor() {
        this.ajv = new Ajv({ allErrors: true, strict: false });
        addFormats(this.ajv);
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
    }

    validateIncident(payload: any) {

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

export const schemasGenerator = new SchemaGenerator(process.env.CORE_DOMAIN!, process.env.LOCAL_DOMAIN!, process.env.NAMESPACE!);

export const validator = new Validator();

validator.registerSchema(schemasGenerator.coreContextUrl, await schemasGenerator.getCoreSchema());
validator.registerSchema(schemasGenerator.localContextUrl, await schemasGenerator.getLocalSchema());
