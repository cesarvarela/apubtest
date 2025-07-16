import CoreOrganizationRenderer from '../types/CoreOrganizationRenderer';
import CoreIncidentRenderer from '../types/CoreIncidentRenderer';
import type { TypeRendererProps } from '../types/interfaces';
import type { ComponentType } from 'react';

export const TYPE_RENDERER_REGISTRY = {
  'https://example.org/core#Organization': CoreOrganizationRenderer,
  'https://example.org/core#Incident': CoreIncidentRenderer,
} as const satisfies Record<string, ComponentType<TypeRendererProps>>;

export type TypeRendererRegistry = typeof TYPE_RENDERER_REGISTRY;
export type RegisteredTypeUri = keyof TypeRendererRegistry;