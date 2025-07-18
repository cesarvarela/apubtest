import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from 'next/cache';
import { getSchemaManager } from "@/lib/getGeneratorValidator";

export async function POST(request: NextRequest) {
    try {
        const { namespace, schema, type, targetType } = await request.json();

        if (!namespace || !schema || !type) {

            return NextResponse.json(
                { error: "Missing required fields: namespace, schema, type" },
                { status: 400 }
            );
        }

        if (type !== 'validation' && type !== 'context' && type !== 'relationship') {

            return NextResponse.json(
                { error: "Type must be 'validation', 'context', or 'relationship'" },
                { status: 400 }
            );
        }

        const schemaManager = await getSchemaManager();

        try {
            const result = await schemaManager.save(type as 'validation' | 'context' | 'relationship', namespace, targetType || null, schema);

            revalidatePath('/schema/manage');

            return NextResponse.json({
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} ${result.action} successfully`,
                id: result.id,
                action: result.action
            });
        }
        catch (validationError) {

            return NextResponse.json(
                { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
                { status: 400 }
            );
        }
    }
    catch (error) {

        console.error("Error managing schema:", error);

        return NextResponse.json(
            { error: "Failed to save schema" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace');
        const type = searchParams.get('type') || 'validation';
        const targetType = searchParams.get('targetType');

        if (!namespace) {
            return NextResponse.json(
                { error: "Namespace parameter is required" },
                { status: 400 }
            );
        }

        if (type !== 'validation' && type !== 'context') {
            return NextResponse.json(
                { error: "Type must be 'validation', 'context'" },
                { status: 400 }
            );
        }

        const schemaManager = await getSchemaManager();

        try {
            const schema = await schemaManager.getSchema(type as 'validation' | 'context' | 'relationship', namespace, targetType || null);

            return NextResponse.json({ schema });
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Schema not found" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error retrieving schema:", error);
        return NextResponse.json(
            { error: "Failed to retrieve schema" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace');
        const type = searchParams.get('type') || 'validation';
        const targetType = searchParams.get('targetType');

        if (!namespace) {
            return NextResponse.json(
                { error: "Namespace parameter is required" },
                { status: 400 }
            );
        }

        if (type !== 'validation' && type !== 'context') {
            return NextResponse.json(
                { error: "Type must be 'validation', 'context'" },
                { status: 400 }
            );
        }


        const schemaManager = await getSchemaManager();

        try {
            const result = await schemaManager.delete(type as 'validation' | 'context' | 'relationship', namespace, targetType || null);

            return NextResponse.json({
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} deactivated successfully`,
                id: result.id
            });
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to delete" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error deleting schema:", error);
        return NextResponse.json(
            { error: "Failed to delete schema" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace');
        const schemaType = searchParams.get('type') || 'validation';

        if (!namespace) {
            return NextResponse.json(
                { error: "Namespace parameter is required" },
                { status: 400 }
            );
        }

        const schemaManager = await getSchemaManager();

        try {
            let targetTypes: string[];
            
            switch (schemaType) {
                case 'context':
                    targetTypes = await schemaManager.getContextTargetTypes(namespace);
                    break;
                default:
                    targetTypes = await schemaManager.getTargetTypes(namespace);
                    break;
            }

            return NextResponse.json({ targetTypes });
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to get target types" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Error getting target types:", error);
        return NextResponse.json(
            { error: "Failed to get target types" },
            { status: 500 }
        );
    }
}
