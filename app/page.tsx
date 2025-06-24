import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-start p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          DSRI Prototypes APub Test
        </p>
      </div>

      <nav className="mt-8 flex flex-col space-y-4 items-start w-full max-w-5xl">
        <Link href="/incidents">
          Incidents
        </Link>
        <Link href="/incidents/list">
          Incident List
        </Link>
        <Link href="/peers">
          Peers
        </Link>
        <Link href="/pulls">
          Pulls
        </Link>
        <Link href="/schema/manage">
          Schema Management
        </Link>
        <Link href="/vocab/core">
          Vocabulary
        </Link>
      </nav>
    </main>
  );
}
