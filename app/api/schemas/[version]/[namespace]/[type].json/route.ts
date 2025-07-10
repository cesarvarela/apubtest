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

        // Remove .json extension from type parameter
        const cleanType = type.endsWith('.json') ? type.slice(0, -5) : type;

        const schemaManager = await getSchemaManager();

        try {
            const schema = await schemaManager.getSchema('validation', namespace, cleanType);

            if (!schema) {
                return NextResponse.json(
                    { error: `Validation schema not found for namespace: ${namespace}, type: ${cleanType}, version: ${version}` },
                    { status: 404 }
                );
            }

            // Set appropriate headers for JSON schema content
            return NextResponse.json(schema, {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });

        } catch (error) {
            console.error(`Error retrieving validation schema for namespace ${namespace}, type ${cleanType}, version ${version}:`, error);
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