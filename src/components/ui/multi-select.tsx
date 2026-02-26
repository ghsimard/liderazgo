import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar…",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabels = useMemo(() => {
    return options.filter((o) => selected.includes(o.value)).map((o) => o.label);
  }, [options, selected]);

  const toggleOption = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const toggleAll = () => {
    onChange(selected.length === options.length ? [] : options.map((o) => o.value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled || options.length === 0}
          className={cn("justify-between min-w-[180px] h-auto min-h-9", className)}
        >
          <span className="truncate text-left flex-1 text-xs">
            {selected.length === 0
              ? placeholder
              : selected.length === 1
              ? selectedLabels[0]
              : `${selected.length} seleccionado(s)`}
          </span>
          {selected.length > 0 ? (
            <X
              className="w-3.5 h-3.5 shrink-0 ml-1 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-1 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <div className="p-2 border-b">
          <button
            onClick={toggleAll}
            className="text-xs text-primary hover:underline"
          >
            {selected.length === options.length ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>
        </div>
        <ScrollArea className="max-h-[220px]">
          <div className="p-2 space-y-1">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs"
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => toggleOption(option.value)}
                />
                <span className="truncate">{option.label}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
