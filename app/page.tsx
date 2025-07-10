import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-start p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="w-full flex justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Welcome to Semantic Incident Sharing</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Current namespace: {process.env.NEXT_PUBLIC_NAMESPACE || 'default'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        <Link href="/content" className="group block p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Content →
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            View and manage all content types
          </p>
        </Link>
        
        <Link href="/peers" className="group block p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Peers →
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage peer connections
          </p>
        </Link>
        
        <Link href="/pulls" className="group block p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Pulls →
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Handle data synchronization
          </p>
        </Link>
        
        <Link href="/schema/manage" className="group block p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Schema Management →
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Configure and manage schemas
          </p>
        </Link>
      </div>
    </main>
  );
}
