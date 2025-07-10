import { SchemaManager } from "./SchemaManager";
import { Validator } from "./Validator";
import { ContentManager } from "./ContentManager";
import { db } from "@/db";

export async function getSchemaManager(): Promise<SchemaManager> {

    const schemaManager = new SchemaManager(
        db,
        process.env.NEXT_PUBLIC_CORE_DOMAIN!,
        process.env.NEXT_PUBLIC_LOCAL_DOMAIN!,
        process.env.NEXT_PUBLIC_NAMESPACE!
    );

    return schemaManager;
}

export async function getValidator(): Promise<Validator> {

    const schemaManager = await getSchemaManager();
    const validator = new Validator(schemaManager);

    return validator;
}

export async function getContentManager(): Promise<ContentManager> {

    const schemaManager = await getSchemaManager();
    const validator = await getValidator();

    return new ContentManager(db, schemaManager, validator);
}