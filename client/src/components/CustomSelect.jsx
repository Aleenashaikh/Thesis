import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function CustomSelect({
  label,
  icon: Icon,
  value,
  onChange,
  options = [],
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className={`custom-select-container ${className}`} ref={containerRef}>
      {label && <span className="custom-select-label">{label}</span>}

      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="trigger-left">
          {Icon && <Icon size={14} className="trigger-icon" />}
          {selectedOption?.badgeColor && (
            <span
              className="option-dot"
              style={{ backgroundColor: selectedOption.badgeColor }}
            />
          )}
          <span className="trigger-text">{selectedOption ? selectedOption.label : "Select..."}</span>
        </div>
        <ChevronDown
          size={14}
          className={`chevron-icon ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="custom-select-dropdown" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                className={`custom-select-option ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                role="option"
                aria-selected={isSelected}
              >
                <div className="option-content">
                  {opt.icon && <span className="option-icon">{opt.icon}</span>}
                  {opt.badgeColor && (
                    <span
                      className="option-dot"
                      style={{ backgroundColor: opt.badgeColor }}
                    />
                  )}
                  <span className="option-label">{opt.label}</span>
                </div>
                {isSelected && <Check size={14} className="option-check" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
