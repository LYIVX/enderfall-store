"use client";

import React, { useMemo, useState } from 'react';
import * as FaIcons from 'react-icons/fa';
import { IconType } from 'react-icons';
import GridSelector, { GridItem } from './GridSelector';
import Button from './Button';
import styles from './IconSelector.module.css';

interface IconSelectorProps {
  label?: string;
  selectedIcon: string;
  onChange: (iconName: string) => void;
}

const IconSelector: React.FC<IconSelectorProps> = ({ 
  label = 'Select Icon', 
  selectedIcon, 
  onChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get all icons from react-icons/fa and format them for GridSelector
  const iconItems = useMemo(() => {
    const items: GridItem<string>[] = Object.entries(FaIcons)
      .filter(([name]) => name.startsWith('Fa'))
      .map(([name, Icon]) => {
        // Cast Icon to IconType
        const IconComponent = Icon as IconType;
        
        return {
          id: name,
          label: name,
          value: name,
          content: <IconComponent className={styles.iconPreview} />
        };
      });
    
    return items;
  }, []);
  
  // Get the current selected icon component
  const SelectedIcon = useMemo(() => {
    const IconComponent = FaIcons[selectedIcon as keyof typeof FaIcons] as IconType;
    return IconComponent || FaIcons.FaStar;
  }, [selectedIcon]);
  
  return (
    <div className={styles.iconSelectorContainer}>
      <label className={styles.iconSelectorLabel}>{label}</label>
      
      <div className={styles.iconSelectorPreview}>
        <div className={styles.selectedIconWrapper}>
          <SelectedIcon className={styles.selectedIcon} />
          <div className={styles.selectedIconName}>{selectedIcon}</div>
        </div>
        
        <Button 
          variant="primary"
          onClick={() => setIsOpen(!isOpen)}
          icon={isOpen ? <FaIcons.FaTimes /> : <FaIcons.FaListUl />}
        >
          {isOpen ? 'Close' : 'Choose Icon'}
        </Button>
      </div>
      
      {isOpen && (
        <div className={styles.iconSelectorPopover}>
          <div className={styles.iconSelectorPopoverContent}>
            <GridSelector
              items={iconItems}
              selectedValue={selectedIcon}
              onChange={(value) => {
                onChange(value);
                setIsOpen(false);
              }}
              columns={5}
              maxHeight="300px"
              itemSize="small"
              searchable={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default IconSelector; 