import { NextRequest } from "next/server";
import { db } from "@/db";
import { Incident } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Validator } from "@/lib/validation";
import { SchemaGenerator } from "@/lib/schemas";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {

        const schemasGenerator = new SchemaGenerator(process.env.CORE_DOMAIN!, process.env.LOCAL_DOMAIN!, process.env.NAMESPACE!);
        const validator = new Validator();

        await validator.initialize(schemasGenerator);

        const { id } = await params;
        const idParam = decodeURIComponent(id);

        // Try to find by database ID first
        let incidents = await db.select().from(Incident).where(eq(Incident.id, idParam));

        // If not found by database ID, try by URI (exact match)
        if (incidents.length === 0) {
            incidents = await db.select().from(Incident).where(eq(Incident.uri, idParam));
        }

        // If still not found, try to find by URI that ends with the ID (common case)
        if (incidents.length === 0) {
            incidents = await db.select().from(Incident).where(sql`${Incident.uri} LIKE '%/' || ${idParam}`);
        }

        if (incidents.length === 0) {
            return Response.json({ error: "Incident not found" }, { status: 404 });
        }

        return Response.json(incidents[0].data);
    }
    catch (error) {

        console.error("Error fetching incident:", error);
        return Response.json({ error: "Failed to fetch incident" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const body = await req.json();
        const { id } = await params;
        const idParam = decodeURIComponent(id);

        const schemasGenerator = new SchemaGenerator(process.env.CORE_DOMAIN!, process.env.LOCAL_DOMAIN!, process.env.NAMESPACE!);
        const validator = new Validator();  

        await validator.initialize(schemasGenerator);


        let existingIncidents = await db.select().from(Incident).where(eq(Incident.id, idParam));

        if (existingIncidents.length === 0) {
            existingIncidents = await db.select().from(Incident).where(eq(Incident.uri, idParam));
        }

        if (existingIncidents.length === 0) {
            existingIncidents = await db.select().from(Incident).where(sql`${Incident.uri} LIKE '%/' || ${idParam}`);
        }

        if (existingIncidents.length === 0) {
            return Response.json({ error: "Incident not found" }, { status: 404 });
        }

        const existingIncident = existingIncidents[0];

        body["@id"] = (existingIncident.data as any)["@id"] || existingIncident.uri;
        body["@type"] = "Incident";

        try {
            validator.validateIncident(body);
        } catch (error) {
            console.error("Validation error:", error);
            return Response.json({ error: error instanceof Error ? error.message : "Validation failed" }, { status: 400 });
        }

        await db.update(Incident)
            .set({
                data: body
            })
            .where(eq(Incident.id, existingIncident.id));

        return Response.json(body);
    } catch (error) {
        console.error("Error updating incident:", error);
        return Response.json({ error: "Failed to update incident" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const idParam = decodeURIComponent(id);

        let existingIncidents = await db.select().from(Incident).where(eq(Incident.id, idParam));

        if (existingIncidents.length === 0) {
            existingIncidents = await db.select().from(Incident).where(eq(Incident.uri, idParam));
        }

        if (existingIncidents.length === 0) {
            existingIncidents = await db.select().from(Incident).where(sql`${Incident.uri} LIKE '%/' || ${idParam}`);
        }

        if (existingIncidents.length === 0) {
            return Response.json({ error: "Incident not found" }, { status: 404 });
        }

        const existingIncident = existingIncidents[0];

        await db.delete(Incident).where(eq(Incident.id, existingIncident.id));

        return Response.json({ message: "Incident deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting incident:", error);
        return Response.json({ error: "Failed to delete incident" }, { status: 500 });
    }
}