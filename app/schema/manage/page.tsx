import SchemaManagementClient from './SchemaManagementClient';
import { getSchemaManager } from '@/lib/getGeneratorValidator';

// Add revalidate to ensure fresh data every 5 seconds (or set to 0 for no cache)
export const revalidate = 0;

export default async function SchemaManagementPage() {

    const namespace = process.env.NEXT_PUBLIC_NAMESPACE || 'local';
    const schemaManager = await getSchemaManager();

    // Load contexts directly using SchemaManager instead of HTTP requests
    // If they are not found we simply leave the corresponding variable as null so the UI can handle the "empty" state gracefully.

    const coreContext = await schemaManager.getMergedContextForNamespace('core').catch(() => null);
    const localMergedContext = await schemaManager.getMergedContextForNamespace(namespace).catch(() => null);

    return (
        <SchemaManagementClient 
            namespace={namespace}
            coreContext={coreContext}
            localMergedContext={localMergedContext}
        />
    );
}
