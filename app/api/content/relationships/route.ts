import { NextRequest, NextResponse } from "next/server";
import { getGeneratorValidator } from "@/lib/getGeneratorValidator";

export async function GET(request: NextRequest) {
    try {
        const { contentManager } = await getGeneratorValidator();
        const { searchParams } = new URL(request.url);
        const uri = searchParams.get('uri');
        const relationshipName = searchParams.get('relationshipName');

        if (!uri) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'URI parameter is required' 
                },
                { status: 400 }
            );
        }

        const relationships = await contentManager.getRelatedContent(uri, relationshipName || undefined);

        return NextResponse.json({
            success: true,
            data: relationships
        });
    } catch (error) {
        console.error('Error fetching content relationships:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch content relationships',
                message: (error as Error).message
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { contentManager } = await getGeneratorValidator();
        const body = await request.json();
        const { sourceUri, relationshipName, targetUri, targetData } = body;

        if (!sourceUri || !relationshipName || !targetUri) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Missing required fields: sourceUri, relationshipName, targetUri' 
                },
                { status: 400 }
            );
        }

        await contentManager.addRelationship(sourceUri, relationshipName, targetUri, targetData);

        return NextResponse.json({
            success: true,
            message: 'Relationship added successfully'
        });
    } catch (error) {
        console.error('Error adding relationship:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to add relationship',
                message: (error as Error).message
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { contentManager } = await getGeneratorValidator();
        const { searchParams } = new URL(request.url);
        const sourceUri = searchParams.get('sourceUri');
        const relationshipName = searchParams.get('relationshipName');
        const targetUri = searchParams.get('targetUri');

        if (!sourceUri || !relationshipName || !targetUri) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Missing required parameters: sourceUri, relationshipName, targetUri' 
                },
                { status: 400 }
            );
        }

        await contentManager.removeRelationship(sourceUri, relationshipName, targetUri);

        return NextResponse.json({
            success: true,
            message: 'Relationship removed successfully'
        });
    } catch (error) {
        console.error('Error removing relationship:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to remove relationship',
                message: (error as Error).message
            },
            { status: 500 }
        );
    }
}