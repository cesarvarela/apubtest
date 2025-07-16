'use client';

import TypeDispatcher from './TypeDispatcher';
import DebugContext from './debug/DebugContext';

interface SemanticRendererProps {
  expandedPayload: any;
  context?: any;
  debug?: boolean;
}

export default function SemanticRenderer({ expandedPayload, context, debug = false }: SemanticRendererProps) {
  return (
    <DebugContext.Provider value={{ debug }}>
      <div className="semantic-renderer">
        <TypeDispatcher data={expandedPayload} context={context} />
      </div>
    </DebugContext.Provider>
  );
}