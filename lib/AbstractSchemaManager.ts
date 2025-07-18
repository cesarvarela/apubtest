import { SchemaObject } from "ajv";

/**
 * Abstract base class for schema managers.
 * Provides a minimal interface for schema retrieval without database dependencies.
 */
export abstract class AbstractSchemaManager {
  constructor(
    public coreDomain: string,
    public localDomain: string,
    public namespace: string
  ) {}

  /**
   * Retrieves a schema by type, namespace, and optional target type.
   * @param type - The schema type: 'validation', 'context', or 'relationship'
   * @param namespace - The namespace of the schema
   * @param targetType - Optional target type for the schema
   * @returns The schema object or null if not found
   */
  abstract getSchema(
    type: 'validation' | 'context' | 'relationship',
    namespace: string,
    targetType: string | null
  ): Promise<SchemaObject | null>;

  /**
   * Gets the domain URL for a given namespace.
   * @param namespace - The namespace to get the domain for (defaults to this.namespace)
   * @returns The domain URL string
   */
  getDomain(namespace = this.namespace): string {
    if (namespace === 'core') {
      return this.coreDomain;
    } else if (namespace === 'local' || namespace === this.namespace) {
      return this.localDomain;
    } else {
      throw new Error(`Unknown namespace: ${namespace}`);
    }
  }
}