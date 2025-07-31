'use client';

import { Building2 } from 'lucide-react';
import TypeDispatcher from '../TypeDispatcher';
import DebugWrapper from '../debug/DebugWrapper';
import type { FieldRendererProps } from '../types/interfaces';

export default function DeployedByFieldRenderer({ data, label, context }: FieldRendererProps) {
  return (
    <DebugWrapper rendererType="DeployedByFieldRenderer" data={data}>
      <div className="text-sm">
        <div className="flex items-center space-x-2 font-medium text-gray-700 mb-3">
          <Building2 className="h-4 w-4 text-blue-600" />
          <span>{label}</span>
        </div>
        <div>
          <TypeDispatcher data={data} context={context} />
        </div>
      </div>
    </DebugWrapper>
  );
}