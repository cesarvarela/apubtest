import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from 'next/cache';
import { getGeneratorValidator } from "@/lib/getGeneratorValidator";

export async function POST(request: NextRequest) {
    try {
        const { namespace, schema, type } = await request.json();

        if (!namespace || !schema || !type) {
            return NextResponse.json(
                { error: "Missing required fields: namespace, schema, type" },
                { status: 400 }
            );
        }

        if (type !== 'validation' && type !== 'context' && type !== 'vocab') {
            return NextResponse.json(
                { error: "Type must be 'validation', 'context', or 'vocab'" },
                { status: 400 }
            );
        }

        const [schemaGenerator] = await getGeneratorValidator();

        try {
            const result = await schemaGenerator.save(type, namespace, schema);

            // Invalidate the schema management page cache
            revalidatePath('/schema/manage');

            return NextResponse.json({
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} ${result.action} successfully`,
                id: result.id,
                action: result.action
            });
        } catch (validationError) {
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

        if (!namespace) {
            return NextResponse.json(
                { error: "Namespace parameter is required" },
                { status: 400 }
            );
        }

        if (type !== 'validation' && type !== 'context' && type !== 'vocab') {
            return NextResponse.json(
                { error: "Type must be 'validation', 'context', or 'vocab'" },
                { status: 400 }
            );
        }

        const [schemaGenerator] = await getGeneratorValidator();

        try {
            const schema = await schemaGenerator.get(type, namespace);
            const metadata = await schemaGenerator.getMetadata(type, namespace);

            return NextResponse.json({
                schema,
                metadata
            });
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

        if (!namespace) {
            return NextResponse.json(
                { error: "Namespace parameter is required" },
                { status: 400 }
            );
        }

        if (type !== 'validation' && type !== 'context' && type !== 'vocab') {
            return NextResponse.json(
                { error: "Type must be 'validation', 'context', or 'vocab'" },
                { status: 400 }
            );
        }

        // Prevent deletion of core schemas
        if (namespace === 'core') {
            return NextResponse.json(
                { error: "Cannot delete core schemas, contexts, or vocabs" },
                { status: 403 }
            );
        }

        const [schemaGenerator] = await getGeneratorValidator();

        try {
            const result = await schemaGenerator.delete(type, namespace);

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
