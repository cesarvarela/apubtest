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
    const validator = new Validator(schemaManager);
    const contentManager = new ContentManager(db, schemaManager, validator);

    return contentManager;
}

export async function getGeneratorValidator(): Promise<{ schemaManager: SchemaManager; contentManager: ContentManager }> {
    const schemaManager = await getSchemaManager();
    const contentManager = await getContentManager();

    return { schemaManager, contentManager };
}