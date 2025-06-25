import { getGeneratorValidator } from '@/lib/getGeneratorValidator';
import { mergeSchemas } from '@/lib/helpers';

export async function GET() {

    const [schemasGenerator] = await getGeneratorValidator();

    const [core, local] = await Promise.all([
        schemasGenerator.getCoreSchema(),
        schemasGenerator.getLocalSchema(),
    ]);

    const mergedSchema = mergeSchemas(core, local);

    return Response.json(mergedSchema);
}
