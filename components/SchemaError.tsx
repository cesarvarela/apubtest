'use client';

import Link from 'next/link';

interface SchemaErrorProps {
    error: {
        message: string;
        schemaType?: 'core' | 'local';
        contentType?: 'schema' | 'context';
        namespace?: string;
    };
    showSetupLink?: boolean;
    className?: string;
}

export default function SchemaError({ error, showSetupLink = true, className = '' }: SchemaErrorProps) {
    return (
        <div className={`max-w-2xl mx-auto ${className}`}>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                            Schema Configuration Required
                        </h3>
                    </div>
                </div>
                <div className="text-sm text-yellow-700 mb-4">
                    <p className="mb-2">{error.message}</p>
                    <p>This feature cannot be used without properly configured schemas.</p>
                </div>
                {showSetupLink && (
                    <div className="flex gap-2">
                        <Link 
                            href="/schema/manage"
                            className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
                        >
                            Configure Schema
                        </Link>
                        <Link 
                            href="/"
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            Go Home
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
