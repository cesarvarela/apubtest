'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { withTheme } from '@rjsf/core';
import { Theme as ShadcnTheme } from '@rjsf/shadcn';
import validator from '@rjsf/validator-ajv8';
import { generateHiddenAtFieldsUiSchema } from '@/lib/helpers';
import { LivePreviewProps } from './types';
import { AlertCircle } from 'lucide-react';

const Form = withTheme(ShadcnTheme);

export default function LivePreview({ schema, namespace, targetType }: LivePreviewProps) {
  const [formData, setFormData] = useState<any>({});
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Generate sample data based on schema
  const sampleData = useMemo(() => {
    if (!schema || !schema.properties) return {};
    
    try {
      const data: any = {};
      
      // Add required JSON-LD fields
      data['@id'] = `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN || 'https://example.org'}/content/preview-${Date.now()}`;
      data['@type'] = [`${namespace}:${targetType}`];
      data['@context'] = [
        "https://example.org/core/context",
        `https://example.org/${namespace}/context`
      ];
      
      // Generate sample values for user-defined fields
      Object.entries(schema.properties).forEach(([key, property]: [string, any]) => {
        if (key.startsWith('@')) return; // Skip JSON-LD metadata
        
        const sampleValue = generateSampleValue(property);
        // Ensure no null or undefined values make it into the form data
        if (sampleValue !== null && sampleValue !== undefined) {
          data[key] = sampleValue;
        } else {
          // Fallback to appropriate default based on property type
          if (property.type === 'array') {
            data[key] = [];
          } else if (property.type === 'object') {
            data[key] = {};
          } else if (property.type === 'boolean') {
            data[key] = false;
          } else if (property.type === 'number') {
            data[key] = 0;
          } else {
            data[key] = '';
          }
        }
      });
      
      return data;
    } catch (error) {
      console.error('Error generating sample data:', error);
      // Return a safe default with just JSON-LD metadata
      return {
        '@id': `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN || 'https://example.org'}/content/preview-${Date.now()}`,
        '@type': [`${namespace}:${targetType}`],
        '@context': [
          "https://example.org/core/context",
          `https://example.org/${namespace}/context`
        ]
      };
    }
  }, [schema, namespace, targetType]);

  // Initialize form data when sample data changes
  useEffect(() => {
    setFormData(sampleData);
  }, [sampleData]);

  // Generate UI schema to hide @ fields and enhance relationship fields
  const uiSchema = useMemo(() => {
    if (!schema) return {};
    try {
      const baseUiSchema = generateHiddenAtFieldsUiSchema(schema);
      
      // Enhance relationship fields with better UI configuration
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, property]: [string, any]) => {
          if (key.startsWith('@')) return; // Skip JSON-LD metadata
          
          // Check if this is a relationship field
          if (isRelationshipField(property)) {
            if (!baseUiSchema[key]) baseUiSchema[key] = {};
            
            // Configure @id field to use URI widget for better URL input
            if (property.type === 'object') {
              baseUiSchema[key]['@id'] = {
                'ui:widget': 'uri',
                'ui:placeholder': 'https://example.org/resource/id'
              };
              baseUiSchema[key]['@type'] = {
                'ui:widget': 'hidden' // Hide @type since it's usually pre-filled
              };
            } else if (property.type === 'array' && property.items) {
              // Handle array of relationships
              if (!baseUiSchema[key].items) baseUiSchema[key].items = {};
              baseUiSchema[key].items['@id'] = {
                'ui:widget': 'uri',
                'ui:placeholder': 'https://example.org/resource/id'
              };
              baseUiSchema[key].items['@type'] = {
                'ui:widget': 'hidden'
              };
            }
          }
        });
      }
      
      return baseUiSchema;
    } catch (error) {
      console.error('Error generating UI schema:', error);
      return {};
    }
  }, [schema]);

  // Validate schema
  useEffect(() => {
    setSchemaError(null);
    
    if (!schema) {
      setSchemaError('No schema provided');
      return;
    }
    
    try {
      // Basic schema validation
      if (!schema.type || schema.type !== 'object') {
        setSchemaError('Schema must be of type "object"');
        return;
      }
      
      if (!schema.properties) {
        setSchemaError('Schema must have properties');
        return;
      }
      
      // Check if schema has any user-editable fields
      const hasUserFields = Object.keys(schema.properties).some(key => !key.startsWith('@'));
      if (!hasUserFields) {
        setSchemaError('Schema has no user-editable fields');
        return;
      }
    } catch (error) {
      setSchemaError(`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [schema]);

  const handleChange = (event: any) => {
    // Sanitize form data to prevent null values
    const sanitizedData = sanitizeFormData(event.formData);
    setFormData(sanitizedData);
  };

  const handleSubmit = (data: any) => {
    // This is just a preview - log the form data instead of submitting
    console.log('Preview form data:', data.formData);
    // No need to preventDefault - RJSF handles this differently than regular forms
  };

  // Show error state
  if (schemaError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-medium text-red-700">Schema Error</p>
          <p className="text-sm text-red-600 mt-1">{schemaError}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!schema || !targetType.trim()) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
            <span className="text-2xl">📝</span>
          </div>
          <p className="text-lg font-medium">No Content Type</p>
          <p className="text-sm">Enter a content type name to see the form preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-4">
        <div className="mb-4 pb-4 border-b">
          <h3 className="text-lg font-semibold text-foreground">
            Form Preview: {namespace}:{targetType}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            This is how the form will appear to users creating content of this type
          </p>
        </div>
        
        <div className="bg-background rounded-lg border p-4">
          <Form
            schema={schema}
            uiSchema={uiSchema}
            formData={formData}
            validator={validator}
            onChange={handleChange}
            onSubmit={handleSubmit}
            showErrorList={false}
            liveValidate
          >
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Preview Submit
              </button>
            </div>
          </Form>
        </div>
        
        {Object.keys(formData).length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Current Form Data:</h4>
            <pre className="text-xs bg-background p-2 rounded border overflow-auto max-h-32">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to sanitize form data and prevent null values
function sanitizeFormData(data: any): any {
  if (data === null || data === undefined) {
    return '';
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFormData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    Object.entries(data).forEach(([key, value]) => {
      sanitized[key] = sanitizeFormData(value);
    });
    return sanitized;
  }
  
  return data;
}

// Helper function to detect relationship objects
function isRelationshipObject(property: any): boolean {
  return property.type === 'object' && 
         property.properties?.['@id'] && 
         property.properties?.['@type'] &&
         property.properties?.['@id'].type === 'string' &&
         property.properties?.['@id'].format === 'uri';
}

// Helper function to detect relationship fields (single or array)
function isRelationshipField(property: any): boolean {
  if (property.type === 'object') {
    return isRelationshipObject(property);
  } else if (property.type === 'array' && property.items) {
    return isRelationshipObject(property.items);
  }
  return false;
}

// Helper function to generate sample values based on property type
function generateSampleValue(property: any): any {
  if (property.enum && property.enum.length > 0) {
    return property.enum[0];
  }
  
  switch (property.type) {
    case 'string':
      if (property.format === 'email') return 'user@example.com';
      if (property.format === 'uri') return 'https://example.org/resource';
      if (property.format === 'date') return new Date().toISOString().split('T')[0];
      if (property.format === 'date-time') return new Date().toISOString();
      if (property.format === 'uuid') return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      return 'Sample text';
      
    case 'number':
    case 'integer':
      const min = property.minimum || 0;
      const max = property.maximum || 100;
      return Math.floor(Math.random() * (max - min + 1)) + min;
      
    case 'boolean':
      return false;
      
    case 'array':
      if (property.items) {
        // Handle relationship arrays - generate multiple sample items
        const sampleItem = generateSampleValue(property.items);
        if (isRelationshipObject(property.items)) {
          // Generate 2 sample relationship items for better preview
          const targetType = property.items.properties?.['@type']?.const || 'RelatedType';
          return [
            {
              '@id': `https://example.org/related/${targetType.toLowerCase()}/1`,
              '@type': targetType
            },
            {
              '@id': `https://example.org/related/${targetType.toLowerCase()}/2`, 
              '@type': targetType
            }
          ];
        }
        return [sampleItem];
      }
      return [];
      
    case 'object':
      if (property.properties) {
        const obj: any = {};
        Object.entries(property.properties).forEach(([key, subProperty]) => {
          obj[key] = generateSampleValue(subProperty);
        });
        return obj;
      }
      
      // Handle relationship objects
      if (isRelationshipObject(property)) {
        const targetType = property.properties?.['@type']?.const || 'RelatedType';
        return {
          '@id': `https://example.org/related/${targetType.toLowerCase()}/sample`,
          '@type': targetType
        };
      }
      
      return {};
      
    default:
      return '';
  }
}