import { NextRequest, NextResponse } from "next/server";
import { SchemaGenerator } from '@/lib/schemas';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace') || process.env.NEXT_PUBLIC_NAMESPACE!;

        // Create SchemaGenerator instance
        const coreDomain = process.env.CORE_DOMAIN || 'https://github.com/ul-dsri/semantic-incident-db-prototype';
        const localDomain = process.env.LOCAL_DOMAIN || 'http://localhost:3000';
        
        const schemaGenerator = new SchemaGenerator(coreDomain, localDomain, namespace);

        try {
            const context = await schemaGenerator.get('context', namespace);
            const metadata = await schemaGenerator.getMetadata('context', namespace);

            return NextResponse.json({
                context,
                metadata,
                namespace
            });
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Context not found" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error retrieving context:", error);
        return NextResponse.json(
            { error: "Failed to retrieve context" },
            { status: 500 }
        );
    }
}
