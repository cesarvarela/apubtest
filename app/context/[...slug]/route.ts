import { getGeneratorValidator } from "@/lib/getGeneratorValidator";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const [filename] = slug;
  const [schemasGenerator] = await getGeneratorValidator();


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

    if (namespaceParam === process.env.NEXT_PUBLIC_NAMESPACE) {

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
