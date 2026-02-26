import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface CountryOption {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRIES: CountryOption[] = [
  { code: "CO", name: "Colombia", flag: "🇨🇴", dialCode: "+57" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", dialCode: "+58" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", dialCode: "+593" },
  { code: "PE", name: "Perú", flag: "🇵🇪", dialCode: "+51" },
  { code: "BR", name: "Brasil", flag: "🇧🇷", dialCode: "+55" },
  { code: "PA", name: "Panamá", flag: "🇵🇦", dialCode: "+507" },
  { code: "MX", name: "México", flag: "🇲🇽", dialCode: "+52" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", dialCode: "+1" },
  { code: "ES", name: "España", flag: "🇪🇸", dialCode: "+34" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dialCode: "+54" },
  { code: "CL", name: "Chile", flag: "🇨🇱", dialCode: "+56" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴", dialCode: "+591" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾", dialCode: "+595" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", dialCode: "+598" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", dialCode: "+506" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", dialCode: "+502" },
  { code: "HN", name: "Honduras", flag: "🇭🇳", dialCode: "+504" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮", dialCode: "+505" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", dialCode: "+503" },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴", dialCode: "+1" },
  { code: "CU", name: "Cuba", flag: "🇨🇺", dialCode: "+53" },
];

interface PhoneInputWithCountryProps {
  id: string;
  phoneValue: string;
  onPhoneChange: (value: string) => void;
  countryCode: string;
  onCountryCodeChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
}

export function PhoneInputWithCountry({
  id,
  phoneValue,
  onPhoneChange,
  countryCode,
  onCountryCodeChange,
  placeholder = "300 000 0000",
  hasError = false,
  disabled = false,
}: PhoneInputWithCountryProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedCountry = COUNTRIES.find((c) => c.dialCode === countryCode) ?? COUNTRIES[0];

  return (
    <div className="flex gap-0">
      {/* Country selector */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
          className={cn(
            "flex items-center gap-1 h-full px-2 border border-r-0 rounded-l-md bg-muted/50 text-sm whitespace-nowrap min-w-[90px] justify-center",
            "border-input focus:outline-none focus:ring-2 focus:ring-ring",
            disabled && "opacity-75 cursor-not-allowed",
            hasError && "border-destructive"
          )}
        >
          <span className="text-lg leading-none">{selectedCountry.flag}</span>
          <span className="text-xs font-medium">{selectedCountry.dialCode}</span>
          <span className="text-[10px] opacity-60">▼</span>
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 w-64 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
            {COUNTRIES.map((country) => (
              <button
                key={country.code}
                type="button"
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left",
                  country.dialCode === countryCode && "bg-accent font-medium"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onCountryCodeChange(country.dialCode);
                  setDropdownOpen(false);
                }}
              >
                <span className="text-lg">{country.flag}</span>
                <span className="flex-1">{country.name}</span>
                <span className="text-muted-foreground text-xs">{country.dialCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone number input */}
      <input
        id={id}
        type="tel"
        value={phoneValue}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "form-input floating-input rounded-l-none border-l-0",
          hasError && "border-destructive"
        )}
      />
    </div>
  );
}

export { COUNTRIES };
export type { CountryOption };
