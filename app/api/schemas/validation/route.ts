import { NextRequest, NextResponse } from "next/server";
import { SchemaGenerator } from '@/lib/schemas';
import { mergeSchemas } from '@/lib/helpers';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace');
        const merged = searchParams.get('merged') === 'true';

        if (!namespace) {
            return NextResponse.json(
                { error: "Namespace parameter is required" },
                { status: 400 }
            );
        }

        // Create SchemaGenerator instance
        const coreDomain = process.env.CORE_DOMAIN || 'https://github.com/ul-dsri/semantic-incident-db-prototype';
        const localDomain = process.env.LOCAL_DOMAIN || 'http://localhost:3000';
        
        const schemaGenerator = new SchemaGenerator(coreDomain, localDomain, namespace);

        try {
            if (merged && namespace !== 'core') {
                // Return merged schema (core + local)
                const [coreSchema, localSchema] = await Promise.all([
                    schemaGenerator.get('validation', 'core'),
                    schemaGenerator.get('validation', namespace)
                ]);

                const mergedSchema = mergeSchemas(coreSchema, localSchema);
                return NextResponse.json(mergedSchema);
            } else {
                // Return single schema
                const schema = await schemaGenerator.get('validation', namespace);
                const metadata = await schemaGenerator.getMetadata('validation', namespace);

                return NextResponse.json({
                    schema,
                    metadata,
                    namespace
                });
            }
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Validation schema not found" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error retrieving validation schema:", error);
        return NextResponse.json(
            { error: "Failed to retrieve validation schema" },
            { status: 500 }
        );
    }
}
