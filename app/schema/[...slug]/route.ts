import { NextResponse } from "next/server";
import { getSchemaManager } from "@/lib/getGeneratorValidator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const [filename] = slug;

  const schemaManager = await getSchemaManager();

  if (filename === "core-v1.json") {

    const schema = await schemaManager.getSchema('validation', 'core');

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

    if (namespaceParam === process.env.NEXT_PUBLIC_NAMESPACE) {

      const schema = await schemaManager.getSchema('validation', namespaceParam);

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
