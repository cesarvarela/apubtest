'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, X } from 'lucide-react';

import { FieldListManagerProps } from './types';

export default function FieldListManager({
  fields,
  selectedFieldId,
  onSelectField,
  onAddField,
  onRemoveField,
  onReorderFields
}: FieldListManagerProps) {
  
  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'number': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'boolean': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'object': return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      case 'array': return 'bg-pink-100 text-pink-800 hover:bg-pink-200';
      case 'relationship': return 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Fields ({fields.length})</h3>
          <Button size="sm" onClick={onAddField} variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            Add Field
          </Button>
        </div>
      </div>
      
      {/* Fields List */}
      <div className="flex-1 overflow-y-auto">
        {fields.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium mb-1">No fields defined</p>
            <p className="text-xs">Click "Add Field" to get started</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {fields.map((field, index) => (
              <Card
                key={field.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedFieldId === field.id 
                    ? 'ring-2 ring-primary shadow-md' 
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => onSelectField(field.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Field Name */}
                      <div className="font-medium text-sm truncate mb-1">
                        {field.name || 'Unnamed field'}
                      </div>
                      
                      {/* Field Meta */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs px-2 py-0 ${getFieldTypeColor(field.type)}`}
                        >
                          {field.type}
                        </Badge>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs px-2 py-0">
                            required
                          </Badge>
                        )}
                      </div>
                      
                      {/* Field Description */}
                      {field.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {field.description}
                        </p>
                      )}
                      
                      {/* Field Validation Summary */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {field.type === 'string' && (
                          <>
                            {field.format && (
                              <Badge variant="outline" className="text-xs">
                                {field.format}
                              </Badge>
                            )}
                            {field.minLength !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                min: {field.minLength}
                              </Badge>
                            )}
                            {field.maxLength !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                max: {field.maxLength}
                              </Badge>
                            )}
                            {field.pattern && (
                              <Badge variant="outline" className="text-xs">
                                pattern
                              </Badge>
                            )}
                            {field.enum?.length && (
                              <Badge variant="outline" className="text-xs">
                                enum ({field.enum.length})
                              </Badge>
                            )}
                          </>
                        )}
                        
                        {field.type === 'number' && (
                          <>
                            {field.minimum !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                min: {field.minimum}
                              </Badge>
                            )}
                            {field.maximum !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                max: {field.maximum}
                              </Badge>
                            )}
                          </>
                        )}
                        
                        {field.type === 'array' && (
                          <>
                            {field.minItems !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                min items: {field.minItems}
                              </Badge>
                            )}
                            {field.maxItems !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                max items: {field.maxItems}
                              </Badge>
                            )}
                            {field.uniqueItems && (
                              <Badge variant="outline" className="text-xs">
                                unique
                              </Badge>
                            )}
                          </>
                        )}
                        
                        {field.type === 'relationship' && (
                          <>
                            {field.relationshipConfig?.targetType && (
                              <Badge variant="outline" className="text-xs">
                                → {field.relationshipConfig.targetType}
                              </Badge>
                            )}
                            {field.relationshipConfig?.cardinality && (
                              <Badge variant="outline" className="text-xs">
                                {field.relationshipConfig.cardinality}
                              </Badge>
                            )}
                            {field.relationshipConfig?.container && (
                              <Badge variant="outline" className="text-xs">
                                {field.relationshipConfig.container}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveField(field.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      {fields.length > 0 && (
        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Click a field to edit • {fields.filter(f => f.required).length} required fields
          </p>
        </div>
      )}
    </div>
  );
}