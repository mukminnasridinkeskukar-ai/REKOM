"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormField } from "@/lib/types";

export function DynamicForm({
  fields,
  values,
  onChange,
}: {
  fields: FormField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `field-${f.key}`;
        return (
          <div
            key={f.key}
            className={f.type === "textarea" ? "sm:col-span-2" : undefined}
          >
            <Label htmlFor={id} className="mb-1.5 block text-sm">
              {f.label} {f.required && <span className="text-red-500">*</span>}
            </Label>
            {f.type === "textarea" ? (
              <Textarea
                id={id}
                rows={3}
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            ) : f.type === "select" ? (
              <Select value={values[f.key] ?? ""} onValueChange={(v) => onChange(f.key, v)}>
                <SelectTrigger id={id} className="w-full">
                  <SelectValue placeholder={`Pilih ${f.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {(f.options ?? []).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={id}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
