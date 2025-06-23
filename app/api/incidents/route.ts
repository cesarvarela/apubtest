import { NextRequest } from "next/server";
import { db } from "@/db";
import { Incident } from "@/db/schema";
import { schemasGenerator, validator } from "@/lib/validation";
import { v4 as uuid } from "uuid";

export async function GET() {
    try {
        const incidents = await db.select().from(Incident).orderBy(Incident.createdAt);
        return Response.json(incidents);
    } catch (error) {
        console.error("Error fetching incidents:", error);
        return Response.json({ error: "Failed to fetch incidents" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {

    const body = await req.json();

    body["@id"] ??= `${process.env.LOCAL_DOMAIN}/incidents/${uuid()}`;
    body["@context"] ??= schemasGenerator.localContextUrl;
    body["@type"] = "Incident";

    try {

        validator.validateIncident(body);
    }
    catch (error) {

        console.error("Validation error:", error);

        return Response.json({ error: error instanceof Error ? error.message : "Validation failed" }, { status: 400 });
    }

    await db.insert(Incident).values({
        uri: body["@id"],
        data: body,
        sourceNode: "local",
    });

    return Response.json(body, { status: 201 });
}
