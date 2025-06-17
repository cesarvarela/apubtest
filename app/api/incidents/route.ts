import { NextRequest } from "next/server";
import { db } from "@/db";
import { Incident } from "@/db/schema";
import { schemasGenerator, validator } from "@/lib/validation";
import { v4 as uuid } from "uuid";

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

        return Response.json({ error: error.message }, { status: 400 });
    }

    await db.insert(Incident).values({
        uri: body["@id"],
        data: body,
        sourceNode: "local",
    });

    return Response.json(body, { status: 201 });
}
