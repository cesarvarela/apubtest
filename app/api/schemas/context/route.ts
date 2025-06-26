import { NextRequest, NextResponse } from "next/server";
import { getGeneratorValidator } from "@/lib/getGeneratorValidator";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace') || process.env.NEXT_PUBLIC_NAMESPACE!;

        const [schemaGenerator] = await getGeneratorValidator();

        try {
            const context = await schemaGenerator.get('context', namespace);
            const metadata = await schemaGenerator.getMetadata('context', namespace);

            return NextResponse.json({
                context,
                metadata,
                namespace
            });
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Context not found" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error retrieving context:", error);
        return NextResponse.json(
            { error: "Failed to retrieve context" },
            { status: 500 }
        );
    }
}
