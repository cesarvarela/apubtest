'use client';

import TypeDispatcher from '../TypeDispatcher';
import DebugWrapper from '../debug/DebugWrapper';
import type { FieldRendererProps } from '../types/interfaces';

export default function GenericFieldRenderer({ data, label, fieldKey, context }: FieldRendererProps) {
  return (
    <DebugWrapper rendererType="GenericFieldRenderer" data={data}>
      <div className="text-sm">
        <div className="font-medium text-gray-700 mb-3">
          {label}
        </div>
        <div>
          <TypeDispatcher data={data} context={context} />
        </div>
      </div>
    </DebugWrapper>
  );
}