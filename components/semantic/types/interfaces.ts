/**
 * Core data types for semantic rendering
 */
export interface JsonLdValue {
  '@value': any;
  '@type'?: string;
  '@language'?: string;
}

export interface JsonLdObject {
  '@id'?: string;
  '@type'?: string | string[];
  '@context'?: any;
  'https://example.org/core#type'?: string | string[];
  [key: string]: any;
}

export type SemanticData = JsonLdObject | JsonLdValue | any[] | string | number | boolean | null | undefined;

export interface SemanticContext {
  [key: string]: any;
}

/**
 * Props for type renderer components (render complete objects with specific types)
 */
export interface TypeRendererProps {
  data: JsonLdObject;
  context?: SemanticContext;
}

/**
 * Props for field renderer components (render label + value for specific fields)
 */
export interface FieldRendererProps {
  data: SemanticData;
  label: string;
  fieldKey: string;
  context?: SemanticContext;
}

/**
 * Props for the main type dispatcher component
 */
export interface TypeDispatcherProps {
  data: SemanticData;
  context?: SemanticContext;
  fieldContext?: FieldContext;
}

/**
 * Field context for type dispatcher when rendering fields
 */
export interface FieldContext {
  fieldKey: string;
  label: string;
  metadata: FieldMetadata;
}

/**
 * UI metadata structure for fields
 */
export interface FieldMetadata {
  label?: string;
  component?: string;
  order?: number;
  hidden?: boolean;
  [key: string]: any;
}