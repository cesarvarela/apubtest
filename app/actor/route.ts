export async function GET() {
    return Response.json({
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}/actor`,
        type: "Service",
        inbox: "",               // not used (pull‑only model)
        outbox: `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}/outbox`,
        preferredUsername: "incident-node",
    });
}