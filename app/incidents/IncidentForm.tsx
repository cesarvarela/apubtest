"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { withTheme } from '@rjsf/core';
import { Theme as ShadcnTheme } from '@rjsf/shadcn';
import { Button } from '@/components/ui/button';
import { v4 as uuid } from 'uuid';
import validator from '@rjsf/validator-ajv8';
import { generateHiddenAtFieldsUiSchema } from '@/lib/helpers';

const Form = withTheme(ShadcnTheme);

interface IncidentFormProps {
    schema: any;
    initialData?: any;
    onSubmit?: (data: any) => Promise<void>;
    onCancel?: () => void;
    submitButtonText?: string;
    mode?: 'create' | 'edit';
}

export default function IncidentForm({ 
    schema, 
    initialData, 
    onSubmit, 
    onCancel, 
    submitButtonText = 'Submit',
    mode = 'create'
}: IncidentFormProps) {

    const generatedId = `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}/incidents/${uuid()}`;

    const [data, setData] = useState<any>(() => {
        if (mode === 'edit' && initialData) {
            return initialData;
        }
        return { [`@id`]: generatedId };
    });

    const handleChange = useCallback(
        (event: any) => setData(event.formData),
        []
    );

    const handleSubmit = async ({ formData }: any) => {
        if (onSubmit) {
            await onSubmit(formData);
        } else {
            // Default behavior for create mode
            const response = await fetch('/api/incidents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('Incident submitted successfully');
            } else {
                const error = await response.text();
                alert(`Submission failed: ${error}`);
            }
        }
    };

    const uiSchema = useMemo(() => {
        const result = generateHiddenAtFieldsUiSchema(schema);
        
        return result;
    }, [schema]);

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
