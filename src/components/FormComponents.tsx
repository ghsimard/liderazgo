import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { ReactNode, forwardRef } from "react";

interface FormFieldWrapperProps {
  name: string;
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  hideError?: boolean;
  /** Désactive le label flottant (ex: groupes radio/checkbox, date picker) */
  staticLabel?: boolean;
}

export function FormFieldWrapper({ name, label, required, children, className, hideError, staticLabel }: FormFieldWrapperProps) {
  const { formState: { errors } } = useFormContext();
  const error = errors[name];
  const msg = error?.message as string | undefined;

  if (staticLabel) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <label className="field-label" htmlFor={name}>
          {label}{required && <span className="required-star">*</span>}
        </label>
        {children}
        {!hideError && msg && <p className="field-error">{msg}</p>}
      </div>
    );
  }

  return (
    <div className={cn("floating-field-wrapper", className)}>
      {children}
      <label className="floating-label" htmlFor={name}>
        {label}{required && <span className="required-star ml-0.5">*</span>}
      </label>
      {!hideError && msg && <p className="field-error mt-1">{msg}</p>}
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
    <select ref={ref} className={cn("form-input select-floating", hasError && "error", className)} {...props}>
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
