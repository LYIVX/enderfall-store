"use client";

import React, { useState, useEffect } from 'react';
import { supabase, ShopItem, ShopItemPerk, ShopItemCategory } from '@/lib/supabase';
import DraggableList, { ListConfig, DraggableItem } from '@/components/UI/DraggableList';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import Dropdown from '@/components/UI/Dropdown';
import TextArea from '@/components/UI/TextArea';
import Toggle from '@/components/UI/Toggle';
import ColorPicker from '@/components/UI/ColorPicker';
import ColorSlider from '@/components/UI/ColorSlider';
import IconSelector from '@/components/UI/IconSelector';
import Tabs, { Tab } from '@/components/UI/Tabs';
import styles from './ranks.module.css';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { 
  FaInfoCircle, FaSave, FaUndo, FaStar, FaPlus, FaCrown, 
  FaBolt, FaFireAlt, FaTrash, FaFill, FaPaintBrush, FaEdit, FaTimes, FaSpinner, FaFolder, FaArrowUp 
} from 'react-icons/fa';
import Link from 'next/link';
import * as FaIcons from 'react-icons/fa';
import { IconType } from 'react-icons';
import FeaturedRanks from '@/components/Home/FeaturedRanks';
import Slider from '@/components/UI/Slider';

// Define the Category interface that was previously imported from supabase.ts
interface Category {
  id: string;
  name: string;
  icon: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface FeaturedRank {
  id: string;
  rank_id: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  shop_items?: ShopItem;
}

interface DraggableRankItem {
  id: string;
  data: ShopItem;
  order: number;
}

// Define supported gradient types
type GradientType = 'linear' | 'radial' | 'none';

// Define color object structure
interface ColorData {
  color: string;
  position: number; // 0-100 percentage for gradient position (no longer optional)
}

interface FormValues {
  name: string;
  category_id: string;
  description: string;
  price: string;
  icon: string;
  colors: ColorData[];
  gradientType: GradientType;
  gradientAngle: number; // New property for gradient angle
  perks: ShopItemPerk[];
  is_exclusive: boolean;
  is_new: boolean;
  is_popular: boolean;
  is_upgrade: boolean; // New property for upgrade
}

interface PerkFormValues {
  name: string;
  icon: string;
  tooltip: string;
}

interface ColorFormValues {
  color: string;
  position: number;
}

interface CategoryFormValues {
  name: string;
  icon: string;
}

const initialPerkValues: PerkFormValues = {
  name: '',
  icon: 'FaStar',
  tooltip: ''
};

const initialColorValues: ColorFormValues = {
  color: '#6366F1',
  position: 0
};

const initialFormValues: FormValues = {
  name: '',
  category_id: '',
  description: '',
  price: '',
  icon: 'FaStar',
  colors: [{ color: '#6366F1', position: 0 }],
  gradientType: 'none',
  gradientAngle: 90, // Default to 90 degrees (to right)
  perks: [],
  is_exclusive: false,
  is_new: false,
  is_popular: false,
  is_upgrade: false, // Default to false
};

const RANKS_LIMIT = 5;

// Generate CSS for a color or gradient based on colors array and gradient type
const generateColorStyle = (
  colors: ColorData[], 
  gradientType: GradientType, 
  gradientAngle: number = 90, 
  verticalPosition: number = 50
): string => {
  // If no colors or just one color, return the solid color
  if (!colors.length) return 'transparent';
  if (colors.length === 1 || gradientType === 'none') return colors[0].color;

  // Sort colors by position for gradient
  const sortedColors = [...colors].sort((a, b) => (a.position || 0) - (b.position || 0));
  
  // Generate gradient string
  if (gradientType === 'linear') {
    const colorStops = sortedColors.map(c => 
      `${c.color} ${c.position !== undefined ? c.position + '%' : ''}`
    ).join(', ');
    return `linear-gradient(${gradientAngle}deg, ${colorStops})`;
  } else if (gradientType === 'radial') {
    const colorStops = sortedColors.map(c => 
      `${c.color} ${c.position !== undefined ? c.position + '%' : ''}`
    ).join(', ');
    // Use angle for horizontal position and verticalPosition for vertical position
    // Note: We're using the original verticalPosition (not inverted) as the CSS expects it this way
    return `radial-gradient(circle at ${gradientAngle}% ${verticalPosition}%, ${colorStops})`;
  }
  
  return colors[0].color; // Fallback
};

// Add the renderDynamicIcon function
const renderDynamicIcon = (iconName: string | undefined) => {
  if (!iconName) return <FaStar />;
  const IconComponent = FaIcons[iconName as keyof typeof FaIcons] as IconType;
  return IconComponent ? <IconComponent /> : <FaStar />;
};

export default function RanksAdmin() {
  const [availableRanks, setAvailableRanks] = useState<DraggableRankItem[]>([]);
  const [selectedRanks, setSelectedRanks] = useState<DraggableRankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditRankSelector, setShowEditRankSelector] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [perkValues, setPerkValues] = useState<PerkFormValues>(initialPerkValues);
  const [colorValues, setColorValues] = useState<ColorFormValues>(initialColorValues);
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [gradientVerticalPosition, setGradientVerticalPosition] = useState(50);
  const [isCreatingRank, setIsCreatingRank] = useState(false);
  const [isEditingRank, setIsEditingRank] = useState(false);
  const [editRankId, setEditRankId] = useState<string | null>(null);
  const [allRanks, setAllRanks] = useState<ShopItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showFeaturedRanksManager, setShowFeaturedRanksManager] = useState(false);
  const [categoryValues, setCategoryValues] = useState<CategoryFormValues>({
    name: '',
    icon: 'FaFolder'
  });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoriesDraggableItems, setCategoriesDraggableItems] = useState<any[]>([]);
  const [isSavingCategoryOrder, setIsSavingCategoryOrder] = useState(false);
  const [isSavingFeaturedRanks, setIsSavingFeaturedRanks] = useState(false);
  const [showRankManager, setShowRankManager] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('create-rank');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const router = useRouter();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [ranksLists, setRanksLists] = useState<ListConfig[]>([]);
  const [isSavingRankOrder, setIsSavingRankOrder] = useState(false);
  const [availableForFeatured, setAvailableForFeatured] = useState<ShopItem[]>([]);
  const [featuredRanksError, setFeaturedRanksError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch categories
        await fetchCategories();
        
        // Fetch all shop items (ranks from all categories)
        const { data: shopItems, error: shopError } = await supabase
          .from('shop_items')
          .select('*, categories(*)')  // Include categories in the query
          .order('price', { ascending: false });

        if (shopError) throw shopError;

        // Fetch currently featured ranks
        const { data: featuredData, error: featuredError } = await supabase
          .from('featured_ranks')
          .select('*, shop_items(*, categories(*))')  // Include categories in the nested query
          .order('display_order', { ascending: true });

        if (featuredError) throw featuredError;

        // Store all shop items for the featured ranks tab
        if (shopItems) {
          setAllRanks(shopItems);
          setAvailableForFeatured(shopItems);
        }

        // Convert featured ranks to draggable items
        const featured = featuredData || [];
        const featuredIds = new Set(featured.map(item => item.rank_id));
        
        // Create draggable items from featured ranks
        const selectedItems: DraggableRankItem[] = featured
          .filter(item => item.shop_items)
          .map(item => ({
            id: item.rank_id,
            data: item.shop_items!,
            order: item.display_order
          }));

        // Create draggable items from available ranks (those not in featured)
        const availableItems: DraggableRankItem[] = (shopItems || [])
          .filter(item => !featuredIds.has(item.id))
          .map(item => ({
            id: item.id,
            data: item,
            order: item.display_order
          }));

        setSelectedRanks(selectedItems);
        setAvailableRanks(availableItems);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Helper function to dynamically get icon component from name
  const getIconComponent = (iconName: string) => {
    if (!iconName) return <FaStar />;
    const IconComponent = FaIcons[iconName as keyof typeof FaIcons] || FaStar;
    return <IconComponent />;
  };

  // Helper function to parse color data from shop item
  const parseColorData = (item: ShopItem): { colors: ColorData[], gradientType: GradientType, gradientAngle?: number, verticalPosition?: number } => {
    // If the item has a color field that's a JSON string, try to parse it
    if (item.color && typeof item.color === 'string') {
      try {
        if (item.color.startsWith('{')) {
          // It's a JSON object with our new format
          const parsed = JSON.parse(item.color);
          return {
            colors: parsed.colors || [{ color: parsed.color || '#6366F1', position: 0 }],
            gradientType: parsed.gradientType || 'none',
            gradientAngle: parsed.gradientAngle || 90,
            // For radial gradients, extract verticalPosition or use inverted value for backwards compatibility
            verticalPosition: parsed.verticalPosition !== undefined 
              ? parsed.verticalPosition 
              : (parsed.gradientType === 'radial' ? 100 - (parsed.verticalGradientPosition || 50) : 50)
          };
        } else if (item.color.startsWith('#') || item.color.startsWith('rgb')) {
          // It's a plain color string (old format)
          return {
            colors: [{ color: item.color, position: 0 }],
            gradientType: 'none'
          };
        }
      } catch (e) {
        console.error('Error parsing color data:', e);
      }
    }
    
    // Default fallback
    return {
      colors: [{ color: '#6366F1', position: 0 }],
      gradientType: 'none'
    };
  };

  // Calculate the display color for a rank (used in rank icons and display)
  const getRankDisplayColor = (rank: ShopItem): string => {
    const { colors, gradientType } = parseColorData(rank);
    const gradientAngle = parseColorData(rank).gradientAngle || 90;
    const verticalPosition = parseColorData(rank).verticalPosition || 50;
    return generateColorStyle(colors, gradientType, gradientAngle, verticalPosition);
  };

  // Update the getCategoryName function to handle the new data structure
  const getCategoryName = (categoryId: string, rank?: ShopItem) => {
    // First try to find in the categories state
    const category = categories.find(c => c.id === categoryId);
    if (category) return category.name;

    // If not found in categories state, try to find in the rank's category data
    if (rank?.categories?.name) return rank.categories.name;

    // If still not found, try to find in allRanks
    const rankFromAllRanks = allRanks.find(r => r.category_id === categoryId);
    if (rankFromAllRanks?.categories?.name) return rankFromAllRanks.categories.name;

    return 'Unknown Category';
  };

  const createRankContent = (rank: ShopItem) => {
    const displayColor = getRankDisplayColor(rank);
    
    return (
      <div className={styles.rankItem}>
        <div className={styles.rankItemActions}>
          <Button 
            variant="edit" 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              handleEditRank(rank.id);
            }}
            aria-label="Edit rank"
          />
          <Button 
            variant="delete" 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteRank(rank.id);
            }}
            aria-label="Delete rank"
          />
        </div>
        <div 
          className={styles.rankIcon} 
          style={{ color: displayColor }}
        >
          {rank.icon ? getIconComponent(rank.icon) : <FaStar />}
        </div>
        <div className={styles.rankInfo}>
          <div className={styles.rankName}>
            {rank.name}
            {rank.is_exclusive && <span className={styles.exclusiveTag}><FaCrown /></span>}
            {rank.is_new && <span className={styles.newTag}><FaBolt /></span>}
            {rank.is_popular && <span className={styles.popularTag}><FaFireAlt /></span>}
          </div>
          {/* Removing price display */}
          <div className={styles.rankCategory}>{getCategoryName(rank.category_id, rank)}</div>
        </div>
      </div>
    );
  };

  const handleSelectionChange = (selected: any[]) => {
    setSelectedRanks(selected as DraggableRankItem[]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleChange = (name: string) => {
    setFormValues(prev => ({ ...prev, [name]: !prev[name as keyof FormValues] }));
  };

  const handleGradientTypeChange = (value: GradientType) => {
    // If switching to 'none' (solid color), keep only the first color
    if (value === 'none' && formValues.colors.length > 1) {
      setFormValues(prev => ({
        ...prev,
        gradientType: value,
        colors: [prev.colors[0]]
      }));
      // Update active color index to point to the remaining color
      setActiveColorIndex(0);
    } else {
      // When switching between linear and radial, adjust the angle/position value
      let newAngle = formValues.gradientAngle;
      if (value === 'radial' && formValues.gradientType === 'linear') {
        // Convert from 0-360 to 0-100 range
        newAngle = Math.min(100, Math.round(formValues.gradientAngle / 3.6));
      } else if (value === 'linear' && formValues.gradientType === 'radial') {
        // Convert from 0-100 to 0-360 range, preferring common angles
        const commonAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
        const approximateAngle = Number(formValues.gradientAngle) * 3.6;
        // Find the closest common angle
        newAngle = commonAngles.reduce((prev, curr) => 
          Math.abs(curr - approximateAngle) < Math.abs(prev - approximateAngle) ? curr : prev
        );
      }
      
      setFormValues(prev => ({ 
        ...prev, 
        gradientType: value,
        gradientAngle: newAngle
      }));
    }
  };

  const handleColorChange = (color: string) => {
    if (activeColorIndex >= 0 && activeColorIndex < formValues.colors.length) {
      // Update the selected color in the colors array
      const updatedColors = [...formValues.colors];
      updatedColors[activeColorIndex] = {
        ...updatedColors[activeColorIndex],
        color
      };
      
      setFormValues(prev => ({
        ...prev,
        colors: updatedColors
      }));
    } else {
      // Update the color form values when no color is selected
      setColorValues(prev => ({ ...prev, color }));
    }
  };

  const addColor = () => {
    // No multiple colors for solid color (none) gradient type
    if (formValues.gradientType === 'none') {
      toast.error('Multiple colors are only allowed for gradients');
      return;
    }
    
    // Validate
    if (!colorValues.color.trim()) {
      toast.error('Color is required');
      return;
    }

    // Add color to the list
    setFormValues(prev => ({
      ...prev,
      colors: [...prev.colors, { ...colorValues }]
    }));

    // Set the new color as active
    setActiveColorIndex(formValues.colors.length);

    // Reset position for next color (increment by 20%)
    setColorValues({
      color: '#6366F1',
      position: Math.min(100, (colorValues.position + 20) % 120)
    });
  };

  const removeColor = (index: number) => {
    // Don't allow removing the last color
    if (formValues.colors.length <= 1) {
      toast.error('You must have at least one color');
      return;
    }

    const updatedColors = formValues.colors.filter((_, i) => i !== index);
    setFormValues(prev => ({
      ...prev,
      colors: updatedColors
    }));

    // Update active color index if needed
    if (activeColorIndex === index) {
      setActiveColorIndex(Math.min(activeColorIndex, updatedColors.length - 1));
    } else if (activeColorIndex > index) {
      setActiveColorIndex(activeColorIndex - 1);
    }
  };

  const handleColorSelect = (index: number) => {
    if (index >= 0 && index < formValues.colors.length) {
      setActiveColorIndex(index);
      // Update the color form values to match the selected color
      setColorValues({
        color: formValues.colors[index].color,
        position: formValues.colors[index].position || 0
      });
    }
  };

  const handlePositionChange = (index: number, position: number) => {
    const newColors = [...formValues.colors];
    newColors[index] = { ...newColors[index], position };
    setFormValues(prev => ({ ...prev, colors: newColors }));
  };

  const handlePerkInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPerkValues(prev => ({ ...prev, [name]: value }));
  };

  const addPerk = () => {
    // Validate all perk fields
    if (!perkValues.name.trim()) {
      toast.error('Perk name is required');
      return;
    }
    
    if (!perkValues.icon.trim()) {
      toast.error('Perk icon is required');
      return;
    }
    
    if (!perkValues.tooltip.trim()) {
      toast.error('Perk tooltip is required');
      return;
    }

    // Add perk to the list
    setFormValues(prev => ({
      ...prev,
      perks: [...prev.perks, { ...perkValues }]
    }));

    // Reset perk form
    setPerkValues(initialPerkValues);
  };

  const removePerk = (index: number) => {
    setFormValues(prev => ({
      ...prev,
      perks: prev.perks.filter((_, i) => i !== index)
    }));
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted", { isEditingRank, editRankId });
    
    if (!formValues.name || !formValues.description || !formValues.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Add validation for category_id
    if (!formValues.category_id) {
      toast.error('Please select a category');
      return;
    }

    // Create color data to store as JSON
    const colorData = {
      colors: formValues.colors,
      gradientType: formValues.gradientType,
      gradientAngle: formValues.gradientAngle,
      // Add vertical position for radial gradients
      verticalPosition: formValues.gradientType === 'radial' ? gradientVerticalPosition : undefined
    };

    const rankData = {
      name: formValues.name,
      category_id: formValues.category_id,
      description: formValues.description,
      price: parseFloat(formValues.price),
      icon: formValues.icon,
      color: JSON.stringify(colorData),
      perks: formValues.perks,
      is_exclusive: formValues.is_exclusive,
      is_new: formValues.is_new,
      is_popular: formValues.is_popular,
      is_upgrade: formValues.is_upgrade, // Add is_upgrade to the data
    };

    setIsSaving(true);
    console.log("Preparing to save rank", { 
      rankData, 
      isEditingRank, 
      editRankId
    });

    try {
      if (isEditingRank && editRankId) {
        console.log("Updating existing rank:", editRankId);
        
        // Let's try direct Supabase update first
        console.log("Attempting direct Supabase update");
        const { data, error } = await supabase
          .from('shop_items')
          .update({
            name: rankData.name,
            category_id: rankData.category_id,
            description: rankData.description,
            price: rankData.price,
            icon: rankData.icon,
            color: rankData.color,
            perks: rankData.perks,
            is_exclusive: rankData.is_exclusive,
            is_new: rankData.is_new,
            is_popular: rankData.is_popular,
            is_upgrade: rankData.is_upgrade, // Add is_upgrade here too
          })
          .eq('id', editRankId);
          
        if (error) {
          console.error("Direct Supabase update error:", error);
          throw error;
        }
        
        console.log("Rank updated successfully!");
        toast.success('Rank updated successfully!');
        
        // Don't reset form immediately to avoid flashing
        fetchAllRanks(); // Refresh the list
        
        // Give the list time to update before resetting form
        setTimeout(() => {
          resetForm();
          setActiveTab('edit-rank'); // Switch back to edit tab
        }, 500);
      } else {
        console.log("Creating new rank");
        // Create new rank
        const { error } = await supabase
          .from('shop_items')
          .insert({
            ...rankData
          });
          
        if (error) throw error;
        
        toast.success('Rank created successfully');
        
        // Reset form
        resetForm();
      }
    } catch (error) {
      console.error('Error saving rank:', error);
      toast.error('Failed to save rank: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch all ranks for the edit rank selector
  const fetchAllRanks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      if (data) {
        setAllRanks(data);
        // Also update availableForFeatured when fetching all ranks
        setAvailableForFeatured(data);
      }
      return data;
    } catch (error) {
      console.error('Error fetching ranks:', error);
      toast.error('Failed to load ranks for editing');
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load a rank for editing
  const loadRankForEdit = async (rankId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('id', rankId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Parse the color data
        let colors: ColorData[] = [{ color: '#6366F1', position: 0 }];
        let gradientType: GradientType = 'none';
        let gradientAngle = 90; // Default to 90 degrees
        
        try {
          if (data.color) {
            const colorData = typeof data.color === 'string' 
              ? JSON.parse(data.color) 
              : data.color;
              
            if (colorData.colors && Array.isArray(colorData.colors)) {
              colors = colorData.colors.map((c: any) => ({
                color: c.color || '#6366F1',
                position: typeof c.position === 'number' ? c.position : 0
              }));
            }
            
            if (colorData.gradientType && 
                (colorData.gradientType === 'linear' || 
                 colorData.gradientType === 'radial' || 
                 colorData.gradientType === 'none')) {
              gradientType = colorData.gradientType;
            }
            
            // Extract gradient angle from color data
            if (typeof colorData.gradientAngle === 'number') {
              gradientAngle = colorData.gradientAngle;
            }
          }
        } catch (e) {
          console.error('Error parsing color data:', e);
        }
        
        // Set form values
        setFormValues({
          name: data.name || '',
          category_id: data.category_id || '',
          description: data.description || '',
          price: data.price?.toString() || '',
          icon: data.icon || 'FaStar',
          colors,
          gradientType,
          gradientAngle, // Use the extracted gradientAngle
          perks: data.perks || [],
          is_exclusive: data.is_exclusive || false,
          is_new: data.is_new || false,
          is_popular: data.is_popular || false,
          is_upgrade: data.is_upgrade || false, // Add is_upgrade here too
        });
        
        // Set active color index to first color
        setActiveColorIndex(0);
        
        // Set color values to first color
        if (colors.length > 0) {
          setColorValues({
            color: colors[0].color,
            position: colors[0].position
          });
        }
        
        // Set editing state
        setIsEditingRank(true);
        setEditRankId(rankId);
      }
    } catch (error) {
      console.error('Error loading rank for edit:', error);
      toast.error('Failed to load rank for editing');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to reset the form to its initial state
  const resetForm = () => {
    setFormValues(initialFormValues);
    setPerkValues(initialPerkValues);
    setColorValues(initialColorValues);
    setActiveColorIndex(0);
    setShowCreateForm(false);
    setIsEditingRank(false);
    setEditRankId(null);
  };

  // Function to handle category input change
  const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCategoryValues(prev => ({ ...prev, [name]: value }));
  };

  // Function to update category list after changes
  const updateCategoriesList = (updatedCategories: Category[]) => {
    // Update the categories state
    setCategories(updatedCategories);
    
    // Convert categories to draggable items with the latest UI
    const draggableItems = updatedCategories.map(category => ({
      id: category.id,
      content: createCategoryContent(category),
      data: category
    }));
    
    setCategoriesDraggableItems(draggableItems);
  };

  // Function to save a category
  const handleSaveCategory = async () => {
    if (!categoryValues.name.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      
      let response;
      
      if (editingCategoryId) {
        // Update existing category
        response = await fetch('/api/admin/categories/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingCategoryId,
            name: categoryValues.name.trim(),
            icon: categoryValues.icon
          }),
        });
      } else {
        // Create new category
        response = await fetch('/api/admin/categories/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: categoryValues.name.trim(),
            icon: categoryValues.icon
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          toast.error('A category with this name already exists');
          return;
        }
        throw new Error(errorData.error || `Failed to ${editingCategoryId ? 'update' : 'add'} category`);
      }

      const result = await response.json();
      
      // Update the categories list with the result
      if (result.categories) {
        updateCategoriesList(result.categories);
      }

      // Reset form
      setCategoryValues({ name: '', icon: 'FaFolder' });
      setEditingCategoryId(null);
      
      toast.success(`Category ${editingCategoryId ? 'updated' : 'added'} successfully`);
    } catch (error) {
      console.error(`Error ${editingCategoryId ? 'updating' : 'adding'} category:`, error);
      toast.error(`Failed to ${editingCategoryId ? 'update' : 'add'} category`);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to edit a category
  const handleEditCategory = (category: Category) => {
    setCategoryValues({
      name: category.name,
      icon: category.icon || 'FaFolder'
    });
    setEditingCategoryId(category.id);
  };

  // Function to delete a category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This may affect ranks using this category.')) {
      return;
    }
    
    setIsDeletingCategory(true);
    try {
      // Use the server API instead of direct Supabase access
      const response = await fetch(`/api/admin/categories/delete?id=${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }

      const result = await response.json();
      
      // Update the categories list with the result
      if (result.categories) {
        updateCategoriesList(result.categories);
      }
      
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // Function to handle category order change
  const handleCategoryOrderChange = (reorderedItems: any[]) => {
    setCategoriesDraggableItems(reorderedItems);
  };

  // Function to save category order
  const saveCategoryOrder = async () => {
    setIsSavingCategoryOrder(true);
    try {
      // Update each category's display_order using a server function
      const updates = categoriesDraggableItems.map((item, index) => ({
        id: item.id,
        name: item.data.name,
        icon: item.data.icon,
        display_order: index
      }));

      console.log('Updating categories with data:', JSON.stringify(updates));

      // Use the server API instead of direct Supabase access
      const response = await fetch('/api/admin/categories/update-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categories: updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update category order');
      }

      const result = await response.json();
      
      // Update the local state with the new categories
      if (result.categories) {
        setCategories(result.categories);
      } else {
        // If the API doesn't return updated categories, fetch them
        const { data: updatedCategories, error: fetchError } = await supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;
        setCategories(updatedCategories || []);
      }

      toast.success('Category order updated successfully');
    } catch (error) {
      console.error('Error updating category order:', error);
      toast.error('Failed to update category order');
    } finally {
      setIsSavingCategoryOrder(false);
    }
  };

  // Add function to create category content for draggable list
  const createCategoryContent = (category: Category) => {
    return (
      <div className={styles.categoryCard}>
        <div className={styles.categoryItemActions}>
          <Button 
            variant="edit" 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              handleEditCategory(category);
            }}
            aria-label="Edit category"
          />
          <Button 
            variant="delete" 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCategory(category.id);
            }}
            aria-label="Delete category"
          />
        </div>
        <div className={styles.categoryIcon}>
          {category.icon ? renderDynamicIcon(category.icon) : renderDynamicIcon('FaFolder')}
        </div>
        <div className={styles.categoryInfo}>
          <div className={styles.categoryName}>{category.name}</div>
        </div>
      </div>
    );
  };

  // Function to fetch categories
  const fetchCategories = async () => {
    try {
      console.log('Fetching categories from Supabase...');
      
      // Try using a direct query to bypass security policies
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
        
      if (error) {
        console.error('Supabase error fetching categories:', error);
        
        // If direct query fails, try using the server API
        console.log('Trying server API to fetch categories...');
        const response = await fetch('/api/admin/categories/list', {
          method: 'GET',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories from API');
        }
        
        const result = await response.json();
        
        if (result.categories && result.categories.length > 0) {
          console.log('Categories fetched from API:', result.categories);
          updateCategoriesList(result.categories);
          return;
        } else {
          // Fall back to defaults if API returns empty
          console.log('API returned empty categories, using defaults');
          useDefaultCategories();
          return;
        }
      }
      
      console.log('Categories fetched from Supabase:', data);
      if (data && data.length > 0) {
        updateCategoriesList(data);
      } else {
        console.log('No categories data returned from Supabase, using defaults');
        // Use default categories as a fallback
        useDefaultCategories();
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
      
      // Use default categories as a fallback
      useDefaultCategories();
    }
  };

  // Helper function to use default categories
  const useDefaultCategories = () => {
    const defaultCategories: Category[] = [
      { id: 'b6dae9d4-3479-491c-b2ca-22ea9fe98a3b', name: 'Serverwide Ranks', icon: 'FaCrown', display_order: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '71682765-5b9c-41e1-b3aa-9e7c7ea8319a', name: 'Serverwide Upgrades', icon: 'FaUser', display_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '2e327ad1-6e52-477a-b0d7-7fa1dc72cf9b', name: 'Towny Ranks', icon: 'FaCity', display_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'c70734a6-e9a9-451d-88de-b6a0f2f65214', name: 'Towny Upgrades', icon: 'FaUser', display_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '5e046266-202f-4f8c-a32d-1af36e2cc85e', name: 'Beta Access', icon: 'FaCode', display_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'e557c9e2-ffb3-45f1-8b62-d1124a81d7b4', name: 'Cosmetics', icon: 'FaMagic', display_order: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'd7bb6b44-c173-4452-b924-4238ac832ba3', name: 'Perks', icon: 'FaStar', display_order: 6, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'b0394335-071e-4fa3-95f3-78c84ec67188', name: 'Bundles', icon: 'FaBox', display_order: 7, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];
    updateCategoriesList(defaultCategories);
  };

  // Function to save featured ranks
  const saveFeaturedRanks = async () => {
    setIsSavingFeaturedRanks(true);
    try {
      // First, delete existing featured ranks
      const { error: deleteError } = await supabase
        .from('featured_ranks')
        .delete()
        .not('id', 'is', null);  // This is a workaround to delete all records

      if (deleteError) throw deleteError;

      // Then insert the new featured ranks with display order
      if (selectedRanks.length > 0) {
        const featuredRanks = selectedRanks.map((item, index) => ({
          rank_id: item.id,
          display_order: index
        }));

        const { error: insertError } = await supabase
          .from('featured_ranks')
          .insert(featuredRanks);

        if (insertError) throw insertError;
      }

      toast.success('Featured ranks saved successfully!');
    } catch (error) {
      console.error('Error saving featured ranks:', error);
      toast.error('Failed to save featured ranks');
    } finally {
      setIsSavingFeaturedRanks(false);
    }
  };

  // List of category options for dropdown
  const categoryOptions = categories.map(category => ({
    value: category.id,
    label: category.name
  }));

  // List of gradient type options
  const gradientTypeOptions = [
    { value: 'none', label: 'Solid Color' },
    { value: 'linear', label: 'Linear Gradient' },
    { value: 'radial', label: 'Radial Gradient' }
  ];

  // Preview the current color/gradient settings
  const colorPreviewStyle = {
    background: generateColorStyle(
      formValues.colors, 
      formValues.gradientType, 
      formValues.gradientAngle,
      gradientVerticalPosition
    ),
  };

  // Function to handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Fetch data based on active tab
    if (tabId === 'edit-rank' && allRanks.length === 0) {
      fetchAllRanks();
    } else if (tabId === 'categories') {
      fetchCategories();
      setCategoryValues({ name: '', icon: 'FaFolder' });
      setEditingCategoryId(null);
    } else if (tabId === 'featured-ranks') {
      // Fetch all ranks for the featured ranks manager
      fetchAllRanks().then(() => {
        // After fetching, update availableForFeatured with all ranks
        setAvailableForFeatured(allRanks);
      });
    }
  };

  // Reset form when changing tabs
  useEffect(() => {
    if (activeTab !== 'edit-rank' && activeTab !== 'create-rank') {
      resetForm();
    }
  }, [activeTab]);

  // Define tabs
  const tabs: Tab[] = [
    {
      id: 'create-rank',
      label: 'Create New Rank',
      icon: <FaPlus />,
    },
    {
      id: 'edit-rank',
      label: 'Edit Existing Rank',
      icon: <FaEdit />,
    },
    {
      id: 'categories',
      label: 'Manage Categories',
      icon: <FaFolder />,
    },
    {
      id: 'featured-ranks',
      label: 'Featured Ranks',
      icon: <FaStar />,
    }
  ];

  // This function will create lists based on categories
  const createRanksByCategory = (ranks: ShopItem[], categories: Category[]) => {
    // Group ranks by category
    const ranksByCategory: Record<string, DraggableItem[]> = {};
    
    // Initialize empty arrays for each category
    categories.forEach(category => {
      ranksByCategory[category.id] = [];
    });
    
    // Add ranks to their respective categories
    ranks.forEach(rank => {
      if (!ranksByCategory[rank.category_id]) {
        ranksByCategory[rank.category_id] = [];
      }
      
      ranksByCategory[rank.category_id].push({
        id: rank.id,
        content: createRankContent(rank),
        data: rank
      });
    });
    
    // Sort ranks within each category by display_order
    Object.keys(ranksByCategory).forEach(categoryId => {
      ranksByCategory[categoryId].sort((a, b) => 
        (a.data.display_order || 0) - (b.data.display_order || 0)
      );
    });
    
    // Create a list config for each category
    return categories.map(category => ({
      id: category.id,
      title: category.name,
      items: ranksByCategory[category.id] || [],
      className: styles.ranksCategoryList
    }));
  };

  // Update the fetchShopItems function to include display_order
  const fetchShopItems = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*, categories(*)')
        .order('display_order', { ascending: true });

      if (error) throw error;

      setAllRanks(data || []);
      
      // Create lists for the draggable component
      const lists = createRanksByCategory(data || [], categories);
      setRanksLists(lists);
    } catch (error) {
      console.error('Error fetching shop items:', error);
      toast.error('Failed to load shop items');
    }
  };

  // Handle drag-and-drop between lists
  const handleRanksListsChange = (updatedLists: ListConfig[]) => {
    setRanksLists(updatedLists);
    setHasUnsavedChanges(true);
  };

  // Handle category change when a rank is dragged between lists
  const handleRankCategoryChange = (sourceListId: string, destinationListId: string, itemId: string) => {
    console.log(`Moving rank ${itemId} from category ${sourceListId} to ${destinationListId}`);
    // Logic is handled in handleRanksListsChange, but we could add additional logic here if needed
  };

  // Save the new rank order and category changes
  const saveRanksOrder = async () => {
    setIsSavingRankOrder(true);
    try {
      // Create an array of all ranks with their updated display_order and category_id
      const updatedRanks: any[] = [];
      
      ranksLists.forEach((list, listIndex) => {
        list.items.forEach((item, index) => {
          updatedRanks.push({
            id: item.id,
            category_id: list.id, // The list id is the category id
            display_order: index
          });
        });
      });
      
      console.log('Sending rank updates:', JSON.stringify(updatedRanks));

      // Use the server API to update ranks
      const response = await fetch('/api/admin/ranks/update-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ranks: updatedRanks }),
      });

      const responseText = await response.text();
      console.log('Response from API:', response.status, responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Invalid response from server: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update rank order');
      }
      
      // Update the local state with the new ranks
      if (result.ranks) {
        setAllRanks(result.ranks);
        
        // Update the lists with the new data
        const lists = createRanksByCategory(result.ranks, categories);
        setRanksLists(lists);
      }
      
      setHasUnsavedChanges(false);
      toast.success('Rank order updated successfully');
    } catch (error) {
      console.error('Error saving rank order:', error);
      toast.error('Failed to save rank order');
    } finally {
      setIsSavingRankOrder(false);
    }
  };

  // Add a useEffect to initialize ranksLists when allRanks or categories change
  useEffect(() => {
    if (allRanks.length > 0 && categories.length > 0) {
      const lists = createRanksByCategory(allRanks, categories);
      setRanksLists(lists);
    }
  }, [allRanks, categories]);

  // Function to render tab content based on active tab
  const renderTabContent = (tab: Tab) => {
    switch (tab.id) {
      case 'create-rank':
  return (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Create New Rank</h2>
            </div>
            {/* Create Rank Form Fields */}
            <Input
              label="Rank Name *"
              id="name"
              name="name"
              value={formValues.name}
              onChange={handleInputChange}
              required
              placeholder="e.g. Shadow Enchanter"
            />

            <Dropdown
              label="Category *"
              id="category_id"
              name="category_id"
              value={formValues.category_id}
              onChange={handleInputChange}
              options={categoryOptions}
              required
            />

            <TextArea
              label="Description *"
              id="description"
              name="description"
              value={formValues.description}
              onChange={handleInputChange}
              required
              placeholder="Describe the rank's benefits and features"
              rows={4}
            />

            <div className={styles.formRow}>
              <Input
                label="Price (£) *"
                id="price"
                name="price"
                type="number"
                value={formValues.price}
                onChange={handleInputChange}
                required
                step="0.01"
                min="0"
                placeholder="29.99"
              />

              <IconSelector
                label="Icon"
                selectedIcon={formValues.icon}
                onChange={(iconName) => setFormValues(prev => ({ ...prev, icon: iconName }))}
              />
            </div>

            {/* Colors Section */}
                <div className={styles.colorSection}>
                  <h3 className={styles.subsectionTitle}>Colors and Gradient</h3>
                  
                  <div className={styles.gradientTypeSelector}>
                    <div className={styles.gradientTypeLabel}>Gradient Type:</div>
                    <div className={styles.gradientTypeOptions}>
                      {gradientTypeOptions.map(option => (
                        <Button
                          key={option.value}
                          type="button"
                          variant='primary'
                          size='medium'
                          className={` ${formValues.gradientType === option.value ? styles.active : ''}`}
                          onClick={() => handleGradientTypeChange(option.value as GradientType)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
      </div>

                    
                    <div className={styles.colorContainer}>
                      {/* Add gradient angle slider when linear gradient is selected */}
                      {formValues.gradientType === 'linear' && (
                        <div className={styles.gradientAngleSelector}>
                          <div className={styles.gradientAngleLabel}>
                            Gradient Angle: {formValues.gradientAngle}°
                          </div>
                          <Slider 
                            min={0}
                            max={360}
                            value={formValues.gradientAngle}
                            onChange={(value) => setFormValues(prev => ({ ...prev, gradientAngle: value }))}
                            step={15}
                            tooltip={true}
                            marks={[0, 45, 90, 135, 180, 225, 270, 315, 360]}
                            label="Angle"
                          />
                        </div>
                      )}
                        {/* Add gradient angle slider when radial gradient is selected */}
                          {formValues.gradientType === 'radial' && (
                            <div className={styles.gradientAngleSelector}>
                              <div className={styles.gradientAngleLabel}>
                                Gradient Position: {formValues.gradientAngle}%
                              </div>
                              <Slider 
                                min={0}
                                max={100}
                                value={formValues.gradientAngle}
                                onChange={(value) => setFormValues(prev => ({ ...prev, gradientAngle: value }))}
                                step={5}
                                tooltip={true}
                                marks={[0, 25, 50, 75, 100]}
                                label="Position"
                              />
                            </div>
                          )}
                          <div className={styles.verticalSliderPreviewContainer}>
                        {formValues.gradientType === 'radial' && (
                          <div className={styles.verticalSliderContainer}>
                            <Slider
                              min={0}
                              max={100}
                              value={100 - gradientVerticalPosition} // Invert the value for display
                              onChange={(val) => handleGradientVerticalPositionChange(100 - val)} // Invert the input
                              step={5}
                              marks={[0, 25, 50, 75, 100]}
                              tooltip={true}
                              orientation="vertical"
                            />
                          </div>
                        )}
                        
                        {formValues.gradientType !== 'radial' && formValues.gradientType !== 'none' && (
                          <div className={styles.verticalSliderContainer}>
                            <Slider
                              min={0}
                              max={360}
                              value={formValues.gradientAngle}
                              onChange={(val) => setFormValues(prev => ({ ...prev, gradientAngle: val }))}
                              step={5}
                              marks={[0, 90, 180, 270, 360]}
                              tooltip={true}
                              orientation="vertical"
                            />
                          </div>
                        )}
                        
                        <div className={styles.colorPreview} style={colorPreviewStyle}>
                          <div className={styles.colorPreviewLabel}>
                            {formValues.gradientType === 'none' ? 'Color Preview' : 'Gradient Preview'}
                          </div>
                        </div>
                      </div>
              
              {formValues.gradientType !== 'none' && (
                <ColorSlider
                  colors={formValues.colors}
                  activeColorIndex={activeColorIndex}
                  gradientType={formValues.gradientType as 'linear' | 'radial' | 'none'}
                  onColorSelect={handleColorSelect}
                  onPositionChange={handlePositionChange}
                  onAddColor={(position, color) => {
                    // Add a new color at the specified position
                    const newColor = { color, position };
                    setFormValues(prev => ({
                      ...prev,
                      colors: [...prev.colors, newColor]
                    }));
                    // Set the new color as active
                    setActiveColorIndex(formValues.colors.length);
                  }}
                  onRemoveColor={(index) => removeColor(index)}
                  minColors={1}
                  step={5} // Use 5% step for better precision
                  marks={[0, 25, 50, 75, 100]} // Add marks at quarter positions
                  tooltip={true}
                  label="Color Positions"
                />
              )}
              </div>

              
              <div className={styles.colorForm}>
                <div className={styles.colorPickerRow}>
                  <ColorPicker
                    label="Active Color"
                    id="color-picker"
                    name="color"
                    color={activeColorIndex >= 0 && activeColorIndex < formValues.colors.length
                      ? formValues.colors[activeColorIndex].color
                      : colorValues.color}
                    onChange={handleColorChange}
                  />
                </div>
                <div className={styles.colorHelpText}>
                  <FaInfoCircle className={styles.infoIcon} />
                  <span>Click on the slider to add a new color stop. Right-click on a color stop to remove it.</span>
                </div>
              </div>
              
              {formValues.colors.length > 0 && (
                <div className={styles.colorsList}>
                  <h4 className={styles.colorsListTitle}>
                    {formValues.colors.length} Color{formValues.colors.length !== 1 ? 's' : ''} Added
                  </h4>
                  <div className={styles.colorsGrid}>
                    {formValues.colors.map((colorData, index) => (
                      <div 
                        key={index} 
                        className={`${styles.colorItem} ${activeColorIndex === index ? styles.activeColorItem : ''}`}
                        onClick={() => handleColorSelect(index)}
                      >
                        <div 
                          className={styles.colorSwatch} 
                          style={{ backgroundColor: colorData.color }}
                        ></div>
                        <div className={styles.colorItemContent}>
                          <span className={styles.colorItemValue}>{colorData.color}</span>
                          {formValues.gradientType !== 'none' && (
                            <span className={styles.colorItemPosition}>{colorData.position}%</span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant='delete'
                          size='small'
                          onClick={(e) => {
                            e.stopPropagation();
                            removeColor(index);
                          }}
                          aria-label="Remove color"
                          disabled={formValues.colors.length <= 1}
                        >

                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Perks Section */}
            <div className={styles.perksSection}>
              <h3 className={styles.subsectionTitle}>Perks</h3>
              
              <div className={styles.perkForm}>
                <div className={styles.formRow}>
                  <Input
                    label="Perk Name"
                    id="perk-name"
                    name="name"
                    value={perkValues.name}
                    onChange={handlePerkInputChange}
                    placeholder="e.g. 5 Sethomes"
                  />
                  
                  <IconSelector
                    label="Perk Icon"
                    selectedIcon={perkValues.icon}
                    onChange={(iconName) => setPerkValues(prev => ({ ...prev, icon: iconName }))}
                  />
                </div>
                
                <TextArea
                  label="Tooltip"
                  id="perk-tooltip"
                  name="tooltip"
                  value={perkValues.tooltip}
                  onChange={handlePerkInputChange}
                  placeholder="Brief description of this perk"
                  rows={2}
                />
                
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addPerk}
                  className={styles.addPerkButton}
                >
                  <FaPlus /> Add Perk
                </Button>
              </div>
              
              {formValues.perks.length > 0 && (
                <div className={styles.perksList}>
                  <h4 className={styles.perksListTitle}>Added Perks</h4>
                  {formValues.perks.map((perk, index) => (
                    <div key={index} className={styles.perkItem}>
                      <div className={styles.perkItemIcon}>
                        {renderDynamicIcon(perk.icon)}
                      </div>
                      <div className={styles.perkItemContent}>
                        <span className={styles.perkItemName}>{perk.name}</span>
                        <span className={styles.perkItemTooltip}>{perk.tooltip}</span>
                      </div>
                      <Button
                        type="button"
                        variant="delete"
                        size="small"
                        onClick={() => removePerk(index)}
                        aria-label="Remove perk"
                      >
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Toggles Section */}
            <div className={styles.togglesContainer}>
              <Toggle
                label="Mark as Exclusive Rank"
                isEnabled={formValues.is_exclusive}
                onChange={() => handleToggleChange('is_exclusive')}
                enabledIcon={<FaCrown />}
              />
              
              <Toggle
                label="Mark as New Rank"
                isEnabled={formValues.is_new}
                onChange={() => handleToggleChange('is_new')}
                enabledIcon={<FaBolt />}
              />
              
              <Toggle
                label="Mark as Popular Rank"
                isEnabled={formValues.is_popular}
                onChange={() => handleToggleChange('is_popular')}
                enabledIcon={<FaFireAlt />}
              />
              
              <Toggle
                label="Mark as Upgrade"
                isEnabled={formValues.is_upgrade}
                onChange={() => handleToggleChange('is_upgrade')}
                enabledIcon={<FaArrowUp />}
              />
            </div>

            {/* Form Actions */}
            <div className={styles.formActions}>
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
            disabled={isSaving}
          >
                Cancel
          </Button>
                
          <Button 
                type="submit"
            variant="primary" 
            disabled={isSaving}
          >
                {isSaving ? (
                  <>
                    <FaSpinner className={styles.spinner} />
                    Creating...
                  </>
                ) : 'Create Rank'}
          </Button>
        </div>
          </form>
        );
      
      case 'edit-rank':
        return (
          <div className={styles.sectionContent}>
            {isEditingRank ? (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formHeader}>
                  <h2 className={styles.formTitle}>Edit Rank</h2>
                  <Button 
                    type="button" 
                    variant="ghost"
                    size="small"
                    className={styles.formClose}
                    onClick={() => {
                      resetForm();
                      setShowCreateForm(false);
                    }}
                  >
                    <FaTimes />
                  </Button>
      </div>
                {/* Create Rank Form Fields - Same as in create-rank tab */}
                <Input
                  label="Rank Name *"
                  id="name"
                  name="name"
                  value={formValues.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Shadow Enchanter"
                />

                <Dropdown
                  label="Category *"
                  id="category_id"
                  name="category_id"
                  value={formValues.category_id}
                  onChange={handleInputChange}
                  options={categoryOptions}
                  required
                />

                <TextArea
                  label="Description *"
                  id="description"
                  name="description"
                  value={formValues.description}
                  onChange={handleInputChange}
                  required
                  placeholder="Describe the rank's benefits and features"
                  rows={4}
                />

                <div className={styles.formRow}>
                  <Input
                    label="Price (£) *"
                    id="price"
                    name="price"
                    type="number"
                    value={formValues.price}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="29.99"
                  />

                  <IconSelector
                    label="Icon"
                    selectedIcon={formValues.icon}
                    onChange={(iconName) => setFormValues(prev => ({ ...prev, icon: iconName }))}
                  />
                </div>

                {/* Colors Section */}
                <div className={styles.colorSection}>
                  <h3 className={styles.subsectionTitle}>Colors and Gradient</h3>
                  
                  <div className={styles.gradientTypeSelector}>
                    <div className={styles.gradientTypeLabel}>Gradient Type:</div>
                    <div className={styles.gradientTypeOptions}>
                      {gradientTypeOptions.map(option => (
                        <Button
                          key={option.value}
                          type="button"
                          variant="primary"
                          size="medium"
                          className={`${formValues.gradientType === option.value ? styles.active : ''}`}
                          onClick={() => handleGradientTypeChange(option.value as GradientType)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
      </div>

                    
                    <div className={styles.colorContainer}>
                      {/* Add gradient angle slider when linear gradient is selected */}
                      {formValues.gradientType === 'linear' && (
                        <div className={styles.gradientAngleSelector}>
                          <div className={styles.gradientAngleLabel}>
                            Gradient Angle: {formValues.gradientAngle}°
                          </div>
                          <Slider 
                            min={0}
                            max={360}
                            value={formValues.gradientAngle}
                            onChange={(value) => setFormValues(prev => ({ ...prev, gradientAngle: value }))}
                            step={15}
                            tooltip={true}
                            marks={[0, 45, 90, 135, 180, 225, 270, 315, 360]}
                            label="Angle"
                          />
                        </div>
                      )}
                        {/* Add gradient angle slider when radial gradient is selected */}
                          {formValues.gradientType === 'radial' && (
                            <div className={styles.gradientAngleSelector}>
                              <div className={styles.gradientAngleLabel}>
                                Gradient Position: {formValues.gradientAngle}%
                              </div>
                              <Slider 
                                min={0}
                                max={100}
                                value={formValues.gradientAngle}
                                onChange={(value) => setFormValues(prev => ({ ...prev, gradientAngle: value }))}
                                step={5}
                                tooltip={true}
                                marks={[0, 25, 50, 75, 100]}
                                label="Position"
                              />
                            </div>
                          )}
                          <div className={styles.verticalSliderPreviewContainer}>
                        {formValues.gradientType === 'radial' && (
                          <div className={styles.verticalSliderContainer}>
                            <Slider
                              min={0}
                              max={100}
                              value={100 - gradientVerticalPosition} // Invert the value for display
                              onChange={(val) => handleGradientVerticalPositionChange(100 - val)} // Invert the input
                              step={5}
                              marks={[0, 25, 50, 75, 100]}
                              tooltip={true}
                              orientation="vertical"
                            />
                          </div>
                        )}
                        
                        {formValues.gradientType !== 'radial' && formValues.gradientType !== 'none' && (
                          <div className={styles.verticalSliderContainer}>
                            <Slider
                              min={0}
                              max={360}
                              value={formValues.gradientAngle}
                              onChange={(val) => setFormValues(prev => ({ ...prev, gradientAngle: val }))}
                              step={5}
                              marks={[0, 90, 180, 270, 360]}
                              tooltip={true}
                              orientation="vertical"
                            />
                          </div>
                        )}
                        
                        <div className={styles.colorPreview} style={colorPreviewStyle}>
                          <div className={styles.colorPreviewLabel}>
                            {formValues.gradientType === 'none' ? 'Color Preview' : 'Gradient Preview'}
                          </div>
                        </div>
                      </div>
                      
                      {formValues.gradientType !== 'none' && (
                        <ColorSlider
                          colors={formValues.colors}
                          activeColorIndex={activeColorIndex}
                          gradientType={formValues.gradientType as 'linear' | 'radial' | 'none'}
                          onColorSelect={handleColorSelect}
                          onPositionChange={handlePositionChange}
                          onAddColor={(position, color) => {
                            // Add a new color at the specified position
                            const newColor = { color, position };
                            setFormValues(prev => ({
                              ...prev,
                              colors: [...prev.colors, newColor]
                            }));
                            // Set the new color as active
                            setActiveColorIndex(formValues.colors.length);
                          }}
                          onRemoveColor={(index) => removeColor(index)}
                          minColors={1}
                          step={5} // Use 5% step for better precision
                          marks={[0, 25, 50, 75, 100]} // Add marks at quarter positions
                          tooltip={true}
                          label="Color Positions"
                        />
                      )}
                    </div>
                    
                    <div className={styles.colorForm}>
                      <div className={styles.colorPickerRow}>
                        <ColorPicker
                          label="Active Color"
                          id="color-picker"
                          name="color"
                          color={activeColorIndex >= 0 && activeColorIndex < formValues.colors.length
                            ? formValues.colors[activeColorIndex].color
                            : colorValues.color}
                          onChange={handleColorChange}
                        />
                      </div>
                      <div className={styles.colorHelpText}>
                        <FaInfoCircle className={styles.infoIcon} />
                        <span>Click on the slider to add a new color stop. Right-click on a color stop to remove it.</span>
                      </div>
                    </div>
                    
                    {formValues.colors.length > 0 && (
                      <div className={styles.colorsList}>
                        <h4 className={styles.colorsListTitle}>
                          {formValues.colors.length} Color{formValues.colors.length !== 1 ? 's' : ''} Added
                        </h4>
                        <div className={styles.colorsGrid}>
                          {formValues.colors.map((colorData, index) => (
                            <div 
                              key={index} 
                              className={`${styles.colorItem} ${activeColorIndex === index ? styles.activeColorItem : ''}`}
                              onClick={() => handleColorSelect(index)}
                            >
                              <div 
                                className={styles.colorSwatch} 
                                style={{ backgroundColor: colorData.color }}
                              ></div>
                              <div className={styles.colorItemContent}>
                                <span className={styles.colorItemValue}>{colorData.color}</span>
                                {formValues.gradientType !== 'none' && (
                                  <span className={styles.colorItemPosition}>{colorData.position}%</span>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant='delete'
                                size='small'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeColor(index);
                                }}
                                aria-label="Remove color"
                                disabled={formValues.colors.length <= 1}
                              >
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  

                  {/* Perks Section */}
                  <div className={styles.perksSection}>
                    <h3 className={styles.subsectionTitle}>Perks</h3>
                    
                    <div className={styles.perkForm}>
                      <div className={styles.formRow}>
                        <Input
                          label="Perk Name"
                          id="perk-name"
                          name="name"
                          value={perkValues.name}
                          onChange={handlePerkInputChange}
                          placeholder="e.g. 5 Sethomes"
                        />
                        
                        <IconSelector
                          label="Perk Icon"
                          selectedIcon={perkValues.icon}
                          onChange={(iconName) => setPerkValues(prev => ({ ...prev, icon: iconName }))}
                        />
                      </div>
                      
                      <TextArea
                        label="Tooltip"
                        id="perk-tooltip"
                        name="tooltip"
                        value={perkValues.tooltip}
                        onChange={handlePerkInputChange}
                        placeholder="Brief description of this perk"
                        rows={2}
                      />
                      
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={addPerk}
                        className={styles.addPerkButton}
                      >
                        <FaPlus /> Add Perk
                      </Button>
                    </div>
                    
                    {formValues.perks.length > 0 && (
                      <div className={styles.perksList}>
                        <h4 className={styles.perksListTitle}>Added Perks</h4>
                        {formValues.perks.map((perk, index) => (
                          <div key={index} className={styles.perkItem}>
                            <div className={styles.perkItemIcon}>
                              {renderDynamicIcon(perk.icon)}
                            </div>
                            <div className={styles.perkItemContent}>
                              <span className={styles.perkItemName}>{perk.name}</span>
                              <span className={styles.perkItemTooltip}>{perk.tooltip}</span>
                            </div>
                            <Button
                              type="button"
                              variant="delete"
                              size="small"
                              onClick={() => removePerk(index)}
                              aria-label="Remove perk"
                            >
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Toggles Section */}
                  <div className={styles.togglesContainer}>
                    <Toggle
                      label="Mark as Exclusive Rank"
                      isEnabled={formValues.is_exclusive}
                      onChange={() => handleToggleChange('is_exclusive')}
                      enabledIcon={<FaCrown />}
                    />
                    
                    <Toggle
                      label="Mark as New Rank"
                      isEnabled={formValues.is_new}
                      onChange={() => handleToggleChange('is_new')}
                      enabledIcon={<FaBolt />}
                    />
                    
                    <Toggle
                      label="Mark as Popular Rank"
                      isEnabled={formValues.is_popular}
                      onChange={() => handleToggleChange('is_popular')}
                      enabledIcon={<FaFireAlt />}
                    />
                    
                    <Toggle
                      label="Mark as Upgrade"
                      isEnabled={formValues.is_upgrade}
                      onChange={() => handleToggleChange('is_upgrade')}
                      enabledIcon={<FaArrowUp />}
                    />
                  </div>

                  {/* Form Actions */}
                  <div className={styles.formActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        resetForm();
                        setShowCreateForm(false);
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                      
                    <Button 
                      type="submit"
                      variant="primary" 
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <FaSpinner className={styles.spinner} />
                          Saving...
                        </>
                      ) : 'Update Rank'}
                    </Button>
                  </div>
                </form>
            ) : (
              <>
                {ranksLists.length > 0 ? (
                  <>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionSubtitle}>
                        Drag and drop ranks to reorder or change categories
                      </h3>
                      {hasUnsavedChanges && (
                        <Button
                          variant="primary"
                          onClick={saveRanksOrder}
                          disabled={isSavingRankOrder}
                        >
                          {isSavingRankOrder ? 'Saving...' : 'Save Order'}
                        </Button>
                      )}
                    </div>
                    <div className={styles.ranksListWrapper}>
      <DraggableList
                        lists={ranksLists}
                        onListsChange={handleRanksListsChange}
                        onDragBetweenLists={handleRankCategoryChange}
                        mode="multi"
                        className={styles.ranksListContainer}
                      />
                    </div>
                  </>
                ) : (
                  <div className={styles.noContent}>
                    No ranks found. Create some ranks first.
                  </div>
                )}
              </>
            )}
          </div>
        );
      
      case 'categories':
        return (
          <div className={styles.categoryManager1}>
            <div className={styles.categoryForm}>
              <h2 className={styles.sectionTitle}>
                {editingCategoryId ? 'Edit Category' : 'Create New Category'}
                <div className={styles.categoryContainer}>
                  {editingCategoryId && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setCategoryValues({ name: '', icon: 'FaFolder' });
                        setEditingCategoryId(null);
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSaveCategory}
                    disabled={isSaving || isDeletingCategory}
                  >
                    {isSaving ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Create Category'}
                  </Button>
                </div>
              </h2>
              
              <div className={styles.formRow}>
                <Input
                  label="Category Name"
                  id="category-name"
                  name="name"
                  value={categoryValues.name}
                  onChange={handleCategoryInputChange}
                  placeholder="e.g. Premium Ranks"
                  required
                />
                
                <IconSelector
                  label="Category Icon"
                  selectedIcon={categoryValues.icon}
                  onChange={(iconName) => setCategoryValues(prev => ({ ...prev, icon: iconName }))}
                />
              </div>
            </div>
            
            <div className={styles.categoriesOrderSection}>
              <div className={styles.orderInstructionsBox}>
        <FaInfoCircle className={styles.infoIcon} />
                <p>Drag and drop categories to change their display order.</p>
      </div>

              {categoriesDraggableItems.length > 0 ? (
                <div className={`${styles.categoryOrderList} ${styles.draggableListWrapper}`}>
                  <DraggableList
                    lists={[
                      {
                        id: 'categories',
                        title: 'Categories Order',
                        items: categoriesDraggableItems,
                        canAdd: false,
                        canRemove: false
                      }
                    ]}
                    onListsChange={(newLists) => {
                      const categoriesList = newLists.find(list => list.id === 'categories');
                      if (categoriesList) {
                        setCategoriesDraggableItems(categoriesList.items);
                      }
                    }}
                    mode="single"
                    className={styles.categoriesList}
                  />
      </div>
              ) : (
                <div className={styles.noCategories}>No categories found</div>
              )}
            </div>
          </div>
        );
      
      case 'featured-ranks':
        return (
          <div className={styles.featuredRanksManager}>
            {featuredRanksError ? (
              <div className={styles.errorMessage}>{featuredRanksError}</div>
            ) : (
              <>
                <div className={styles.ranksManager}>
                  <div className={`${styles.featuredRanksManager1} ${styles.managerBox}`}>
                    <div className={styles.categoryListHeader}>
                      <div className={styles.headerActions}>
                        {/* Removing the unused Show Recommended toggle */}
                      </div>
                    </div>
                    <DraggableList
                      lists={[
                        {
                          id: 'available',
                          title: 'Available Ranks',
                          items: availableForFeatured
                            .filter(rank => !selectedRanks.some(sr => sr.id === rank.id))
                            .map(rank => ({
                              id: rank.id,
                              content: createRankContent(rank),
                              data: rank
                            })),
                          canAdd: true,
                          canRemove: false
                        },
                        {
                          id: 'selected',
                          title: 'Featured Ranks',
                          items: selectedRanks.map(rank => ({
                            id: rank.id,
                            content: createRankContent(rank.data),
                            data: rank.data
                          })),
                          canAdd: false,
                          canRemove: true
                        }
                      ]}
                      onListsChange={(newLists) => {
                        const selectedList = newLists.find(list => list.id === 'selected');
                        
                        if (selectedList) {
                          // Convert DraggableItems back to DraggableRankItems
                          const newSelectedRanks = selectedList.items.map((item, index) => ({
                            id: item.id,
                            data: item.data,
                            order: index
                          }));
                          setSelectedRanks(newSelectedRanks);
                        }
                      }}
                      onDragBetweenLists={(sourceListId, destinationListId, itemId) => {
                        if (sourceListId === 'available' && destinationListId === 'selected') {
                          // Item was added to selected
                          const rank = availableForFeatured.find(r => r.id === itemId);
                          if (rank) {
                            setSelectedRanks(prev => [
                              ...prev, 
                              { 
                                id: rank.id, 
                                data: rank,
                                order: prev.length
                              }
                            ]);
                          }
                        } else if (sourceListId === 'selected' && destinationListId === 'available') {
                          // Item was removed from selected
                          setSelectedRanks(prev => prev.filter(item => item.id !== itemId));
                        }
                      }}
                      mode="dual"
                      className={styles.featuredRanksList}
                    />
                  </div>

                  <div className={styles.actionsPanel}>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={saveFeaturedRanks}
                      disabled={isSavingFeaturedRanks}
                      className={styles.saveButton}
                    >
                      {isSavingFeaturedRanks ? 'Saving...' : 'Save Featured Ranks'}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowPreviewModal(true)}
                      className={styles.previewButton}
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  // Add handleEditRank function if it doesn't exist
  const handleEditRank = (rankId: string) => {
    setEditRankId(rankId);
    loadRankForEdit(rankId);
    setShowEditRankSelector(false);
    setShowCreateForm(true);
    setIsEditingRank(true);
    setActiveTab('edit-rank');
  };

  // Either use existing handleDeleteRank or add it if it doesn't exist
  const handleDeleteRank = async (rankId: string) => {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this rank? This action cannot be undone.')) {
      return;
    }

    try {
      // Check if the rank is featured
      const { data: featuredData } = await supabase
        .from('featured_ranks')
        .select('id')
        .eq('rank_id', rankId);

      // If it's featured, remove it from featured ranks
      if (featuredData && featuredData.length > 0) {
        const { error: featuredError } = await supabase
          .from('featured_ranks')
          .delete()
          .eq('rank_id', rankId);

        if (featuredError) throw featuredError;
      }

      // Delete the rank
      const { error } = await supabase
        .from('shop_items')
        .delete()
        .eq('id', rankId);

      if (error) throw error;

      toast.success('Rank deleted successfully');
      
      // Refresh the ranks list
      fetchShopItems();
      
    } catch (error) {
      console.error('Error deleting rank:', error);
      toast.error('Failed to delete rank');
    }
  };

  // Handle gradient vertical position change
  const handleGradientVerticalPositionChange = (position: number) => {
    setGradientVerticalPosition(position);
    
    // Update the gradient style with the new vertical position
    // This would need to be implemented based on how your gradients are styled
    // For example, you might want to adjust the background-position or gradient angle
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.ranksAdminContainer}>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Ranks Admin</h1>
      </div>
      <p className={styles.pageDescription}>
        Manage ranks, categories, and featured ranks on your server shop.
      </p>

      {/* Tab Navigation */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        orientation="horizontal"
        showContentBackground={true}
        showContainerBackground={true}
        className={styles.adminTabs}
        tabContentClassName={styles.tabContent}
        renderTabContent={renderTabContent}
      />
    </div>
  );
} 