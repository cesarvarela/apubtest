"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const Breadcrumbs = () => {
  const pathname = usePathname();
  
  if (pathname === "/") return null;
  
  const pathSegments = pathname.split("/").filter(Boolean);
  
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const label = formatSegmentLabel(segment);
    const isLast = index === pathSegments.length - 1;
    
    return {
      href,
      label,
      isLast
    };
  });
  
  return (
    <nav className="flex bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 border-b border-gray-200 dark:border-zinc-700" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1 md:space-x-3 max-w-7xl mx-auto w-full">
        <li className="inline-flex items-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Link>
        </li>
        {breadcrumbItems.map((item, index) => (
          <li key={item.href}>
            <div className="flex items-center">
              <ChevronRight className="w-5 h-5 text-gray-400" />
              {item.isLast ? (
                <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400 md:ml-2">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 md:ml-2"
                >
                  {item.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

function formatSegmentLabel(segment: string): string {

    const specialCases: Record<string, string> = {
    "incidents": "Incidents",
    "peers": "Peers", 
    "pulls": "Pulls",
    "schema": "Schema",
    "vocab": "Vocabulary",
    "manage": "Management",
    "core": "Core",
    "list": "List"
  };
  
  if (specialCases[segment]) {
    return specialCases[segment];
  }
  
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default Breadcrumbs;
