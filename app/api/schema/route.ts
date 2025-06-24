import { mergeSchemas } from '@/lib/helpers';
import { SchemaGenerator } from '@/lib/schemas';

export async function GET() {

    const schemasGenerator = new SchemaGenerator(process.env.CORE_DOMAIN!,process.env.LOCAL_DOMAIN!,process.env.NAMESPACE!);

    const [core, local] = await Promise.all([
        schemasGenerator.getCoreSchema(),
        schemasGenerator.getLocalSchema(),
    ]);

    const mergedSchema = mergeSchemas(core, local);

    return Response.json(mergedSchema);
}
