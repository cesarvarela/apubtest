import { mergeSchemas } from '@/lib/helpers';
import IncidentForm from './IncidentForm';
import { SchemaGenerator, SchemaNotFoundError } from '@/lib/schemas';

export default async function IncidentPage() {

    const schemasGenerator = new SchemaGenerator(process.env.CORE_DOMAIN!, process.env.LOCAL_DOMAIN!, process.env.NAMESPACE!);

    try {

        const [core, local] = await Promise.all([
            schemasGenerator.getCoreSchema(),
            schemasGenerator.getLocalSchema(),
        ]);

        const mergedSchema = mergeSchemas(core, local);

        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Submit a New Incident</h1>
                <IncidentForm schema={mergedSchema} />
            </div>
        );
    }
    catch (error) {

        if (error instanceof SchemaNotFoundError) {

            console.error(`Schema not found: ${error.namespace} - ${error.schemaType}`);

            return (
                <div className="text-center py-8 text-gray-500">
                    <p>{`Schema not found for ${error.namespace} - ${error.schemaType}`}</p>
                </div>
            );
        }
    }
}
