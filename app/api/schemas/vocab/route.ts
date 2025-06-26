import { NextRequest, NextResponse } from "next/server";
import { getGeneratorValidator } from "@/lib/getGeneratorValidator";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace') || process.env.NEXT_PUBLIC_NAMESPACE!;

        const [schemaGenerator] = await getGeneratorValidator();

        try {
            const vocab = await schemaGenerator.get('vocab', namespace);
            const metadata = await schemaGenerator.getMetadata('vocab', namespace);

            return NextResponse.json({
                vocab,
                metadata,
                namespace
            });
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Vocab not found" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error retrieving vocab:", error);
        return NextResponse.json(
            { error: "Failed to retrieve vocab" },
            { status: 500 }
        );
    }
}
