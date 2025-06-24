import { schemasGenerator } from '@/lib/validation';
import { mergeSchemas } from '@/lib/helpers';
import IncidentForm from './IncidentForm';

export default async function IncidentPage() {

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
