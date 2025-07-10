import { NextRequest, NextResponse } from "next/server";
import { getSchemaManager } from "@/lib/getGeneratorValidator";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ version: string; namespace: string; type: string }> }
) {
    try {
        const { version, namespace, type } = await params;

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

        if (!type) {
            return NextResponse.json(
                { error: "Type parameter is required" },
                { status: 400 }
            );
        }

        // Remove .jsonld extension from type parameter
        const cleanType = type.endsWith('.jsonld') ? type.slice(0, -7) : type;

        const schemaManager = await getSchemaManager();

        try {
            const context = await schemaManager.getSchema('context', namespace, cleanType);

            if (!context) {
                return NextResponse.json(
                    { error: `Context not found for namespace: ${namespace}, type: ${cleanType}, version: ${version}` },
                    { status: 404 }
                );
            }

            // Set appropriate headers for JSON-LD content
            return NextResponse.json(context, {
                headers: {
                    'Content-Type': 'application/ld+json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });

        } catch (error) {
            console.error(`Error retrieving context for namespace ${namespace}, type ${cleanType}, version ${version}:`, error);
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
