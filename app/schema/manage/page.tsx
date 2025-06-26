import { SchemaNotFoundError } from '@/lib/schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCode, Database } from 'lucide-react';
import LocalSchemaEditor from './LocalSchemaEditor';
import LocalContextEditor from './LocalContextEditor';
import CoreSchemaView from './CoreSchemaView';
import CoreContextView from './CoreContextView';
import { getGeneratorValidator } from '@/lib/getGeneratorValidator';

// Add revalidate to ensure fresh data every 5 seconds (or set to 0 for no cache)
export const revalidate = 0;

export default async function SchemaManagementPage() {

    let coreSchema = null;
    let coreContext = null;
    let localSchema = null;
    let localContext = null;

    const [schemasGenerator] = await getGeneratorValidator();

    try {
        coreSchema = await schemasGenerator.getCoreSchema();
    } catch (error) {
        if (error instanceof SchemaNotFoundError) {
            coreSchema = null;
        } else {
            throw error;
        }
    }

    try {
        coreContext = await schemasGenerator.getCoreContext();
    } catch (error) {
        if (error instanceof SchemaNotFoundError) {
            coreContext = null;
        } else {
            throw error;
        }
    }

    try {
        localSchema = await schemasGenerator.getLocalSchema();
    } catch (error) {
        if (error instanceof SchemaNotFoundError) {
            localSchema = null;
        } else {
            throw error;
        }
    }

    try {
        localContext = await schemasGenerator.getLocalContext();
    } catch (error) {
        if (error instanceof SchemaNotFoundError) {
            localContext = null;
        } else {
            throw error;
        }
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Schema Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your local schema, context, and vocabulary definitions alongside core schemas
                </p>
            </div>

            <div className="space-y-6">

                {/* Local Schema, Context, and Vocab - Editable */}
                <Card>
                    <CardContent>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <LocalSchemaEditor
                                initialSchema={localSchema}
                                namespace={schemasGenerator.namespace}
                                hasExistingSchema={localSchema !== null}
                            />
                            <LocalContextEditor
                                initialContext={localContext}
                                namespace={schemasGenerator.namespace}
                                hasExistingContext={localContext !== null}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Core Schema - Read Only */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Database className="h-5 w-5" />
                            <span>Core Schema</span>
                        </CardTitle>
                        <CardDescription>
                            The foundational schema that defines the base structure (read-only)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CoreSchemaView schema={coreSchema} />
                    </CardContent>
                </Card>

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
