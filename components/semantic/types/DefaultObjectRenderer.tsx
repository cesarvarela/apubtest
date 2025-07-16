'use client';

import DebugWrapper from '../debug/DebugWrapper';
import TypeDispatcher from '../TypeDispatcher';
import type { TypeRendererProps, FieldMetadata, FieldContext } from './interfaces';

export default function DefaultObjectRenderer({ data, context }: TypeRendererProps) {
  if (!data || typeof data !== 'object') {
    return <span className="text-gray-600">{String(data)}</span>;
  }

  // Helper function to get field metadata from data object
  const getFieldMetadata = (fieldKey: string): FieldMetadata => {
    // Extract the base field name (handle both compact and expanded field keys)
    let baseFieldName = fieldKey;
    if (fieldKey.includes('#')) {
      baseFieldName = fieldKey.split('#').pop() || fieldKey;
    } else if (fieldKey.includes(':')) {
      baseFieldName = fieldKey.split(':').pop() || fieldKey;
    }
    
    // Look for ui:fieldKey in the data object itself (both compact and expanded forms)
    const compactUiKey = `ui:${baseFieldName}`;
    const expandedUiKey = `https://example.org/ui#${baseFieldName}`;
    
    let metadata = data[compactUiKey] || data[expandedUiKey];
    
    // Handle case where JSON-LD expansion turns it into an array
    if (Array.isArray(metadata) && metadata.length > 0) {
      metadata = metadata[0];
    }
    
    // Handle JSON-LD @json type values (expanded format)
    if (metadata && typeof metadata === 'object' && metadata['@type'] === '@json' && metadata['@value']) {
      metadata = metadata['@value'];
    }
    
    return metadata || {};
  };


  // Filter out JSON-LD metadata and UI metadata for property display
  // Now include name, title, and description in the regular field processing
  const filteredData = Object.entries(data).filter(([key, value]) => 
    !key.startsWith('@') && 
    !key.startsWith('ui:') &&
    !key.startsWith('https://example.org/ui#') &&
    !key.startsWith('https://www.w3.org/1999/02/22-rdf-syntax-ns#') &&
    value !== null &&
    value !== undefined
  );

  // Sort fields by ui:order, with unordered fields defaulting to 999
  const sortedFields = filteredData.sort(([keyA], [keyB]) => {
    const orderA = getFieldMetadata(keyA).order ?? 999;
    const orderB = getFieldMetadata(keyB).order ?? 999;
    return orderA - orderB;
  });

  return (
    <DebugWrapper rendererType="DefaultObjectRenderer" data={data}>
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">

      {sortedFields.length > 0 && (
        <div className="space-y-4">
          {sortedFields.map(([key, value], index) => {
            const fieldMetadata = getFieldMetadata(key);
            const uiLabel = fieldMetadata.label;
            
            // Get the label for this field
            const label = uiLabel || (key.includes('#') ? key.split('#').pop() : key) || key;
            
            // Always use TypeDispatcher with field context - it will handle field renderer routing
            const fieldContextForDispatcher: FieldContext = {
              fieldKey: key,
              label: label!,
              metadata: fieldMetadata
            };
            
            return (
              <div key={`${key}-${index}`}>
                <TypeDispatcher 
                  data={value} 
                  context={context} 
                  fieldContext={fieldContextForDispatcher} 
                />
              </div>
            );
          })}
        </div>
      )}
      </div>
    </DebugWrapper>
  );
}