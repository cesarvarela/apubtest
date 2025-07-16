'use client';

import DefaultObjectRenderer from './types/DefaultObjectRenderer';
import GenericFieldRenderer from './fields/GenericFieldRenderer';
import { TYPE_RENDERER_REGISTRY } from './config/typeRegistry';
import { FIELD_RENDERER_REGISTRY } from './config/fieldRegistry';
import type { TypeDispatcherProps, JsonLdObject } from './types/interfaces';

export default function TypeDispatcher({ data, context, fieldContext }: TypeDispatcherProps) {
  // If we have field context, route to appropriate field renderer
  if (fieldContext) {
    // Check for custom field renderer first
    if (fieldContext.metadata.component) {
      const FieldComponent = FIELD_RENDERER_REGISTRY[fieldContext.metadata.component as keyof typeof FIELD_RENDERER_REGISTRY];
      
      if (FieldComponent) {
        return (
          <FieldComponent 
            data={data} 
            label={fieldContext.label} 
            fieldKey={fieldContext.fieldKey} 
            context={context} 
          />
        );
      }
    }
    
    // Fallback to generic field renderer for consistent label/value presentation
    return (
      <GenericFieldRenderer 
        data={data} 
        label={fieldContext.label} 
        fieldKey={fieldContext.fieldKey} 
        context={context} 
      />
    );
  }

  // Handle null, undefined, or primitive values
  if (data === null || data === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }

  if (typeof data !== 'object') {
    return <span className="text-gray-600">{String(data)}</span>;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-400 italic">empty array</span>;
    }
    return (
      <div className="space-y-2 ml-4">
        {data.map((item, index) => (
          <div key={`item-${index}`}>
            <TypeDispatcher data={item} context={context} fieldContext={fieldContext} />
          </div>
        ))}
      </div>
    );
  }

  // Handle JSON-LD value objects (e.g., {"@value": "text", "@type": "xsd:string"})
  if (data['@value'] !== undefined) {
    const value = data['@value'];
    const dataType = data['@type'];

    // Handle different data types
    if (dataType === 'xsd:boolean' || dataType === 'http://www.w3.org/2001/XMLSchema#boolean') {
      return <span className="text-gray-600">{value ? 'true' : 'false'}</span>;
    }
    if (dataType === 'xsd:integer' || dataType === 'xsd:number' || dataType?.includes('XMLSchema#integer') || dataType?.includes('XMLSchema#number')) {
      return <span className="text-gray-600">{String(value)}</span>;
    }
    // Default to string representation
    return <span className="text-gray-600">{String(value)}</span>;
  }

  // Extract type for component selection
  const types = (data as JsonLdObject)['@type'] || (data as JsonLdObject)['https://example.org/core#type'] || [];
  const typeArray = Array.isArray(types) ? types : [types];

  // Find matching component - filter out falsy types
  const validTypes = typeArray.filter(type => type && typeof type === 'string');

  for (const type of validTypes) {
    const Component = TYPE_RENDERER_REGISTRY[type as keyof typeof TYPE_RENDERER_REGISTRY];

    if (Component) {
      return <Component data={data} context={context} />;
    }
  }

  // Fallback to default object renderer
  return <DefaultObjectRenderer data={data} context={context} />;
}