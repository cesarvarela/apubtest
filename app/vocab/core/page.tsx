export const metadata = {
    title: "Incident Core Vocabulary",
    description: "Human-readable documentation for the shared incident terms."
};

export default function CoreVocabPage() {
    return (
        <main className="max-w-2xl mx-auto p-6 prose">
            <h1>Incident Core Vocabulary</h1>
            <p>
                This page documents the properties every node in the incident federation
                understands. For machine-readable contexts see the links below.
            </p>

            <h2>Base namespace</h2>
            <code className="break-all">https://incidents.org/vocab/core#</code>

            <h2>Terms</h2>

            <ul>
                <li>Nothing yet.</li>
            </ul>

            <h2>Downloads</h2>
            <ul>
                <li><a href="/context/core-v1.jsonld">JSON-LD Context (v1)</a></li>
                <li><a href="/schema/core-v1.json">JSON Schema (v1)</a></li>
                <li><a href={`/context/${process.env.NAMESPACE}-v1.jsonld`}>JSON-LD Context (v1, local env)</a></li>
                <li><a href={`/schema/${process.env.NAMESPACE}-v1.json`}>JSON Schema (v1, local env)</a></li>
            </ul>

            <footer className="mt-8 text-sm text-gray-500">
                Last updated {new Date().toISOString().slice(0, 10)}
            </footer>
        </main>
    );
}
