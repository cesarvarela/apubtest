"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { withTheme } from '@rjsf/core';
import { Theme as ShadcnTheme } from '@rjsf/shadcn';
import { Button } from '@mui/material';
import { v4 as uuid } from 'uuid';
import validator from '@rjsf/validator-ajv8';
import { generateHiddenAtFieldsUiSchema } from '@/lib/utils';

const Form = withTheme(ShadcnTheme);

interface IncidentFormProps {
    schema: any;
}

export default function IncidentForm({ schema }: IncidentFormProps) {

    const generatedId = `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}/incidents/${uuid()}`;

    const [data, setData] = useState<any>({ [`@id`]: generatedId });

    const handleChange = useCallback(
        (event: any) => setData(event.formData),
        []
    );

    const handleSubmit = async ({ formData }: any) => {
        const response = await fetch('/api/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('Incident submitted successfully');
        }
        else {
            const error = await response.text();
            alert(`Submission failed: ${error}`);
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
                <Button type="submit" variant="contained">
                    Submit
                </Button>
            </Form>
        </div>
    );
}
