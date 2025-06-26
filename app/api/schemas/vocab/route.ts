import { NextRequest, NextResponse } from "next/server";
import { SchemaGenerator } from '@/lib/schemas';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace') || 'core';

        // Create SchemaGenerator instance
        const coreDomain = process.env.CORE_DOMAIN || 'https://github.com/ul-dsri/semantic-incident-db-prototype';
        const localDomain = process.env.LOCAL_DOMAIN || 'http://localhost:3000';
        
        const schemaGenerator = new SchemaGenerator(coreDomain, localDomain, namespace);

        try {
            const vocab = await schemaGenerator.get('vocab', namespace);
            const metadata = await schemaGenerator.getMetadata('vocab', namespace);

            return NextResponse.json({
                vocab,
                metadata,
                namespace
            });
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Vocab not found" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error retrieving vocab:", error);
        return NextResponse.json(
            { error: "Failed to retrieve vocab" },
            { status: 500 }
        );
    }
}
