import { SchemaGenerator } from "@/lib/schemas";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const [filename] = slug;
  const schemasGenerator = new SchemaGenerator(process.env.CORE_DOMAIN!, process.env.LOCAL_DOMAIN!, process.env.NAMESPACE!);

  if (filename === "core-v1.jsonld") {

    const context = await schemasGenerator.getCoreContext();

    return NextResponse.json(context, {
      headers: {
        "Content-Type": "application/ld+json",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
      }
    });
  }

  const match = filename.match(/^(.+)-v1\.jsonld$/);

  if (match) {

    const namespaceParam = match[1];
    
    if (namespaceParam === process.env.NAMESPACE) {

      const context = await schemasGenerator.getLocalContext();

      return NextResponse.json(context, {
        headers: {
          "Content-Type": "application/ld+json",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
        }
      });
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
