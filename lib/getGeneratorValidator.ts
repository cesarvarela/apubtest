import { SchemaGenerator } from "./schemas";
import { Validator } from "./validation";

export async function getGeneratorValidator(): Promise<[SchemaGenerator, Validator]> {

    const schemasGenerator = new SchemaGenerator(
        process.env.NEXT_PUBLIC_CORE_DOMAIN!,
        process.env.NEXT_PUBLIC_LOCAL_DOMAIN!,
        process.env.NEXT_PUBLIC_NAMESPACE!
    );
    const validator = new Validator();

    await validator.initialize(schemasGenerator);

    return [schemasGenerator, validator];
}