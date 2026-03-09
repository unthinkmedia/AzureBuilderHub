import React, { useState, useRef, useCallback, useMemo } from "react";

export interface TagInputProps {
  /** Current list of tags */
  value: string[];
  /** Called when tags change */
  onChange: (tags: string[]) => void;
  /** Autocomplete suggestions */
  suggestions?: string[];
  /** Placeholder text when no tags and input is empty */
  placeholder?: string;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Accessible label for the input */
  ariaLabel?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Optional additional CSS class */
  className?: string;
}

/**
 * TagInput — A multi-tag editor with autocomplete.
 *
 * Type to add tags (Enter or comma), click × to remove.
 * Shows filtered autocomplete suggestions from a provided list.
 *
 * @storybook-candidate — Generic form component, high priority for upstream.
 */
export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag…",
  maxTags,
  ariaLabel = "Tag input",
  disabled = false,
  className,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useRef(`abh-tag-suggestions-${Math.random().toString(36).slice(2, 8)}`).current;

  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const lower = inputValue.toLowerCase();
    return suggestions.filter(
      (s) => s.toLowerCase().includes(lower) && !value.includes(s)
    );
  }, [inputValue, suggestions, value]);

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      if (value.includes(trimmed)) return;
      if (maxTags && value.length >= maxTags) return;
      onChange([...value, trimmed]);
      setInputValue("");
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    },
    [value, onChange, maxTags]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag));
      inputRef.current?.focus();
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          addTag(filteredSuggestions[highlightedIndex]);
        } else {
          addTag(inputValue);
        }
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        removeTag(value[value.length - 1]);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    },
    [inputValue, value, highlightedIndex, filteredSuggestions, addTag, removeTag]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    },
    []
  );

  const atLimit = maxTags != null && value.length >= maxTags;

  return (
    <div className={`abh-tag-input ${disabled ? "abh-tag-input--disabled" : ""} ${className ?? ""}`}>
      <div
        className="abh-tag-input__field"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Rendered tags */}
        {value.map((tag) => (
          <span key={tag} className="abh-tag-input__tag">
            <span className="abh-tag-input__tag-label">{tag}</span>
            {!disabled && (
              <button
                className="abh-tag-input__tag-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                aria-label={`Remove ${tag}`}
                tabIndex={-1}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        {!atLimit && (
          <input
            ref={inputRef}
            className="abh-tag-input__input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={showSuggestions && filteredSuggestions.length > 0}
            role="combobox"
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul
          id={listboxId}
          className="abh-tag-input__suggestions"
          role="listbox"
          aria-label="Tag suggestions"
        >
          {filteredSuggestions.slice(0, 8).map((suggestion, i) => (
            <li
              key={suggestion}
              className={`abh-tag-input__suggestion ${i === highlightedIndex ? "abh-tag-input__suggestion--highlighted" : ""}`}
              role="option"
              aria-selected={i === highlightedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(suggestion);
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}

      {/* Limit indicator */}
      {maxTags != null && (
        <span className="abh-tag-input__limit" aria-live="polite">
          {value.length}/{maxTags}
        </span>
      )}
    </div>
  );
};
