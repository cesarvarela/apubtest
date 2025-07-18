'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Plus, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { FieldEditorProps, FieldDefinition, AvailableType } from './types';
import { validateFieldName } from './utils';

export default function FieldEditor({
  field,
  namespace,
  availableTypes,
  onChange,
  existingFieldNames
}: FieldEditorProps) {
  const [nameError, setNameError] = useState<string | null>(null);

  if (!field) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Select a field</p>
          <p className="text-sm">Choose a field from the list to edit its properties</p>
        </div>
      </div>
    );
  }

  const handleNameChange = (name: string) => {
    const error = validateFieldName(name, existingFieldNames);
    setNameError(error);
    onChange({ name });
  };

  const updateUiMetadata = (updates: Partial<NonNullable<FieldDefinition['uiMetadata']>>) => {
    onChange({
      uiMetadata: { ...field.uiMetadata, ...updates }
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Edit Field</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Configure field properties and validation rules
        </p>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Basic Properties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Basic Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Field Name */}
            <div>
              <Label htmlFor="fieldName" className="text-xs font-medium">
                Field Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fieldName"
                value={field.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., title, description"
                className={nameError ? 'border-destructive' : ''}
              />
              {nameError && (
                <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3" />
                  {nameError}
                </div>
              )}
            </div>

            {/* Field Type */}
            <div>
              <Label htmlFor="fieldType" className="text-xs font-medium">
                Field Type
              </Label>
              <select
                id="fieldType"
                value={field.type}
                onChange={(e) => onChange({ type: e.target.value as FieldDefinition['type'] })}
                className="w-full p-2 text-sm border rounded-md bg-background"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="object">Object</option>
                <option value="array">Array</option>
                <option value="relationship">Relationship</option>
              </select>
            </div>

            {/* Required Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="required" className="text-xs font-medium">
                  Required Field
                </Label>
                <p className="text-xs text-muted-foreground">
                  This field must be provided
                </p>
              </div>
              <Switch
                id="required"
                checked={field.required}
                onCheckedChange={(required) => onChange({ required })}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-xs font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={field.description || ''}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Describe what this field represents..."
                rows={2}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Type-Specific Validation - Moved up for better UX */}
        {field.type === 'string' && <StringValidation field={field} onChange={onChange} />}
        {field.type === 'number' && <NumberValidation field={field} onChange={onChange} />}
        {field.type === 'array' && <ArrayValidation field={field} onChange={onChange} />}
        {field.type === 'object' && <ObjectValidation field={field} onChange={onChange} />}
        {field.type === 'relationship' && <RelationshipValidation field={field} availableTypes={availableTypes} onChange={onChange} />}

        {/* UI Metadata - Moved to bottom */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Display Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="label" className="text-xs font-medium">
                Display Label
              </Label>
              <Input
                id="label"
                value={field.uiMetadata?.label || ''}
                onChange={(e) => updateUiMetadata({ label: e.target.value })}
                placeholder="Label shown in forms"
              />
            </div>

            <div>
              <Label htmlFor="placeholder" className="text-xs font-medium">
                Placeholder
              </Label>
              <Input
                id="placeholder"
                value={field.uiMetadata?.placeholder || ''}
                onChange={(e) => updateUiMetadata({ placeholder: e.target.value })}
                placeholder="Hint text for empty fields"
              />
            </div>

            <div>
              <Label htmlFor="helpText" className="text-xs font-medium">
                Help Text
              </Label>
              <Input
                id="helpText"
                value={field.uiMetadata?.helpText || ''}
                onChange={(e) => updateUiMetadata({ helpText: e.target.value })}
                placeholder="Additional guidance for users"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// String-specific validation component
function StringValidation({ 
  field, 
  onChange 
}: { 
  field: FieldDefinition; 
  onChange: (updates: Partial<FieldDefinition>) => void;
}) {
  const [newEnumValue, setNewEnumValue] = useState('');

  const addEnumValue = () => {
    if (newEnumValue.trim() && !field.enum?.includes(newEnumValue.trim())) {
      onChange({
        enum: [...(field.enum || []), newEnumValue.trim()]
      });
      setNewEnumValue('');
    }
  };

  const removeEnumValue = (value: string) => {
    onChange({
      enum: field.enum?.filter(v => v !== value)
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">String Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Format */}
        <div>
          <Label htmlFor="format" className="text-xs font-medium">
            Format
          </Label>
          <select
            id="format"
            value={field.format || ''}
            onChange={(e) => {
              const value = e.target.value;
              const format = value === '' ? undefined : value as 'uri' | 'email' | 'date' | 'date-time' | 'time' | 'regex' | 'uuid';
              onChange({ format });
            }}
            className="w-full p-2 text-sm border rounded-md bg-background"
          >
            <option value="">No specific format</option>
            <option value="email">Email</option>
            <option value="uri">URI</option>
            <option value="date">Date</option>
            <option value="date-time">Date Time</option>
            <option value="time">Time</option>
            <option value="uuid">UUID</option>
          </select>
        </div>

        {/* Length Constraints */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="minLength" className="text-xs font-medium">
              Min Length
            </Label>
            <Input
              id="minLength"
              type="number"
              min="0"
              value={field.minLength || ''}
              onChange={(e) => onChange({ 
                minLength: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="maxLength" className="text-xs font-medium">
              Max Length
            </Label>
            <Input
              id="maxLength"
              type="number"
              min="0"
              value={field.maxLength || ''}
              onChange={(e) => onChange({ 
                maxLength: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="∞"
            />
          </div>
        </div>

        {/* Pattern */}
        <div>
          <Label htmlFor="pattern" className="text-xs font-medium">
            Pattern (Regular Expression)
          </Label>
          <Input
            id="pattern"
            value={field.pattern || ''}
            onChange={(e) => onChange({ pattern: e.target.value || undefined })}
            placeholder="^[A-Za-z]+$"
            className="font-mono text-xs"
          />
        </div>

        {/* Enum Values */}
        <div>
          <Label className="text-xs font-medium">
            Allowed Values (Enum)
          </Label>
          <div className="space-y-2">
            {field.enum && field.enum.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {field.enum.map((value, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {value}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeEnumValue(value)}
                    >
                      <X className="w-2 h-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newEnumValue}
                onChange={(e) => setNewEnumValue(e.target.value)}
                placeholder="Add allowed value..."
                className="text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEnumValue();
                  }
                }}
              />
              <Button size="sm" onClick={addEnumValue} disabled={!newEnumValue.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Number-specific validation component
function NumberValidation({ 
  field, 
  onChange 
}: { 
  field: FieldDefinition; 
  onChange: (updates: Partial<FieldDefinition>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Number Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="minimum" className="text-xs font-medium">
              Minimum
            </Label>
            <Input
              id="minimum"
              type="number"
              step="any"
              value={field.minimum ?? ''}
              onChange={(e) => onChange({ 
                minimum: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
              placeholder="-∞"
            />
          </div>
          <div>
            <Label htmlFor="maximum" className="text-xs font-medium">
              Maximum
            </Label>
            <Input
              id="maximum"
              type="number"
              step="any"
              value={field.maximum ?? ''}
              onChange={(e) => onChange({ 
                maximum: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
              placeholder="∞"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="multipleOf" className="text-xs font-medium">
            Multiple Of
          </Label>
          <Input
            id="multipleOf"
            type="number"
            step="any"
            min="0"
            value={field.multipleOf ?? ''}
            onChange={(e) => onChange({ 
              multipleOf: e.target.value ? parseFloat(e.target.value) : undefined 
            })}
            placeholder="Any number"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Array-specific validation component
function ArrayValidation({ 
  field, 
  onChange 
}: { 
  field: FieldDefinition; 
  onChange: (updates: Partial<FieldDefinition>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Array Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="minItems" className="text-xs font-medium">
              Min Items
            </Label>
            <Input
              id="minItems"
              type="number"
              min="0"
              value={field.minItems ?? ''}
              onChange={(e) => onChange({ 
                minItems: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="maxItems" className="text-xs font-medium">
              Max Items
            </Label>
            <Input
              id="maxItems"
              type="number"
              min="0"
              value={field.maxItems ?? ''}
              onChange={(e) => onChange({ 
                maxItems: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="∞"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="uniqueItems" className="text-xs font-medium">
              Unique Items
            </Label>
            <p className="text-xs text-muted-foreground">
              All array items must be unique
            </p>
          </div>
          <Switch
            id="uniqueItems"
            checked={field.uniqueItems || false}
            onCheckedChange={(uniqueItems) => onChange({ uniqueItems })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Object-specific validation component
function ObjectValidation({ 
  field, 
  onChange 
}: { 
  field: FieldDefinition; 
  onChange: (updates: Partial<FieldDefinition>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Object Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="minProperties" className="text-xs font-medium">
              Min Properties
            </Label>
            <Input
              id="minProperties"
              type="number"
              min="0"
              value={field.minProperties ?? ''}
              onChange={(e) => onChange({ 
                minProperties: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="maxProperties" className="text-xs font-medium">
              Max Properties
            </Label>
            <Input
              id="maxProperties"
              type="number"
              min="0"
              value={field.maxProperties ?? ''}
              onChange={(e) => onChange({ 
                maxProperties: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="∞"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="additionalProperties" className="text-xs font-medium">
              Additional Properties
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow properties not defined in schema
            </p>
          </div>
          <Switch
            id="additionalProperties"
            checked={field.additionalProperties ?? false}
            onCheckedChange={(additionalProperties) => onChange({ additionalProperties })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Relationship-specific validation component
function RelationshipValidation({ 
  field, 
  availableTypes,
  onChange 
}: { 
  field: FieldDefinition; 
  availableTypes: AvailableType[];
  onChange: (updates: Partial<FieldDefinition>) => void;
}) {
  const updateRelationshipConfig = (updates: Partial<NonNullable<FieldDefinition['relationshipConfig']>>) => {
    const currentConfig = field.relationshipConfig;
    const newConfig = { ...currentConfig, ...updates };
    
    // Ensure required properties are present
    if (newConfig.targetType) {
      onChange({
        relationshipConfig: {
          targetType: newConfig.targetType,
          cardinality: newConfig.cardinality || 'one',
          container: newConfig.container
        }
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Relationship Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target Type Selection */}
        <div>
          <Label htmlFor="targetType" className="text-xs font-medium">
            Target Type
          </Label>
          <select
            id="targetType"
            value={field.relationshipConfig?.targetType || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                updateRelationshipConfig({ targetType: value });
              }
            }}
            className="w-full p-2 text-sm border rounded-md bg-background"
          >
            <option value="">Select target type...</option>
            {availableTypes.map((type) => (
              <option key={type.fullType} value={type.fullType}>
                {type.name} ({type.fullType})
              </option>
            ))}
          </select>
          {field.relationshipConfig?.targetType && (
            <p className="text-xs text-muted-foreground mt-1">
              Links to {field.relationshipConfig.targetType} entities
            </p>
          )}
        </div>

        {/* Cardinality Selection */}
        <div>
          <Label className="text-xs font-medium">Cardinality</Label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="cardinality"
                value="one"
                checked={field.relationshipConfig?.cardinality === 'one'}
                onChange={(e) => updateRelationshipConfig({ cardinality: 'one' })}
                className="text-primary"
              />
              Single relationship
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="cardinality"
                value="many"
                checked={field.relationshipConfig?.cardinality === 'many'}
                onChange={(e) => updateRelationshipConfig({ cardinality: 'many' })}
                className="text-primary"
              />
              Multiple relationships
            </label>
          </div>
        </div>

        {/* Container Type for Multiple Relationships */}
        {field.relationshipConfig?.cardinality === 'many' && (
          <div>
            <Label htmlFor="container" className="text-xs font-medium">
              Collection Type
            </Label>
            <select
              id="container"
              value={field.relationshipConfig?.container || '@set'}
              onChange={(e) => updateRelationshipConfig({ 
                container: e.target.value as '@set' | '@list' 
              })}
              className="w-full p-2 text-sm border rounded-md bg-background"
            >
              <option value="@set">Set (unordered, unique)</option>
              <option value="@list">List (ordered, allows duplicates)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {field.relationshipConfig?.container === '@set' 
                ? 'Items will be unique and order doesn\'t matter'
                : 'Items will maintain order and duplicates are allowed'
              }
            </p>
          </div>
        )}

        {/* Relationship Preview */}
        {field.relationshipConfig?.targetType && (
          <div className="mt-4 p-3 bg-muted/30 rounded border">
            <Label className="text-xs font-medium">Preview</Label>
            <div className="mt-2 text-xs font-mono">
              {field.relationshipConfig.cardinality === 'one' ? (
                <div>
                  <div className="text-muted-foreground">// Single relationship</div>
                  <div>"{field.name}": {`{`}</div>
                  <div className="ml-2">"@id": "https://example.org/...",</div>
                  <div className="ml-2">"@type": "{field.relationshipConfig.targetType}"</div>
                  <div>{`}`}</div>
                </div>
              ) : (
                <div>
                  <div className="text-muted-foreground">// Multiple relationships</div>
                  <div>"{field.name}": [</div>
                  <div className="ml-2">{`{`}</div>
                  <div className="ml-4">"@id": "https://example.org/...",</div>
                  <div className="ml-4">"@type": "{field.relationshipConfig.targetType}"</div>
                  <div className="ml-2">{`}`}</div>
                  <div>]</div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}