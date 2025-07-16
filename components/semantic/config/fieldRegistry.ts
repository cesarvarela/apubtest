import DeployedByFieldRenderer from '../fields/DeployedByFieldRenderer';
import type { FieldRendererProps } from '../types/interfaces';
import type { ComponentType } from 'react';

export const FIELD_RENDERER_REGISTRY = {
  DeployedByFieldRenderer: DeployedByFieldRenderer,
} as const satisfies Record<string, ComponentType<FieldRendererProps>>;

export type FieldRendererRegistry = typeof FIELD_RENDERER_REGISTRY;
export type RegisteredFieldRenderer = keyof FieldRendererRegistry;