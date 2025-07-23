import Link from 'next/link';

export default function DemosPage() {
  return (
    <main className="flex min-h-screen flex-col items-start p-24">
      <div className="w-full max-w-5xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Demos
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore different visualization approaches for semantic data
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Semantic Display
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Interactive renderer for JSON-LD data with customizable field components and debug mode
            </p>
            <Link
              href="/demos/semantic-display"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Demo
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Graph Visualization
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Interactive graph visualization using Observable Plot showing relationships between entities
            </p>
            <Link
              href="/demos/graph-visualization"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              View Demo
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Visual Schema Editor
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create JSON schemas and JSON-LD contexts using a visual interface with support for relationships
            </p>
            <Link
              href="/demos/visual-schema-editor"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              View Demo
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Charts
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Interactive chart visualizations of AIID incident data using Observable Plot
            </p>
            <Link
              href="/demos/charts"
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              View Demo
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}