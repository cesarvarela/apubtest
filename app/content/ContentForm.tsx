"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { withTheme } from '@rjsf/core';
import { Theme as ShadcnTheme } from '@rjsf/shadcn';
import { Button } from '@/components/ui/button';
import { v4 as uuid } from 'uuid';
import validator from '@rjsf/validator-ajv8';
import { generateHiddenAtFieldsUiSchema } from '@/lib/helpers';

const Form = withTheme(ShadcnTheme);

interface ContentFormProps {
    contentType: string;
    initialData?: any;
    onSubmit?: (data: any) => Promise<void>;
    onCancel?: () => void;
    submitButtonText?: string;
    mode?: 'create' | 'edit';
}

export default function ContentForm({ 
    contentType,
    initialData, 
    onSubmit, 
    onCancel, 
    submitButtonText = 'Submit',
    mode = 'create'
}: ContentFormProps) {

    const [schema, setSchema] = useState<any>(null);
    const [isLoadingSchema, setIsLoadingSchema] = useState(true);
    const generatedId = `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}/content/${uuid()}`;

    const [data, setData] = useState<any>(() => {
        if (mode === 'edit' && initialData) {
            return initialData;
        }
        
        const namespace = process.env.NEXT_PUBLIC_NAMESPACE || 'local';
        
        return { 
            [`@id`]: generatedId,
            [`@context`]: [
                "https://example.org/core/context",
                `https://example.org/${namespace}/context`
            ],
            [`@type`]: [contentType],
            title: ""
        };
    });

    // Load schema based on content type
    useEffect(() => {
        const loadSchema = async () => {
            if (!contentType) return;
            
            console.log('Loading schema for contentType:', contentType);
            
            setIsLoadingSchema(true);
            try {
                // Extract namespace from content type (e.g., "core:Incident" -> "core")
                const [namespace] = contentType.split(':');
                console.log('Extracted namespace:', namespace);
                
                const apiUrl = `/api/schemas/manage?namespace=${namespace}&type=validation&targetType=${contentType}`;
                console.log('API URL:', apiUrl);
                
                const response = await fetch(apiUrl);
                
                console.log('Schema API response status:', response.status);
                console.log('Schema API response ok:', response.ok);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Schema API response data:', data);
                    console.log('Actual schema object:', data.schema);
                    console.log('Schema type:', typeof data.schema);
                    console.log('Schema is null?', data.schema === null);
                    console.log('Schema is undefined?', data.schema === undefined);
                    setSchema(data.schema);
                    console.log('Schema state set, isLoadingSchema will be set to false');
                } else {
                    console.error('Failed to load schema for', contentType);
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    setSchema(null);
                }
            } catch (error) {
                console.error('Error loading schema:', error);
                setSchema(null);
            } finally {
                setIsLoadingSchema(false);
            }
        };

        loadSchema();
    }, [contentType]);

    const handleChange = useCallback(
        (event: any) => setData(event.formData),
        []
    );

    const handleSubmit = async ({ formData }: any) => {
        if (onSubmit) {
            await onSubmit(formData);
        } else {
            // Default behavior for create mode using content API
            const namespace = process.env.NEXT_PUBLIC_NAMESPACE || 'local';
            const primaryType = Array.isArray(formData["@type"]) ? formData["@type"][0] : formData["@type"];
            
            const response = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contentType: primaryType,
                    namespace,
                    uri: formData["@id"],
                    data: formData,
                    sourceNode: 'local'
                })
            });

            if (response.ok) {
                alert('Content submitted successfully');
            } else {
                const error = await response.text();
                alert(`Submission failed: ${error}`);
            }
        }
    };

    const uiSchema = useMemo(() => {
        if (!schema) return {};
        const result = generateHiddenAtFieldsUiSchema(schema);
        return result;
    }, [schema]);

    // Check if schema has any visible fields (non-@ prefixed fields)
    const hasVisibleFields = useMemo(() => {
        if (!schema || !schema.properties) return false;
        return Object.keys(schema.properties).some(key => !key.startsWith('@'));
    }, [schema]);

    if (isLoadingSchema) {
        console.log('Rendering loading state, isLoadingSchema:', isLoadingSchema);
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading schema for {contentType}...</p>
            </div>
        );
    }

    if (!schema) {
        console.log('Rendering no schema state, schema:', schema, 'isLoadingSchema:', isLoadingSchema);
        return (
            <div className="p-8 text-center">
                <p className="text-red-600">No schema found for content type: {contentType}</p>
                <p className="text-sm text-gray-600 mt-2">
                    Make sure a validation schema exists for this content type.
                </p>
            </div>
        );
    }

    if (!hasVisibleFields) {
        console.log('Schema has no visible fields. Properties:', Object.keys(schema.properties || {}));
        return (
            <div className="p-8 text-center">
                <p className="text-amber-600">No editable fields in schema for content type: {contentType}</p>
                <p className="text-sm text-gray-600 mt-2">
                    This schema only contains metadata fields (@id, @type, @context) which are automatically managed.
                    <br />
                    To create content with this type, please add additional properties to the schema in the Schema Management page.
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                    <p className="text-sm font-medium text-gray-700 mb-2">Current schema properties:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                        {Object.keys(schema.properties || {}).map(key => (
                            <li key={key} className={key.startsWith('@') ? 'text-gray-400' : ''}>
                                {key} {key.startsWith('@') ? '(hidden metadata)' : ''}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }

    console.log('Rendering form with schema:', !!schema, 'isLoadingSchema:', isLoadingSchema);

    return (
        <div className="p-4 rounded shadow">
            <Form
                schema={schema}
                uiSchema={uiSchema}
                formData={data}
                validator={validator}
                onChange={handleChange}
                onSubmit={handleSubmit}
            >
                <div className="flex justify-end space-x-2 mt-4">
                    {onCancel && (
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" variant="default">
                        {submitButtonText}
                    </Button>
                </div>
            </Form>
        </div>
    );
} 