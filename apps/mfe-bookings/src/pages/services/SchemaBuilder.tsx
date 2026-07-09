import React from 'react';
import { Button, Input, Select, Checkbox } from '@jaldee/design-system';

export interface SchemaField {
    id: string;
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    required: boolean;
    options?: string[];
}

interface SchemaBuilderProps {
    title: string;
    description: string;
    fields: SchemaField[];
    onChange: (fields: SchemaField[]) => void;
}

export default function SchemaBuilder({ title, description, fields, onChange }: SchemaBuilderProps) {
    const handleAddField = () => {
        const newField: SchemaField = {
            id: `field-${Date.now()}`,
            name: '',
            label: '',
            type: 'string',
            required: false,
        };
        onChange([...fields, newField]);
    };

    const handleUpdateField = (id: string, updates: Partial<SchemaField>) => {
        onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handleDeleteField = (id: string) => {
        onChange(fields.filter(f => f.id !== id));
    };

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
            <p className="text-xs text-slate-500 mb-4">{description}</p>
            
            <div className="space-y-4">
                {fields.map((field) => (
                    <div key={field.id} className="bg-white border border-slate-200 p-4 rounded-lg flex gap-4 items-start relative">
                        <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-2 top-2 text-red-500 hover:text-red-700" 
                            onClick={() => handleDeleteField(field.id)}
                            iconOnly
                            icon={<span aria-hidden="true">&times;</span>}
                            aria-label="Remove Field"
                        />
                        <div className="grid grid-cols-2 gap-4 flex-1 mt-2">
                            <Input 
                                id={`schema-field-${field.id}-name`}
                                label="Field Name (Key)" 
                                value={field.name} 
                                onChange={(e) => handleUpdateField(field.id, { name: e.target.value })} 
                                placeholder="e.g. allergies"
                            />
                            <Input 
                                id={`schema-field-${field.id}-label`}
                                label="Display Label" 
                                value={field.label} 
                                onChange={(e) => handleUpdateField(field.id, { label: e.target.value })} 
                                placeholder="e.g. Do you have any allergies?"
                            />
                            <Select 
                                id={`schema-field-${field.id}-type`}
                                label="Data Type" 
                                value={field.type} 
                                onChange={(e) => handleUpdateField(field.id, { type: e.target.value as any })}
                                options={[
                                    { value: "string", label: "Text (String)" },
                                    { value: "number", label: "Number" },
                                    { value: "boolean", label: "Yes/No (Boolean)" },
                                    { value: "array", label: "Multiple Choice (Array)" },
                                ]}
                            />
                            <div className="flex items-center mt-6">
                                <Checkbox 
                                    id={`schema-field-${field.id}-required`}
                                    label="Required Field"
                                    checked={field.required}
                                    onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                />
                            </div>
                            
                            {field.type === 'array' && (
                                <div className="col-span-2">
                                    <Input 
                                        id={`schema-field-${field.id}-options`}
                                        label="Options (Comma separated)" 
                                        value={field.options?.join(', ') || ''} 
                                        onChange={(e) => handleUpdateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                                        placeholder="Option 1, Option 2"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-4">
                <Button type="button" variant="secondary" size="sm" onClick={handleAddField}>+ Add Field</Button>
            </div>
        </div>
    );
}
