import { NextRequest, NextResponse } from "next/server";
import { getGeneratorValidator } from "@/lib/getGeneratorValidator";

export async function GET(request: NextRequest) {
    try {
        const { contentManager } = await getGeneratorValidator();
        const { searchParams } = new URL(request.url);
        const relationshipName = searchParams.get('relationshipName');
        const targetUri = searchParams.get('targetUri');
        const namespace = searchParams.get('namespace');

        if (!relationshipName || !targetUri) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Missing required parameters: relationshipName and targetUri' 
                },
                { status: 400 }
            );
        }

        const content = await contentManager.findContentByRelationship(
            relationshipName, 
            targetUri, 
            namespace || undefined
        );

        return NextResponse.json({
            success: true,
            data: content
        });
    } catch (error) {
        console.error('Error finding content by relationship:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to find content by relationship',
                message: (error as Error).message
            },
            { status: 500 }
        );
    }
}