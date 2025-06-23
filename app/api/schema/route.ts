import { NextRequest } from "next/server";
import { schemasGenerator } from '@/lib/validation';
import { mergeSchemas } from '@/lib/helpers';

export async function GET() {
    try {
        const [core, local] = await Promise.all([
            schemasGenerator.getCoreSchema(),
            schemasGenerator.getLocalSchema(),
        ]);

        // Merge core and local schemas into a single properties object (flatten allOf)
        const mergedSchema = mergeSchemas(core, local);

        return Response.json(mergedSchema);
    } catch (error) {
        console.error("Error fetching schema:", error);
        return Response.json({ error: "Failed to fetch schema" }, { status: 500 });
    }
}
