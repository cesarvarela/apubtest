import { schemasGenerator } from '@/lib/validation';
import { mergeSchemas } from '@/lib/helpers';

export async function GET() {

    const [core, local] = await Promise.all([
        schemasGenerator.getCoreSchema(),
        schemasGenerator.getLocalSchema(),
    ]);

    const mergedSchema = mergeSchemas(core, local);

    return Response.json(mergedSchema);
}
