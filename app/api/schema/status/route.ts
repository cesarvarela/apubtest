import { NextRequest, NextResponse } from "next/server";
import { SchemaGenerator, SchemaNotFoundError } from '@/lib/schemas';

export async function GET(request: NextRequest) {
    try {
        const schemasGenerator = new SchemaGenerator(process.env.CORE_DOMAIN!, process.env.LOCAL_DOMAIN!, process.env.NAMESPACE!);

        const [hasLocal, hasCore] = await Promise.all([
            schemasGenerator.hasLocalSchema(),
            schemasGenerator.hasCoreSchema()
        ]);

        let coreSchemaValid = false;
        let localSchemaValid = false;
        let coreError = null;
        let localError = null;

        try {
            await schemasGenerator.getCoreSchema();
            coreSchemaValid = true;
        } catch (error) {
            if (error instanceof SchemaNotFoundError) {
                coreError = error.message;
            } else {
                coreError = 'Invalid core schema';
            }
        }

        try {
            await schemasGenerator.getLocalSchema();
            localSchemaValid = true;
        } catch (error) {
            if (error instanceof SchemaNotFoundError) {
                localError = error.message;
            } else {
                localError = 'Invalid local schema';
            }
        }

        return NextResponse.json({
            schemas: {
                core: {
                    exists: hasCore,
                    valid: coreSchemaValid,
                    error: coreError
                },
                local: {
                    exists: hasLocal,
                    valid: localSchemaValid,
                    error: localError,
                    namespace: schemasGenerator.namespace
                }
            },
            ready: coreSchemaValid && localSchemaValid,
            urls: {
                coreContext: schemasGenerator.coreContextUrl,
                coreSchema: schemasGenerator.coreSchemaUrl,
                localContext: schemasGenerator.localContextUrl,
                localSchema: schemasGenerator.localSchemaUrl
            }
        });
    } catch (error) {
        console.error("Error checking schema status:", error);
        return NextResponse.json({ error: "Failed to check schema status" }, { status: 500 });
    }
}
