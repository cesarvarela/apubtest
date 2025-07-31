'use client';

import { useState } from 'react';
import { SchemaObject } from 'ajv';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SchemaPreviewProps {
    schema: SchemaObject | null;
    namespace: string;
}

export default function SchemaPreview({ schema }: SchemaPreviewProps) {
    const [showAllProperties, setShowAllProperties] = useState(false);

    if (!schema) {
        return (
            <div className="p-4 text-center text-gray-500">
                No valid schema to preview
            </div>
        );
    }

    const localProperties = schema.allOf?.[1]?.properties || {};
    const requiredFields = schema.allOf?.[1]?.required || [];
    const propertyEntries = Object.entries(localProperties);
    const visibleProperties = showAllProperties ? propertyEntries : propertyEntries.slice(0, 3);
    const hasMoreProperties = propertyEntries.length > 3;

    return (
        <div className="border rounded-lg overflow-hidden bg-white">
            <div className="p-4">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium text-gray-900 mb-2">Schema Properties</h4>
                        <div className="text-sm text-gray-600 mb-4">
                            Schema ID: <code className="bg-gray-100 px-1 rounded">{schema.$id}</code>
                        </div>
                    </div>

                    {Object.keys(localProperties).length > 0 ? (
                        <div className="space-y-3">
                            <h5 className="font-medium text-gray-800">Local Properties:</h5>
                            {visibleProperties.map(([key, prop]: [string, any]) => (
                                <div key={key} className="border-l-4 border-blue-200 pl-3">
                                    <div className="flex items-center gap-2">
                                        <code className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">
                                            {key}
                                        </code>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                            {prop.type || 'mixed'}
                                        </span>
                                        {requiredFields.includes(key) && (
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                                required
                                            </span>
                                        )}
                                    </div>
                                    {prop.description && (
                                        <p className="text-sm text-gray-600 mt-1">{prop.description}</p>
                                    )}
                                    {prop.minLength && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Min length: {prop.minLength}
                                        </p>
                                    )}
                                    {prop.$ref && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            References: <code>{prop.$ref}</code>
                                        </p>
                                    )}
                                </div>
                            ))}
                            {hasMoreProperties && (
                                <button
                                    onClick={() => setShowAllProperties(!showAllProperties)}
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    {showAllProperties ? (
                                        <>
                                            <ChevronUp className="h-4 w-4" />
                                            Show less ({propertyEntries.length - 3} hidden)
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="h-4 w-4" />
                                            Show {propertyEntries.length - 3} more properties
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No local properties defined</p>
                    )}
                </div>
            </div>
        </div>
    );
}
