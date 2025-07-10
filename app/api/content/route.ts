import { NextRequest, NextResponse } from "next/server";
import { getContentManager } from "@/lib/getGeneratorValidator";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { contentType, namespace, uri, data, sourceNode } = body;

        if (!contentType || !namespace || !uri || !data) {
            return NextResponse.json(
                { error: "Missing required fields: contentType, namespace, uri, data" },
                { status: 400 }
            );
        }

        const contentManager = await getContentManager();

        try {
            const result = await contentManager.save(
                contentType,
                namespace,
                uri,
                data,
                sourceNode || 'local'
            );

            return NextResponse.json({
                message: `Content ${result.action} successfully`,
                id: result.id,
                action: result.action
            });
        } catch (validationError) {
            return NextResponse.json(
                { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error managing content:", error);
        return NextResponse.json(
            { error: "Failed to save content" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const uri = searchParams.get('uri');
        const contentType = searchParams.get('contentType');
        const namespace = searchParams.get('namespace');

        const contentManager = await getContentManager();

        try {
            if (uri) {
                // Get specific content by URI
                const content = await contentManager.getByUri(uri);
                if (!content) {
                    return NextResponse.json(
                        { error: "Content not found" },
                        { status: 404 }
                    );
                }
                return NextResponse.json({ content });
            } else if (contentType) {
                // Get content by type
                const content = await contentManager.getByType(contentType, namespace || undefined);
                return NextResponse.json({ content });
            } else if (namespace) {
                // Get all content for a namespace
                const content = await contentManager.getByNamespace(namespace);
                return NextResponse.json({ content });
            } else {
                // Get all content when no specific filters are provided
                const allContent = await contentManager.getByNamespace(''); // Empty string gets all namespaces
                return NextResponse.json({ content: allContent });
            }
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to retrieve content" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Error retrieving content:", error);
        return NextResponse.json(
            { error: "Failed to retrieve content" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const uri = searchParams.get('uri');

        if (!uri) {
            return NextResponse.json(
                { error: "URI parameter is required" },
                { status: 400 }
            );
        }

        const contentManager = await getContentManager();

        try {
            const result = await contentManager.delete(uri);
            return NextResponse.json({
                message: "Content deleted successfully",
                id: result.id
            });
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to delete content" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error deleting content:", error);
        return NextResponse.json(
            { error: "Failed to delete content" },
            { status: 500 }
        );
    }
} 