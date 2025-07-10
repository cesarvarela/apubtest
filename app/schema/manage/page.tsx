import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCode, Database } from 'lucide-react';
import LocalContextEditor from './LocalContextEditor';
import CoreContextView from './CoreContextView';
import TargetTypeSchemaManager from './TargetTypeSchemaManager';
import { getSchemaManager } from '@/lib/getGeneratorValidator';

// Add revalidate to ensure fresh data every 5 seconds (or set to 0 for no cache)
export const revalidate = 0;

export default async function SchemaManagementPage() {

    const namespace = process.env.NEXT_PUBLIC_NAMESPACE || 'local';
    const schemaManager = await getSchemaManager();

    // Load contexts directly using SchemaManager instead of HTTP requests
    // If they are not found we simply leave the corresponding variable as null so the UI can handle the "empty" state gracefully.

    const coreContext = await schemaManager.getSchema('context', 'core').catch(() => null);
    const localContext = await schemaManager.getSchema('context', namespace).catch(() => null);

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Schema Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your local schema, context, and vocabulary definitions alongside core schemas
                </p>
            </div>

            <div className="space-y-6">

                {/* Local Context - Editable */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <FileCode className="h-5 w-5" />
                            <span>Local Context</span>
                        </CardTitle>
                        <CardDescription>
                            Define semantic mappings and vocabulary for your namespace
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LocalContextEditor
                            initialContext={localContext}
                            namespace={namespace}
                            hasExistingContext={localContext !== null}
                        />
                    </CardContent>
                </Card>

                {/* Target Type Schemas */}
                <TargetTypeSchemaManager namespace={namespace} />

                {/* Core Context - Read Only */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <FileCode className="h-5 w-5" />
                            <span>Core Context</span>
                        </CardTitle>
                        <CardDescription>
                            The JSON-LD context that defines semantic mappings and vocabulary (read-only)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CoreContextView context={coreContext} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
