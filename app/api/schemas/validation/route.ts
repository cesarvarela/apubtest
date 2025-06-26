import { NextRequest, NextResponse } from "next/server";
import { mergeSchemas } from '@/lib/helpers';
import { getGeneratorValidator } from "@/lib/getGeneratorValidator";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace') || process.env.NEXT_PUBLIC_NAMESPACE!;
        const merged = searchParams.get('merged') === 'true';

        const [schemaGenerator] = await getGeneratorValidator();

        try {
            if (merged && namespace !== 'core') {

                const [coreSchema, localSchema] = await Promise.all([
                    schemaGenerator.get('validation', 'core'),
                    schemaGenerator.get('validation', namespace)
                ]);

                const mergedSchema = mergeSchemas(coreSchema, localSchema);
                return NextResponse.json(mergedSchema);
            } else {

                const schema = await schemaGenerator.get('validation', namespace);
                const metadata = await schemaGenerator.getMetadata('validation', namespace);

                return NextResponse.json({
                    schema,
                    metadata,
                    namespace
                });
            }
        } catch (error) {
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
