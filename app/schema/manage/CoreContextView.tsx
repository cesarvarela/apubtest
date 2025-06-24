interface CoreContextViewProps {
    context: any;
}

export default function CoreContextView({ context }: CoreContextViewProps) {
    if (!context) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>Core context not available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b">
                    <h3 className="font-medium text-gray-900">Context Definition</h3>
                </div>
                <div className="bg-gray-50">
                    <pre className="p-4 text-sm font-mono text-gray-700 overflow-x-auto">
                        {JSON.stringify(context, null, 2)}
                    </pre>
                </div>
            </div>
            
            {/* Context Analysis */}
            {context['@context'] && (
                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-100 px-4 py-2 border-b">
                        <h3 className="font-medium text-gray-900">Context Analysis</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {Object.entries(context['@context']).map(([key, value]) => (
                            <div key={key} className="flex items-start space-x-3">
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                                    {key}
                                </span>
                                <span className="text-gray-700 text-sm break-all">
                                    {typeof value === 'string' ? value : JSON.stringify(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
