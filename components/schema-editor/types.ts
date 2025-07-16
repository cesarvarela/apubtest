export interface AvailableType {
  name: string;           // e.g., "Incident", "Organization" 
  fullType: string;       // e.g., "core:Incident", "aiid:Report"
  namespace: string;      // e.g., "core", "aiid"
  context: ContextSchema; // Full JSON-LD context
}

export interface FieldDefinition {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'relationship';
  required: boolean;
  description?: string;
  
  // String-specific validation
  format?: 'email' | 'uri' | 'date' | 'date-time' | 'time' | 'regex' | 'uuid';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  
  // Number-specific validation  
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  
  // Array-specific validation
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  items?: FieldDefinition;
  
  // Object-specific validation
  properties?: Record<string, FieldDefinition>;
  additionalProperties?: boolean;
  minProperties?: number;
  maxProperties?: number;
  
  // Relationship-specific configuration
  relationshipConfig?: {
    targetType: string;     // e.g., "core:Organization"
    cardinality: 'one' | 'many';
    container?: '@set' | '@list'; // JSON-LD container type for 'many' relationships
  };
  
  // UI metadata for form rendering
  uiMetadata?: FieldUIMetadata;
}

export interface FieldUIMetadata {
  label?: string;
  placeholder?: string;
  helpText?: string;
  order?: number;
  hidden?: boolean;
  component?: string;
  
  // Layout hints
  width?: 'full' | 'half' | 'third' | 'quarter';
  group?: string;
  
  // Conditional display
  showIf?: {
    field: string;
    value: any;
  };
}

export interface ValidationSchema {
  $schema: string;
  type: 'object';
  properties: Record<string, any>;
  required: string[];
  additionalProperties?: boolean;
  definitions?: Record<string, any>;
}

export interface ContextSchema {
  '@context': {
    '@protected': boolean;
    [key: string]: any;
  };
}

export interface SchemaEditorProps {
  namespace: string;
  targetType?: string;
  validationSchema?: ValidationSchema;
  contextSchema?: ContextSchema;
  availableTypes: AvailableType[]; // Full context information for relationships
  onSave?: (validationSchema: ValidationSchema, contextSchema: ContextSchema) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export interface FieldListManagerProps {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
  onAddField: () => void;
  onRemoveField: (fieldId: string) => void;
  onReorderFields: (startIndex: number, endIndex: number) => void;
}

export interface FieldEditorProps {
  field: FieldDefinition | null;
  namespace: string;
  availableTypes: AvailableType[];
  onChange: (updates: Partial<FieldDefinition>) => void;
  existingFieldNames: string[];
}

export interface LivePreviewProps {
  schema: ValidationSchema;
  namespace: string;
  targetType: string;
}

export interface OutputPanelProps {
  validationSchema: ValidationSchema;
  contextSchema: ContextSchema;
}