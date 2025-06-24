import SchemaPreview from './SchemaPreview';

interface CoreSchemaViewProps {
    schema: any;
}

export default function CoreSchemaView({ schema }: CoreSchemaViewProps) {
    if (!schema) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>Core schema not available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b">
                    <h3 className="font-medium text-gray-900">Schema Definition</h3>
                </div>
                <div className="bg-gray-50">
                    <pre className="p-4 text-sm font-mono text-gray-700 overflow-x-auto">
                        {JSON.stringify(schema, null, 2)}
                    </pre>
                </div>
            </div>
            <SchemaPreview schema={schema} namespace="core" />
        </div>
    );
}
