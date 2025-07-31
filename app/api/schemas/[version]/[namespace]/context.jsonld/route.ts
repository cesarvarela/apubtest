import { NextResponse } from "next/server";
import { getSchemaManager } from "@/lib/getGeneratorValidator";
import { ContextMerger } from "@/lib/ContextMerger";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ version: string; namespace: string }> }
) {
    try {
        const { version, namespace } = await params;

        if (!version) {
            return NextResponse.json(
                { error: "Version parameter is required" },
                { status: 400 }
            );
        }

        if(version !== 'v1') {
            return NextResponse.json(
                { error: "Only version 'v1' is supported" },
                { status: 400 }
            );
        }

        if (!namespace) {
            return NextResponse.json(
                { error: "Namespace parameter is required" },
                { status: 400 }
            );
        }

        // Get current namespace from environment
        const currentNamespace = process.env.NEXT_PUBLIC_NAMESPACE;
        
        // Only allow core and local (current) namespace access
        if (namespace !== 'core' && namespace !== 'local' && namespace !== currentNamespace) {
            return NextResponse.json(
                { error: `Access denied. Only 'core' and local namespace '${currentNamespace}' schemas are available` },
                { status: 403 }
            );
        }

        // Resolve namespace (convert 'local' to actual namespace)
        const resolvedNamespace = namespace === 'local' ? currentNamespace : namespace;
        
        if (!resolvedNamespace) {
            return NextResponse.json(
                { error: "Could not resolve namespace" },
                { status: 500 }
            );
        }

        const schemaManager = await getSchemaManager();

        try {
            // Get all context schemas for this namespace
            const contextSchemas = await schemaManager.getSchemasByNamespaceAndType(resolvedNamespace, 'context');
            
            if (!contextSchemas || contextSchemas.length === 0) {
                return NextResponse.json(
                    { error: `No context schemas found for namespace: ${resolvedNamespace}` },
                    { status: 404 }
                );
            }

            // Merge all contexts for this namespace using ContextMerger
            const contexts = contextSchemas.map(schema => schema.content);
            const mergedContext = ContextMerger.mergeContexts(contexts);

            // Set appropriate headers for JSON-LD content
            return NextResponse.json(mergedContext, {
                headers: {
                    'Content-Type': 'application/ld+json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });

        } catch (error) {
            console.error(`Error retrieving merged context for namespace ${resolvedNamespace}:`, error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Context not found" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error retrieving JSON-LD context:", error);
        return NextResponse.json(
            { error: "Failed to retrieve JSON-LD context" },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
