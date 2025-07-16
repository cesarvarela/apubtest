'use client';

import { createContext, useContext } from 'react';

interface DebugContextValue {
  debug: boolean;
}

const DebugContext = createContext<DebugContextValue>({ debug: false });

export const useDebugContext = () => useContext(DebugContext);

export default DebugContext;