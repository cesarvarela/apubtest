import { NextRequest, NextResponse } from "next/server";
import { getContentManager } from "@/lib/getGeneratorValidator";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get('namespace');
        const contentManager = await getContentManager();

        try {
            const stats = await contentManager.getContentStats(namespace || undefined);

            return NextResponse.json({ stats });
        }
        catch (error) {

            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to retrieve content stats" },
                { status: 500 }
            );
        }
    }
    catch (error) {
        console.error("Error retrieving content stats:", error);
        return NextResponse.json(
            { error: "Failed to retrieve content stats" },
            { status: 500 }
        );
    }
} 