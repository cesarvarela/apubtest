import { useEffect, useState } from 'react';
import jsonld from 'jsonld';
import { RemoteDocument } from 'jsonld/jsonld-spec';

interface UseJsonLdExpansionProps {
  payload: any;
  coreContext?: any;
  localContext?: any;
}

export function useJsonLdExpansion({ payload, coreContext, localContext }: UseJsonLdExpansionProps) {
  const [expandedData, setExpandedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function expandPayload() {
      try {
        setLoading(true);
        setError(null);

        // Create document loader
        const documentLoader = (url: string): Promise<RemoteDocument> => {
          if (url === 'http://localhost:3000/api/schemas/v1/core/context.jsonld') {
            return Promise.resolve({
              contextUrl: undefined,
              document: coreContext,
              documentUrl: url
            });
          }
          
          if (url === 'http://localhost:3001/api/schemas/v1/aiid/context.jsonld') {
            return Promise.resolve({
              contextUrl: undefined,
              document: localContext,
              documentUrl: url
            });
          }

          return Promise.reject(new Error(`Unknown context: ${url}`));
        };

        // Expand the JSON-LD
        const expanded = await jsonld.expand(payload, { documentLoader });
        setExpandedData(expanded || payload);
      } catch (err) {
        console.error('JSON-LD expansion failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setExpandedData(payload); // Fallback to original payload
      } finally {
        setLoading(false);
      }
    }

    expandPayload();
  }, [payload, coreContext, localContext]);

  return { expandedData, loading, error };
}