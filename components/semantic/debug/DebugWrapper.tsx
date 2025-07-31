'use client';

import { ReactNode } from 'react';
import { useDebugContext } from './DebugContext';

interface DebugWrapperProps {
  children: ReactNode;
  rendererType: string;
  data?: any;
}

const rendererColors = {
  'CoreIncident': 'border-red-500 bg-red-50',
  'CoreOrganization': 'border-blue-500 bg-blue-50', 
  'Generic': 'border-green-500 bg-green-50',
  'Primitive': 'border-yellow-500 bg-yellow-50',
  'Array': 'border-purple-500 bg-purple-50',
  'JSONLDValue': 'border-cyan-500 bg-cyan-50'
};

const rendererLabels = {
  'CoreIncident': 'Incident',
  'CoreOrganization': 'Org',
  'Generic': 'Generic', 
  'Primitive': 'Value',
  'Array': 'Array',
  'JSONLDValue': 'JSONLD'
};

export default function DebugWrapper({ children, rendererType }: DebugWrapperProps) {
  const { debug } = useDebugContext();
  
  if (!debug) {
    return <>{children}</>;
  }

  const colorClass = rendererColors[rendererType as keyof typeof rendererColors] || 'border-gray-500 bg-gray-50';
  const label = rendererLabels[rendererType as keyof typeof rendererLabels] || rendererType;

  return (
    <div className={`relative border-2 ${colorClass} rounded p-2 m-1`}>
      <div className="absolute -top-1 -left-1 bg-white border border-gray-300 rounded px-1 py-0.5 text-[10px] font-mono font-bold text-gray-700 leading-none">
        {label}
      </div>
      {children}
    </div>
  );
}