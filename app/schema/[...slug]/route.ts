import { NextResponse } from "next/server";
import { SchemaGenerator } from "@/lib/schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const [filename] = slug;

  const schemasGenerator = new SchemaGenerator(process.env.CORE_DOMAIN!, process.env.LOCAL_DOMAIN!, process.env.NAMESPACE!);

  if (filename === "core-v1.json") {

    const schema = await schemasGenerator.getCoreSchema();

    return NextResponse.json(schema, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
      }
    });
  }

  const match = filename.match(/^(.+)-v1\.json$/);

  if (match) {

    const namespaceParam = match[1];
    
    if (namespaceParam === process.env.NAMESPACE) {

      const schema = await schemasGenerator.getLocalSchema();

      return NextResponse.json(schema, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
        }
      });
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
