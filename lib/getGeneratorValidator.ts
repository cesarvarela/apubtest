import { SchemaGenerator } from "./schemas";
import { Validator } from "./validation";

export async function getGeneratorValidator(): Promise<[SchemaGenerator, Validator]> {

    const schemasGenerator = new SchemaGenerator(
        process.env.CORE_DOMAIN!,
        process.env.LOCAL_DOMAIN!,
        process.env.NAMESPACE!
    );
    const validator = new Validator();

    await validator.initialize(schemasGenerator);

    return [schemasGenerator, validator];
}