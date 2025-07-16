'use client';

import { AlertTriangle, ExternalLink, Building2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DebugWrapper from '../debug/DebugWrapper';
import TypeDispatcher from '../TypeDispatcher';
import type { TypeRendererProps } from './interfaces';

export default function CoreIncidentRenderer({ data, context }: TypeRendererProps) {
  // Extract properties - handle both compact and expanded forms
  const id = data['@id'] || data['https://www.w3.org/1999/02/22-rdf-syntax-ns#ID'];
  const types = data['@type'] || data['https://example.org/core#type'] || [];
  const typeArray = Array.isArray(types) ? types : [types];
  
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
  
  const title = extractValue(data.title || data['https://schema.org/name']);
  const name = extractValue(data.name);
  const description = extractValue(data.description || data['https://schema.org/description']);
  const deployedBy = data.deployedBy || data['https://example.org/aiid#deployedBy'] || [];
  const reports = data.reports || data['https://example.org/aiid#reports'] || [];

  // Determine incident types for badges
  const incidentTypes = typeArray.filter(type => type.includes('Incident'));
  const namespaces = incidentTypes.map(type => {
    if (type.includes(':')) return type.split(':')[0];
    if (type.includes('#')) return type.split('#')[0].split('/').pop() || 'core';
    return 'core';
  });

  const getDomainFromId = (id: string): string => {
    try {
      const url = new URL(id);
      return url.hostname;
    } catch {
      return id;
    }
  };

  return (
    <DebugWrapper rendererType="CoreIncidentRenderer" data={data}>
      <div className="border border-orange-200 rounded-lg p-6 bg-gradient-to-r from-orange-50 to-red-50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-orange-600 mt-1" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              {id ? (
                <a
                  href={id}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-bold text-gray-900 hover:text-orange-600 transition-colors flex items-center space-x-2"
                >
                  <span>{title || name || 'Untitled Incident'}</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <h2 className="text-lg font-bold text-gray-900">
                  {title || name || 'Untitled Incident'}
                </h2>
              )}
              {namespaces.map((namespace, index) => (
                <Badge key={index} variant="destructive" className="text-xs capitalize">
                  {namespace} Incident
                </Badge>
              ))}
            </div>
            
            {description && (
              <p className="text-sm text-gray-700 mb-3">{description}</p>
            )}
            
            {id && (
              <div className="text-xs text-gray-500 font-mono">
                ID: {getDomainFromId(id)}
              </div>
            )}
          </div>
        </div>
        
      </div>

      {/* Deployed By Organizations */}
      {deployedBy && Array.isArray(deployedBy) && deployedBy.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Organizations Involved ({deployedBy.length})</span>
          </h3>
          <div className="space-y-3">
            {deployedBy.map((org, index) => (
              <div key={org?.['@id'] || `org-${index}`}>
                <TypeDispatcher data={org} context={context} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Reports */}
      {reports && Array.isArray(reports) && reports.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Related Reports ({reports.length})</span>
          </h3>
          <div className="space-y-3">
            {reports.map((report, index) => (
              <div key={report?.['@id'] || `report-${index}`}>
                <TypeDispatcher data={report} context={context} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state if no related data */}
      {(!deployedBy || deployedBy.length === 0) && (!reports || reports.length === 0) && (
        <div className="text-sm text-gray-500 italic">
          No additional details or related entities available.
        </div>
      )}
      </div>
    </DebugWrapper>
  );
}