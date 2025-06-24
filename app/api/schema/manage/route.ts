import { NextRequest, NextResponse } from "next/server";
import { db } from '@/db';
import { Schema } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const { namespace, schema, type } = await request.json();

        if (!namespace || !schema || !type) {
            return NextResponse.json(
                { error: "Missing required fields: namespace, schema, type" },
                { status: 400 }
            );
        }

        if (type !== 'schema' && type !== 'context') {
            return NextResponse.json(
                { error: "Type must be 'schema' or 'context'" },
                { status: 400 }
            );
        }

        if (!schema.$id) {
            return NextResponse.json(
                { error: "Schema must have a $id property" },
                { status: 400 }
            );
        }

        const uri = type === 'schema'
            ? `${process.env.LOCAL_DOMAIN}/schema/${namespace}-v1.json`
            : `${process.env.LOCAL_DOMAIN}/context/${namespace}-v1.jsonld`;

        const existingSchema = await db
            .select()
            .from(Schema)
            .where(and(
                eq(Schema.type, type),
                eq(Schema.namespace, namespace),
                eq(Schema.version, 'v1'),
                eq(Schema.isActive, true)
            ))
            .limit(1);

        if (existingSchema.length > 0) {

            await db
                .update(Schema)
                .set({
                    content: schema as any,
                    uri: uri,
                    updatedAt: new Date()
                })
                .where(eq(Schema.id, existingSchema[0].id));

            return NextResponse.json({
                message: "Schema updated successfully",
                id: existingSchema[0].id,
                action: "updated"
            });
        }
        else {

            const result = await db
                .insert(Schema)
                .values({
                    type: type,
                    namespace: namespace,
                    version: 'v1',
                    uri: uri,
                    content: schema as any,
                    isActive: true
                })
                .returning({ id: Schema.id });

            return NextResponse.json({
                message: "Schema created successfully",
                id: result[0].id,
                action: "created"
            });
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
        const type = searchParams.get('type') || 'schema';

        if (!namespace) {
            return NextResponse.json(
                { error: "Namespace parameter is required" },
                { status: 400 }
            );
        }

        const schema = await db
            .select()
            .from(Schema)
            .where(and(
                eq(Schema.type, type as 'schema' | 'context'),
                eq(Schema.namespace, namespace),
                eq(Schema.version, 'v1'),
                eq(Schema.isActive, true)
            ))
            .limit(1);

        if (schema.length === 0) {
            return NextResponse.json(
                { error: "Schema not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            schema: schema[0].content,
            metadata: {
                id: schema[0].id,
                uri: schema[0].uri,
                createdAt: schema[0].createdAt,
                updatedAt: schema[0].updatedAt
            }
        });
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
        const type = searchParams.get('type') || 'schema';

        if (!namespace) {
            return NextResponse.json(
                { error: "Namespace parameter is required" },
                { status: 400 }
            );
        }

        // Soft delete by setting isActive to false
        const result = await db
            .update(Schema)
            .set({
                isActive: false,
                updatedAt: new Date()
            })
            .where(and(
                eq(Schema.type, type as 'schema' | 'context'),
                eq(Schema.namespace, namespace),
                eq(Schema.version, 'v1'),
                eq(Schema.isActive, true)
            ))
            .returning({ id: Schema.id });

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Schema not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: "Schema deactivated successfully",
            id: result[0].id
        });
    } catch (error) {
        console.error("Error deleting schema:", error);
        return NextResponse.json(
            { error: "Failed to delete schema" },
            { status: 500 }
        );
    }
}
