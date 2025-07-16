import { JsonLd } from "jsonld/jsonld-spec";

export class ContextMerger {

  /**
   * Generic context merging - works with any namespace structure
   */
  static mergeContexts(contexts: JsonLd[]): JsonLd {
    const merged: any = {
      "@context": {}
    };

    // Track what we've seen for conflict detection
    const seenNamespaces = new Set<string>();
    const seenProperties = new Map<string, { value: any, source: string }>();
    const seenTypes = new Map<string, { value: string, source: string }>();

    for (let i = 0; i < contexts.length; i++) {
      const context = contexts[i] as any;
      const source = `context-${i}`;
      const ctx = context["@context"] as any;

      // Merge @-prefixed metadata
      Object.keys(ctx).forEach(key => {
        if (key.startsWith('@')) {
          if (key === '@context') return; // Skip nested @context

          if (!merged["@context"][key]) {
            merged["@context"][key] = ctx[key];
          } else if (key === '@protected') {
            // Keep @protected as true if any context has it
            merged["@context"][key] = merged["@context"][key] || ctx[key];
          }
        }
      });

      // Collect namespace definitions (strings that look like URLs)
      Object.keys(ctx).forEach(key => {
        if (key.startsWith('@')) return;

        const value = ctx[key];
        if (typeof value === 'string' && value.includes('://')) {
          // This is a namespace definition
          seenNamespaces.add(key);
          merged["@context"][key] = value;
        }
      });

      // Collect type and property definitions
      Object.keys(ctx).forEach(key => {
        if (key.startsWith('@')) return;
        if (seenNamespaces.has(key)) return; // Skip namespace definitions

        const value = ctx[key];

        if (typeof value === 'string') {
          if (value.includes(':')) {
            // Type definition like "Incident": "core:Incident"
            if (seenTypes.has(key)) {
              const existing = seenTypes.get(key)!;
              if (existing.value !== value) {
                console.warn(`Type conflict for '${key}': '${existing.value}' (${existing.source}) vs '${value}' (${source})`);
              }
            } else {
              seenTypes.set(key, { value, source });
              merged["@context"][key] = value;
            }
          } else {
            // Simple string definition like "regularString": "no-special-chars"
            if (seenTypes.has(key)) {
              const existing = seenTypes.get(key)!;
              if (existing.value !== value) {
                console.warn(`String conflict for '${key}': '${existing.value}' (${existing.source}) vs '${value}' (${source})`);
              }
            } else {
              seenTypes.set(key, { value, source });
              merged["@context"][key] = value;
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          // Property definition like "name": { "@id": "schema:name" }
          if (seenProperties.has(key)) {
            const existing = seenProperties.get(key)!;
            if (JSON.stringify(existing.value) !== JSON.stringify(value)) {
              console.warn(`Property conflict for '${key}': keeping definition from ${existing.source}`);
              // Keep first definition (first-wins strategy)
            }
          } else {
            seenProperties.set(key, { value, source });
            merged["@context"][key] = value;
          }
        }
      });
    }

    return merged;
  }

}