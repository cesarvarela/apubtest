import { NextResponse } from "next/server";
import { CORE_SCHEMA } from "@/lib/core";
import { LOCAL_SCHEMA } from "@/lib/local";

// Catch-all route for schema files
export async function GET(
  request: Request,
  { params }: { params: { slug: string[] } }
) {
  const [filename] = params.slug;

  // Static core schema
  if (filename === "core-v1.json") {
    return NextResponse.json(CORE_SCHEMA, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
      }
    });
  }

  // Dynamic local schema based on namespace
  const match = filename.match(/^(.+)-v1\.json$/);
  if (match) {
    const namespaceParam = match[1];
    if (namespaceParam === process.env.NAMESPACE) {
      return NextResponse.json(LOCAL_SCHEMA, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
        }
      });
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
