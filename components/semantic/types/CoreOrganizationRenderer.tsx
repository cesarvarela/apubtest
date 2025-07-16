'use client';

import { ExternalLink, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DebugWrapper from '../debug/DebugWrapper';
import type { TypeRendererProps } from './interfaces';

export default function CoreOrganizationRenderer({ data, context }: TypeRendererProps) {
  // Extract properties - handle both compact and expanded forms
  const id = data['@id'] || data['https://www.w3.org/1999/02/22-rdf-syntax-ns#ID'];
  
  // Helper function to extract value from JSON-LD value objects or arrays
  const extractValue = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value.length > 0 ? extractValue(value[0]) : undefined;
    }
    if (typeof value === 'object' && value['@value'] !== undefined) {
      return String(value['@value']);
    }
    return String(value);
  };
  
  const name = extractValue(data.name || data['https://schema.org/name']);
  const title = extractValue(data.title);
  const url = extractValue(data.url || data['https://schema.org/url']);
  const foundingDate = extractValue(data.foundingDate || data['https://schema.org/foundingDate']);
  
  // Extract domain from ID for display
  const getDomainFromId = (id: string): string => {
    try {
      const url = new URL(id);
      return url.hostname;
    } catch {
      return id;
    }
  };

  const isWikipediaLink = id?.includes('wikipedia.org');
  const domain = id ? getDomainFromId(id) : undefined;

  return (
    <DebugWrapper rendererType="CoreOrganizationRenderer" data={data}>
      <div className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Building2 className="h-5 w-5 text-blue-600 mt-1" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              {id ? (
                <a
                  href={id}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate flex items-center space-x-1"
                >
                  <span>{name || 'Unnamed Organization'}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {name || 'Unnamed Organization'}
                </h3>
              )}
              {isWikipediaLink && (
                <Badge variant="outline" className="text-xs">
                  Wikipedia
                </Badge>
              )}
            </div>
            
            {title && title !== name && (
              <p className="text-sm text-gray-600 mb-2">{title}</p>
            )}
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {domain && (
                <span className="flex items-center space-x-1">
                  <span>Source:</span>
                  <span className="font-mono">{domain}</span>
                </span>
              )}
              {foundingDate && (
                <span>Founded: {foundingDate}</span>
              )}
            </div>
          </div>
        </div>
        
      </div>
      
      {url && url !== id && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span>Visit website</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      </div>
    </DebugWrapper>
  );
}