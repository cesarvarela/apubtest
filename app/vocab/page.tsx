export const metadata = {
    title: "Incident Core Vocabulary",
    description: "Human-readable documentation for the shared incident terms."
};

export default function CoreVocabPage() {
    return (
        <main className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Incident Core Vocabulary</h1>
            <p className="text-gray-700 leading-relaxed mb-6">
                This page documents the properties every node in the incident federation
                understands. For machine-readable contexts see the links below.
            </p>

            <h2 className="text-2xl font-semibold mb-4">Base namespace</h2>
            <code className="break-all bg-gray-100 px-2 py-1 rounded text-sm">https://incidents.org/vocab/core#</code>

            <h2 className="text-2xl font-semibold mb-4 mt-8">Terms</h2>

            <ul className="list-disc pl-6 mb-6">
                <li>Nothing yet.</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4">Downloads</h2>
            <ul className="list-disc pl-6 space-y-2">
                <li><a href="/context/core-v1.jsonld" className="text-blue-600 hover:text-blue-800 underline">JSON-LD Context (v1)</a></li>
                <li><a href="/schema/core-v1.json" className="text-blue-600 hover:text-blue-800 underline">JSON Schema (v1)</a></li>
                <li><a href={`/context/${process.env.NAMESPACE}-v1.jsonld`} className="text-blue-600 hover:text-blue-800 underline">JSON-LD Context (v1, local env)</a></li>
                <li><a href={`/schema/${process.env.NAMESPACE}-v1.json`} className="text-blue-600 hover:text-blue-800 underline">JSON Schema (v1, local env)</a></li>
            </ul>

            <footer className="mt-8 text-sm text-gray-500">
                Last updated {new Date().toISOString().slice(0, 10)}
            </footer>
        </main>
    );
}
