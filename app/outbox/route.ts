import { db } from "@/db";
import { Incident } from "@/db/schema";
import { getSchemaManager } from "@/lib/getGeneratorValidator";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {

    const page = Number(new URL(request.url).searchParams.get("page") ?? 0);
    const pageSize = 50;
    const schemaManager = await getSchemaManager();

    const incidents = await db
        .select()
        .from(Incident)
        .where(eq(Incident.sourceNode, "local"))
        .orderBy(desc(Incident.createdAt))
        .limit(pageSize)
        .offset(page * pageSize);

    return Response.json({
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}/outbox?page=${page}`,
        type: "OrderedCollectionPage",
        next: incidents.length === pageSize ? `${process.env.DOMAIN}/outbox?page=${page + 1}` : undefined,
        orderedItems: incidents.map((incident) => ({
            "@context": ["https://www.w3.org/ns/activitystreams", schemaManager.getSchemaUrl('context', 'core')],
            id: `${incident.uri}#create`,
            type: "Create",
            actor: `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}/actor`,
            object: incident.data,
        })),
    });
}
