import { useFormContext, useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import { ReactNode, forwardRef, useRef, useCallback } from "react";
import { List, ListOrdered, Bold, Italic } from "lucide-react";

interface FormFieldWrapperProps {
  name: string;
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  hideError?: boolean;
  staticLabel?: boolean;
}

export function FormFieldWrapper({ name, label, required, children, className, hideError, staticLabel }: FormFieldWrapperProps) {
  const { formState: { errors } } = useFormContext();
  const value = useWatch({ name });
  const error = errors[name];
  const msg = error?.message as string | undefined;
  const hasValue = value !== undefined && value !== "" && value !== null;

  if (staticLabel) {
    return (
      <div className={cn("flex flex-col gap-1 static-field", className)}>
        <label className="field-label" htmlFor={name}>
          {label}{required && <span className="required-star">*</span>}
        </label>
        {children}
        {!hideError && msg && <p className="field-error">{msg}</p>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className={cn("floating-field-wrapper", hasValue && "field-has-value")}>
        {children}
        <label className="floating-label" htmlFor={name}>
          {label}{required && <span className="required-star ml-0.5">*</span>}
        </label>
      </div>
      {!hideError && msg && <p className="field-error">{msg}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const FormInput = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, className, placeholder, ...props }, ref) => (
    <input
      ref={ref}
      placeholder={placeholder || " "}
      className={cn("form-input floating-input", hasError && "error", className)}
      {...props}
    />
  )
);
FormInput.displayName = "FormInput";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError, options, placeholder, className, ...props }, ref) => (
    <select ref={ref} className={cn("form-input floating-input", hasError && "error", className)} {...props}>
      <option value="">{placeholder ?? ""}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
);
FormSelect.displayName = "FormSelect";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const FormTextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ hasError, className, placeholder, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={3}
      placeholder={placeholder || " "}
      className={cn("form-input floating-input resize-none", hasError && "error", className)}
      {...props}
    />
  )
);
FormTextArea.displayName = "FormTextArea";

/* ── Rich Text Area with basic formatting toolbar ── */
interface RichTextAreaProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
  id?: string;
}

export function FormRichTextArea({ value = "", onChange, placeholder, hasError, className, id }: RichTextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const insertPrefix = useCallback((prefix: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = value;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = text.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = text.length;
    const selectedLines = text.slice(lineStart, lineEnd).split("\n");
    const transformed = selectedLines.map((line, i) => {
      const clean = line.replace(/^(\d+\.\s|[•\-]\s)/, "");
      if (prefix === "ol") return `${i + 1}. ${clean}`;
      if (prefix === "ul") return `• ${clean}`;
      return clean;
    }).join("\n");
    const newText = text.slice(0, lineStart) + transformed + text.slice(lineEnd);
    onChange?.(newText);
    setTimeout(() => { ta.focus(); ta.selectionStart = lineStart; ta.selectionEnd = lineStart + transformed.length; }, 0);
  }, [value, onChange]);

  const wrapSelection = useCallback((wrapper: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    if (!selected) return;
    const newText = value.slice(0, start) + wrapper + selected + wrapper + value.slice(end);
    onChange?.(newText);
    setTimeout(() => { ta.focus(); ta.selectionStart = start + wrapper.length; ta.selectionEnd = end + wrapper.length; }, 0);
  }, [value, onChange]);

  const btnClass = "p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors";

  return (
    <div className={cn("border rounded-md border-input focus-within:ring-2 focus-within:ring-ring", hasError && "border-destructive", className)}>
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-input bg-muted/30">
        <button type="button" className={btnClass} onClick={() => wrapSelection("**")} title="Negrita">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" className={btnClass} onClick={() => wrapSelection("_")} title="Cursiva">
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button type="button" className={btnClass} onClick={() => insertPrefix("ol")} title="Lista numerada">
          <ListOrdered className="w-4 h-4" />
        </button>
        <button type="button" className={btnClass} onClick={() => insertPrefix("ul")} title="Lista con viñetas">
          <List className="w-4 h-4" />
        </button>
      </div>
      <textarea
        ref={ref}
        id={id}
        rows={5}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder || " "}
        className="w-full px-3 py-2 text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

interface RadioGroupProps {
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  hasError?: boolean;
}

export function FormRadioGroup({ name, options, value, onChange, hasError }: RadioGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-4 mt-1", hasError && "ring-1 ring-destructive rounded p-1")}>
      {options.map((o) => (
        <label key={o.value} className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange?.(o.value)}
            className="accent-primary w-4 h-4"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

interface CheckboxGroupProps {
  name: string;
  options: { value: string; label: string }[];
  value?: string[];
  onChange?: (value: string[]) => void;
}

export function FormCheckboxGroup({ name, options, value = [], onChange }: CheckboxGroupProps) {
  const toggle = (v: string) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    onChange?.(next);
  };

  return (
    <div className="flex flex-wrap gap-4 mt-1">
      {options.map((o) => (
        <label key={o.value} className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            name={`${name}_${o.value}`}
            checked={value.includes(o.value)}
            onChange={() => toggle(o.value)}
            className="accent-primary w-4 h-4"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

interface SectionProps {
  number: number;
  title: string;
  children: ReactNode;
}

export function FormSection({ number, title, children }: SectionProps) {
  return (
    <div className="form-section">
      <h2 className="section-title">
        <span className="section-icon">{number}</span>
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}
