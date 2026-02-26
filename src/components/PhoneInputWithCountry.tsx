import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface CountryOption {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRIES: CountryOption[] = [
  { code: "AF", name: "Afganistán", flag: "🇦🇫", dialCode: "+93" },
  { code: "AL", name: "Albania", flag: "🇦🇱", dialCode: "+355" },
  { code: "DE", name: "Alemania", flag: "🇩🇪", dialCode: "+49" },
  { code: "AD", name: "Andorra", flag: "🇦🇩", dialCode: "+376" },
  { code: "AO", name: "Angola", flag: "🇦🇴", dialCode: "+244" },
  { code: "AG", name: "Antigua y Barbuda", flag: "🇦🇬", dialCode: "+1-268" },
  { code: "SA", name: "Arabia Saudita", flag: "🇸🇦", dialCode: "+966" },
  { code: "DZ", name: "Argelia", flag: "🇩🇿", dialCode: "+213" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dialCode: "+54" },
  { code: "AM", name: "Armenia", flag: "🇦🇲", dialCode: "+374" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61" },
  { code: "AT", name: "Austria", flag: "🇦🇹", dialCode: "+43" },
  { code: "AZ", name: "Azerbaiyán", flag: "🇦🇿", dialCode: "+994" },
  { code: "BS", name: "Bahamas", flag: "🇧🇸", dialCode: "+1-242" },
  { code: "BD", name: "Bangladés", flag: "🇧🇩", dialCode: "+880" },
  { code: "BB", name: "Barbados", flag: "🇧🇧", dialCode: "+1-246" },
  { code: "BH", name: "Baréin", flag: "🇧🇭", dialCode: "+973" },
  { code: "BE", name: "Bélgica", flag: "🇧🇪", dialCode: "+32" },
  { code: "BZ", name: "Belice", flag: "🇧🇿", dialCode: "+501" },
  { code: "BJ", name: "Benín", flag: "🇧🇯", dialCode: "+229" },
  { code: "BY", name: "Bielorrusia", flag: "🇧🇾", dialCode: "+375" },
  { code: "MM", name: "Birmania (Myanmar)", flag: "🇲🇲", dialCode: "+95" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴", dialCode: "+591" },
  { code: "BA", name: "Bosnia y Herzegovina", flag: "🇧🇦", dialCode: "+387" },
  { code: "BW", name: "Botsuana", flag: "🇧🇼", dialCode: "+267" },
  { code: "BR", name: "Brasil", flag: "🇧🇷", dialCode: "+55" },
  { code: "BN", name: "Brunéi", flag: "🇧🇳", dialCode: "+673" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬", dialCode: "+359" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", dialCode: "+226" },
  { code: "BI", name: "Burundi", flag: "🇧🇮", dialCode: "+257" },
  { code: "BT", name: "Bután", flag: "🇧🇹", dialCode: "+975" },
  { code: "CV", name: "Cabo Verde", flag: "🇨🇻", dialCode: "+238" },
  { code: "KH", name: "Camboya", flag: "🇰🇭", dialCode: "+855" },
  { code: "CM", name: "Camerún", flag: "🇨🇲", dialCode: "+237" },
  { code: "CA", name: "Canadá", flag: "🇨🇦", dialCode: "+1" },
  { code: "QA", name: "Catar", flag: "🇶🇦", dialCode: "+974" },
  { code: "TD", name: "Chad", flag: "🇹🇩", dialCode: "+235" },
  { code: "CL", name: "Chile", flag: "🇨🇱", dialCode: "+56" },
  { code: "CN", name: "China", flag: "🇨🇳", dialCode: "+86" },
  { code: "CY", name: "Chipre", flag: "🇨🇾", dialCode: "+357" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", dialCode: "+57" },
  { code: "KM", name: "Comoras", flag: "🇰🇲", dialCode: "+269" },
  { code: "KP", name: "Corea del Norte", flag: "🇰🇵", dialCode: "+850" },
  { code: "KR", name: "Corea del Sur", flag: "🇰🇷", dialCode: "+82" },
  { code: "CI", name: "Costa de Marfil", flag: "🇨🇮", dialCode: "+225" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", dialCode: "+506" },
  { code: "HR", name: "Croacia", flag: "🇭🇷", dialCode: "+385" },
  { code: "CU", name: "Cuba", flag: "🇨🇺", dialCode: "+53" },
  { code: "DK", name: "Dinamarca", flag: "🇩🇰", dialCode: "+45" },
  { code: "DM", name: "Dominica", flag: "🇩🇲", dialCode: "+1-767" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", dialCode: "+593" },
  { code: "EG", name: "Egipto", flag: "🇪🇬", dialCode: "+20" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", dialCode: "+503" },
  { code: "AE", name: "Emiratos Árabes Unidos", flag: "🇦🇪", dialCode: "+971" },
  { code: "ER", name: "Eritrea", flag: "🇪🇷", dialCode: "+291" },
  { code: "SK", name: "Eslovaquia", flag: "🇸🇰", dialCode: "+421" },
  { code: "SI", name: "Eslovenia", flag: "🇸🇮", dialCode: "+386" },
  { code: "ES", name: "España", flag: "🇪🇸", dialCode: "+34" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", dialCode: "+1" },
  { code: "EE", name: "Estonia", flag: "🇪🇪", dialCode: "+372" },
  { code: "SZ", name: "Esuatini", flag: "🇸🇿", dialCode: "+268" },
  { code: "ET", name: "Etiopía", flag: "🇪🇹", dialCode: "+251" },
  { code: "PH", name: "Filipinas", flag: "🇵🇭", dialCode: "+63" },
  { code: "FI", name: "Finlandia", flag: "🇫🇮", dialCode: "+358" },
  { code: "FJ", name: "Fiyi", flag: "🇫🇯", dialCode: "+679" },
  { code: "FR", name: "Francia", flag: "🇫🇷", dialCode: "+33" },
  { code: "GA", name: "Gabón", flag: "🇬🇦", dialCode: "+241" },
  { code: "GM", name: "Gambia", flag: "🇬🇲", dialCode: "+220" },
  { code: "GE", name: "Georgia", flag: "🇬🇪", dialCode: "+995" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", dialCode: "+233" },
  { code: "GD", name: "Granada", flag: "🇬🇩", dialCode: "+1-473" },
  { code: "GR", name: "Grecia", flag: "🇬🇷", dialCode: "+30" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", dialCode: "+502" },
  { code: "GN", name: "Guinea", flag: "🇬🇳", dialCode: "+224" },
  { code: "GQ", name: "Guinea Ecuatorial", flag: "🇬🇶", dialCode: "+240" },
  { code: "GW", name: "Guinea-Bisáu", flag: "🇬🇼", dialCode: "+245" },
  { code: "GY", name: "Guyana", flag: "🇬🇾", dialCode: "+592" },
  { code: "HT", name: "Haití", flag: "🇭🇹", dialCode: "+509" },
  { code: "HN", name: "Honduras", flag: "🇭🇳", dialCode: "+504" },
  { code: "HU", name: "Hungría", flag: "🇭🇺", dialCode: "+36" },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dialCode: "+62" },
  { code: "IQ", name: "Irak", flag: "🇮🇶", dialCode: "+964" },
  { code: "IR", name: "Irán", flag: "🇮🇷", dialCode: "+98" },
  { code: "IE", name: "Irlanda", flag: "🇮🇪", dialCode: "+353" },
  { code: "IS", name: "Islandia", flag: "🇮🇸", dialCode: "+354" },
  { code: "MH", name: "Islas Marshall", flag: "🇲🇭", dialCode: "+692" },
  { code: "SB", name: "Islas Salomón", flag: "🇸🇧", dialCode: "+677" },
  { code: "IL", name: "Israel", flag: "🇮🇱", dialCode: "+972" },
  { code: "IT", name: "Italia", flag: "🇮🇹", dialCode: "+39" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲", dialCode: "+1-876" },
  { code: "JP", name: "Japón", flag: "🇯🇵", dialCode: "+81" },
  { code: "JO", name: "Jordania", flag: "🇯🇴", dialCode: "+962" },
  { code: "KZ", name: "Kazajistán", flag: "🇰🇿", dialCode: "+7" },
  { code: "KE", name: "Kenia", flag: "🇰🇪", dialCode: "+254" },
  { code: "KG", name: "Kirguistán", flag: "🇰🇬", dialCode: "+996" },
  { code: "KI", name: "Kiribati", flag: "🇰🇮", dialCode: "+686" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", dialCode: "+965" },
  { code: "LA", name: "Laos", flag: "🇱🇦", dialCode: "+856" },
  { code: "LS", name: "Lesoto", flag: "🇱🇸", dialCode: "+266" },
  { code: "LV", name: "Letonia", flag: "🇱🇻", dialCode: "+371" },
  { code: "LB", name: "Líbano", flag: "🇱🇧", dialCode: "+961" },
  { code: "LR", name: "Liberia", flag: "🇱🇷", dialCode: "+231" },
  { code: "LY", name: "Libia", flag: "🇱🇾", dialCode: "+218" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮", dialCode: "+423" },
  { code: "LT", name: "Lituania", flag: "🇱🇹", dialCode: "+370" },
  { code: "LU", name: "Luxemburgo", flag: "🇱🇺", dialCode: "+352" },
  { code: "MK", name: "Macedonia del Norte", flag: "🇲🇰", dialCode: "+389" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬", dialCode: "+261" },
  { code: "MY", name: "Malasia", flag: "🇲🇾", dialCode: "+60" },
  { code: "MW", name: "Malaui", flag: "🇲🇼", dialCode: "+265" },
  { code: "MV", name: "Maldivas", flag: "🇲🇻", dialCode: "+960" },
  { code: "ML", name: "Malí", flag: "🇲🇱", dialCode: "+223" },
  { code: "MT", name: "Malta", flag: "🇲🇹", dialCode: "+356" },
  { code: "MA", name: "Marruecos", flag: "🇲🇦", dialCode: "+212" },
  { code: "MU", name: "Mauricio", flag: "🇲🇺", dialCode: "+230" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷", dialCode: "+222" },
  { code: "MX", name: "México", flag: "🇲🇽", dialCode: "+52" },
  { code: "FM", name: "Micronesia", flag: "🇫🇲", dialCode: "+691" },
  { code: "MD", name: "Moldavia", flag: "🇲🇩", dialCode: "+373" },
  { code: "MC", name: "Mónaco", flag: "🇲🇨", dialCode: "+377" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳", dialCode: "+976" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪", dialCode: "+382" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿", dialCode: "+258" },
  { code: "NA", name: "Namibia", flag: "🇳🇦", dialCode: "+264" },
  { code: "NR", name: "Nauru", flag: "🇳🇷", dialCode: "+674" },
  { code: "NP", name: "Nepal", flag: "🇳🇵", dialCode: "+977" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮", dialCode: "+505" },
  { code: "NE", name: "Níger", flag: "🇳🇪", dialCode: "+227" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234" },
  { code: "NO", name: "Noruega", flag: "🇳🇴", dialCode: "+47" },
  { code: "NZ", name: "Nueva Zelanda", flag: "🇳🇿", dialCode: "+64" },
  { code: "OM", name: "Omán", flag: "🇴🇲", dialCode: "+968" },
  { code: "NL", name: "Países Bajos", flag: "🇳🇱", dialCode: "+31" },
  { code: "PK", name: "Pakistán", flag: "🇵🇰", dialCode: "+92" },
  { code: "PW", name: "Palaos", flag: "🇵🇼", dialCode: "+680" },
  { code: "PS", name: "Palestina", flag: "🇵🇸", dialCode: "+970" },
  { code: "PA", name: "Panamá", flag: "🇵🇦", dialCode: "+507" },
  { code: "PG", name: "Papúa Nueva Guinea", flag: "🇵🇬", dialCode: "+675" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾", dialCode: "+595" },
  { code: "PE", name: "Perú", flag: "🇵🇪", dialCode: "+51" },
  { code: "PL", name: "Polonia", flag: "🇵🇱", dialCode: "+48" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dialCode: "+351" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", dialCode: "+44" },
  { code: "CF", name: "República Centroafricana", flag: "🇨🇫", dialCode: "+236" },
  { code: "CZ", name: "República Checa", flag: "🇨🇿", dialCode: "+420" },
  { code: "CG", name: "República del Congo", flag: "🇨🇬", dialCode: "+242" },
  { code: "CD", name: "República Democrática del Congo", flag: "🇨🇩", dialCode: "+243" },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴", dialCode: "+1-809" },
  { code: "RW", name: "Ruanda", flag: "🇷🇼", dialCode: "+250" },
  { code: "RO", name: "Rumania", flag: "🇷🇴", dialCode: "+40" },
  { code: "RU", name: "Rusia", flag: "🇷🇺", dialCode: "+7" },
  { code: "WS", name: "Samoa", flag: "🇼🇸", dialCode: "+685" },
  { code: "KN", name: "San Cristóbal y Nieves", flag: "🇰🇳", dialCode: "+1-869" },
  { code: "SM", name: "San Marino", flag: "🇸🇲", dialCode: "+378" },
  { code: "VC", name: "San Vicente y las Granadinas", flag: "🇻🇨", dialCode: "+1-784" },
  { code: "LC", name: "Santa Lucía", flag: "🇱🇨", dialCode: "+1-758" },
  { code: "ST", name: "Santo Tomé y Príncipe", flag: "🇸🇹", dialCode: "+239" },
  { code: "SN", name: "Senegal", flag: "🇸🇳", dialCode: "+221" },
  { code: "RS", name: "Serbia", flag: "🇷🇸", dialCode: "+381" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨", dialCode: "+248" },
  { code: "SL", name: "Sierra Leona", flag: "🇸🇱", dialCode: "+232" },
  { code: "SG", name: "Singapur", flag: "🇸🇬", dialCode: "+65" },
  { code: "SY", name: "Siria", flag: "🇸🇾", dialCode: "+963" },
  { code: "SO", name: "Somalia", flag: "🇸🇴", dialCode: "+252" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", dialCode: "+94" },
  { code: "ZA", name: "Sudáfrica", flag: "🇿🇦", dialCode: "+27" },
  { code: "SD", name: "Sudán", flag: "🇸🇩", dialCode: "+249" },
  { code: "SS", name: "Sudán del Sur", flag: "🇸🇸", dialCode: "+211" },
  { code: "SE", name: "Suecia", flag: "🇸🇪", dialCode: "+46" },
  { code: "CH", name: "Suiza", flag: "🇨🇭", dialCode: "+41" },
  { code: "SR", name: "Surinam", flag: "🇸🇷", dialCode: "+597" },
  { code: "TH", name: "Tailandia", flag: "🇹🇭", dialCode: "+66" },
  { code: "TW", name: "Taiwán", flag: "🇹🇼", dialCode: "+886" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", dialCode: "+255" },
  { code: "TJ", name: "Tayikistán", flag: "🇹🇯", dialCode: "+992" },
  { code: "TL", name: "Timor Oriental", flag: "🇹🇱", dialCode: "+670" },
  { code: "TG", name: "Togo", flag: "🇹🇬", dialCode: "+228" },
  { code: "TO", name: "Tonga", flag: "🇹🇴", dialCode: "+676" },
  { code: "TT", name: "Trinidad y Tobago", flag: "🇹🇹", dialCode: "+1-868" },
  { code: "TN", name: "Túnez", flag: "🇹🇳", dialCode: "+216" },
  { code: "TM", name: "Turkmenistán", flag: "🇹🇲", dialCode: "+993" },
  { code: "TR", name: "Turquía", flag: "🇹🇷", dialCode: "+90" },
  { code: "TV", name: "Tuvalu", flag: "🇹🇻", dialCode: "+688" },
  { code: "UA", name: "Ucrania", flag: "🇺🇦", dialCode: "+380" },
  { code: "UG", name: "Uganda", flag: "🇺🇬", dialCode: "+256" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", dialCode: "+598" },
  { code: "UZ", name: "Uzbekistán", flag: "🇺🇿", dialCode: "+998" },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺", dialCode: "+678" },
  { code: "VA", name: "Vaticano", flag: "🇻🇦", dialCode: "+379" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", dialCode: "+58" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", dialCode: "+84" },
  { code: "YE", name: "Yemen", flag: "🇾🇪", dialCode: "+967" },
  { code: "DJ", name: "Yibuti", flag: "🇩🇯", dialCode: "+253" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲", dialCode: "+260" },
  { code: "ZW", name: "Zimbabue", flag: "🇿🇼", dialCode: "+263" },
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
  const [search, setSearch] = useState("");

  const selectedCountry = COUNTRIES.find((c) => c.dialCode === countryCode) ?? COUNTRIES.find((c) => c.code === "CO")!;

  const filteredCountries = useMemo(() => {
    if (!search) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="flex gap-0">
      {/* Country selector */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setDropdownOpen(!dropdownOpen); setSearch(""); }}
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
          <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-md border bg-popover shadow-lg">
            <div className="p-2 border-b">
              <input
                type="text"
                placeholder="Buscar país..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded bg-background text-foreground border-input focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left",
                    country.dialCode === countryCode && country.code === selectedCountry.code && "bg-accent font-medium"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onCountryCodeChange(country.dialCode);
                    setDropdownOpen(false);
                  }}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-muted-foreground text-xs">{country.dialCode}</span>
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
              )}
            </div>
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
