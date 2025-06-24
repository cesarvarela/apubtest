import { schemasGenerator } from '@/lib/validation';
import { SchemaNotFoundError } from '@/lib/schemas';
import LocalSchemaEditor from './LocalSchemaEditor';
import LocalContextEditor from './LocalContextEditor';
import CoreSchemaView from './CoreSchemaView';
import CoreContextView from './CoreContextView';

export default async function SchemaManagementPage() {

    let coreSchema = null;
    let coreContext = null;
    let localSchema = null;
    let localContext = null;

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
        <div className="container mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-4">Schema Management</h1>
            </div>

            <div className="space-y-8">

                {/* Local Schema and Context - Editable */}
                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-6 py-4 border-b">
                        <h2 className="text-xl font-semibold text-gray-900">Local Schema & Context (Editable)</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Namespace: <code className="bg-gray-100 px-1 rounded">{schemasGenerator.namespace}</code>
                        </p>
                    </div>
                    <div className="p-6">
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
                    </div>
                </div>

                {/* Core Schema - Read Only */}
                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b">
                        <h2 className="text-xl font-semibold text-gray-900">Core Schema (Read Only)</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            The foundational schema that defines the base structure
                        </p>
                    </div>
                    <div className="p-6">
                        <CoreSchemaView schema={coreSchema} />
                    </div>
                </div>

                {/* Core Context - Read Only */}
                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-green-50 px-6 py-4 border-b">
                        <h2 className="text-xl font-semibold text-gray-900">Core Context (Read Only)</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            The JSON-LD context that defines semantic mappings and vocabulary
                        </p>
                    </div>
                    <div className="p-6">
                        <CoreContextView context={coreContext} />
                    </div>
                </div>
            </div>
        </div>
    );
}
