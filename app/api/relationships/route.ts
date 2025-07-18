import { NextRequest, NextResponse } from "next/server";
import { getGeneratorValidator } from "@/lib/getGeneratorValidator";
import { RelationshipDefinition } from "@/lib/SchemaManager";

export async function GET(request: NextRequest) {
    try {
        const { schemaManager } = await getGeneratorValidator();
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace') || process.env.NEXT_PUBLIC_NAMESPACE!;
        const sourceType = searchParams.get('sourceType');

        let relationships: RelationshipDefinition[];
        
        if (sourceType) {
            relationships = await schemaManager.getRelationshipsForType(namespace, sourceType);
        } else {
            relationships = await schemaManager.getRelationships(namespace);
        }

        return NextResponse.json({
            success: true,
            data: relationships
        });
    } catch (error) {
        console.error('Error fetching relationships:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch relationships',
                message: (error as Error).message
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { schemaManager } = await getGeneratorValidator();
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace') || process.env.NEXT_PUBLIC_NAMESPACE!;
        
        const relationship: RelationshipDefinition = await request.json();
        
        // Validate required fields
        if (!relationship.name || !relationship.sourceType || !relationship.targetType || !relationship.cardinality) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Missing required fields: name, sourceType, targetType, cardinality' 
                },
                { status: 400 }
            );
        }

        const result = await schemaManager.saveRelationship(namespace, relationship);

        return NextResponse.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error saving relationship:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to save relationship',
                message: (error as Error).message
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { schemaManager } = await getGeneratorValidator();
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace') || process.env.NEXT_PUBLIC_NAMESPACE!;
        const name = searchParams.get('name');
        const sourceType = searchParams.get('sourceType');

        if (!name || !sourceType) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Missing required parameters: name and sourceType' 
                },
                { status: 400 }
            );
        }

        const result = await schemaManager.deleteRelationship(namespace, name, sourceType);

        return NextResponse.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error deleting relationship:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to delete relationship',
                message: (error as Error).message
            },
            { status: 500 }
        );
    }
}