import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-start p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="w-full flex justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          <h2 className="text-lg font-semibold">Welcome to DSRI Prototypes APub Test</h2>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        <Link href="/incidents" className="group block p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Incidents →
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            View and manage incident reports
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
        
        <Link href="/vocab/core" className="group block p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Vocabulary →
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Explore core vocabulary definitions
          </p>
        </Link>
      </div>
    </main>
  );
}
