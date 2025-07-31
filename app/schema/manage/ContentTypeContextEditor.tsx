'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, RotateCcw } from 'lucide-react';
import { SchemaObject } from 'ajv';

interface ContentTypeContextEditorProps {
    initialContext: SchemaObject | null;
    targetType: string;
    namespace: string;
    onSave: (context: SchemaObject) => void;
    onCancel: () => void;
}

export default function ContentTypeContextEditor({ 
    initialContext, 
    onSave, 
    onCancel 
}: ContentTypeContextEditorProps) {
    
    const defaultContext = {
        "@context": {
            // Content-type specific mappings go here
        }
    };
    
    const [contextText, setContextText] = useState<string>(
        initialContext ? JSON.stringify(initialContext, null, 2) : JSON.stringify(defaultContext, null, 2)
    );
    const [isValid, setIsValid] = useState(true);
    const [validationError, setValidationError] = useState<string>('');
    
    const validateContext = (text: string): boolean => {
        try {
            const parsed = JSON.parse(text);
            
            if (!parsed['@context']) {
                throw new Error('Context must have a @context property');
            }
            
            setValidationError('');
            setIsValid(true);
            return true;
        } catch (error) {
            setValidationError(error instanceof Error ? error.message : 'Invalid JSON');
            setIsValid(false);
            return false;
        }
    };
    
    const handleContextChange = (value: string) => {
        setContextText(value);
        if (value.trim()) {
            validateContext(value);
        }
    };
    
    const handleSave = () => {
        if (validateContext(contextText)) {
            const parsed = JSON.parse(contextText);
            onSave(parsed);
        }
    };
    
    const handleReset = () => {
        const resetText = JSON.stringify(defaultContext, null, 2);
        setContextText(resetText);
        validateContext(resetText);
    };
    
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2">
                    JSON-LD Context Definition
                </label>
                <textarea
                    value={contextText}
                    onChange={(e) => handleContextChange(e.target.value)}
                    className={`w-full h-96 font-mono text-sm p-4 border rounded-lg ${
                        isValid ? 'border-gray-300' : 'border-red-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Enter your JSON-LD context..."
                    spellCheck={false}
                />
            </div>
            
            {validationError && (
                <Alert variant="destructive">
                    <AlertDescription>
                        {validationError}
                    </AlertDescription>
                </Alert>
            )}
            
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={handleReset}
                    size="sm"
                >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                </Button>
                
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!isValid || !contextText.trim()}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Save Context
                    </Button>
                </div>
            </div>
        </div>
    );
}