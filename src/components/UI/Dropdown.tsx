"use client";

import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import styles from './Dropdown.module.css';
import Button from './Button';
import NineSliceContainer from './NineSliceContainer';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: DropdownOption[] | string[];
  error?: string;
  layout?: 'vertical' | 'horizontal';
  nineSlice?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({ 
  label, 
  options, 
  error, 
  className,
  layout = 'vertical',
  nineSlice = true,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | undefined>(props.value as string);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedOption(props.value as string);
  }, [props.value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getSelectedLabel = () => {
    if (!selectedOption) return '';
    
    const option = options.find(opt => {
      if (typeof opt === 'string') {
        return opt === selectedOption;
      } else {
        return opt.value === selectedOption;
      }
    });

    if (!option) return '';
    
    return typeof option === 'string' ? option : option.label;
  };

  const handleSelect = (value: string, label: string) => {
    setSelectedOption(value);
    setIsOpen(false);
    
    // Create a synthetic event to trigger onChange
    if (props.onChange) {
      const event = {
        target: {
          value,
          name: props.name
        }
      } as React.ChangeEvent<HTMLSelectElement>;
      
      props.onChange(event);
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className={`${styles.dropdownWrapper} ${layout === 'horizontal' ? styles.horizontal : ''} ${className || ''}`}
      data-open={isOpen ? "true" : "false"}
    >
      <label className={styles.label}>{label}</label>
      
      <div className={styles.customDropdown}>
        <Button 
          variant="standard"
          size="medium"
          className={styles.dropdownButton} 
          onClick={() => setIsOpen(!isOpen)}
          data-active={isOpen ? "true" : "false"}
          nineSlice={nineSlice}
        >
          <div className={styles.buttonContent}>
            <span className={`${styles.selectedValue} pixel-font`}>{getSelectedLabel()}</span>
            <span className={styles.dropdownArrow}><FaChevronDown /></span>
          </div>
        </Button>
        
        {isOpen && (
          <div className={`${styles.dropdownMenu} pixel-font`}>
            {options.map((option, index) => {
              const value = typeof option === 'string' ? option : option.value;
              const label = typeof option === 'string' ? option : option.label;
              
              return (
                <button 
                  key={index}
                  className={`${styles.dropdownItem} ${selectedOption === value ? styles.active : ''}`}
                  onClick={() => handleSelect(value, label)}
                  type="button"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Hidden native select for form submission */}
      <select 
        className={styles.hiddenSelect}
        {...props}
        value={selectedOption}
        onChange={() => {}} // We handle changes with our custom dropdown
      >
        {options.map((option, index) => {
          if (typeof option === 'string') {
            return (
              <option key={index} value={option}>
                {option}
              </option>
            );
          } else {
            return (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            );
          }
        })}
      </select>
      
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};

export default Dropdown; 