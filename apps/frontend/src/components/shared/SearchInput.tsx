import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * SearchInput - A reusable search input component with debouncing
 *
 * This component provides a search input field with an icon, clear button,
 * and built-in debouncing to reduce the number of onChange events fired
 * during user typing. It's designed to improve performance when filtering
 * large lists or making API calls based on search queries.
 *
 * @example
 * ```tsx
 * // Basic usage with controlled state
 * const [search, setSearch] = useState("");
 *
 * <SearchInput
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Search workflows..."
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom debounce delay
 * <SearchInput
 *   value={searchTerm}
 *   onChange={handleSearch}
 *   placeholder="Search nodes..."
 *   debounceMs={500}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom styling
 * <SearchInput
 *   value={filter}
 *   onChange={setFilter}
 *   placeholder="Filter automations..."
 *   className="max-w-sm"
 * />
 * ```
 */

export interface SearchInputProps {
  /**
   * The current value of the search input
   */
  value: string;

  /**
   * Callback fired when the debounced value changes
   * @param value - The new search value
   */
  onChange: (value: string) => void;

  /**
   * Placeholder text for the input
   * @default "Search..."
   */
  placeholder?: string;

  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounceMs?: number;

  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;

  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className,
  disabled = false,
}: SearchInputProps) {
  // Local state for the input value (immediate updates)
  const [inputValue, setInputValue] = React.useState(value);

  // Ref to store the debounce timeout
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync local state when external value changes
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Update local state immediately for responsive UI
    setInputValue(newValue);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer to trigger onChange after delay
    debounceTimerRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  // Handle clear button click
  const handleClear = () => {
    setInputValue("");
    onChange("");

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Search icon */}
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      {/* Input field */}
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-9 pr-9"
        aria-label="Search input"
      />

      {/* Clear button - only shown when there's text */}
      {inputValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
