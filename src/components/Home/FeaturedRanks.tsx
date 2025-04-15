"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, ShopItem, ShopItemPerk } from '@/lib/supabase';
import Box from '@/components/UI/Box';
import styles from './FeaturedRanks.module.css';
import { FaHourglassHalf, FaStar, FaSearch, FaCrown, FaBolt, FaFireAlt } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import { Button, NineSliceContainer } from '../UI';

// Define supported gradient types
type GradientType = 'linear' | 'radial' | 'none';

// Define color object structure
interface ColorData {
  color: string;
  position?: number; // 0-100 percentage for gradient position
}

interface FeaturedRank {
  id: string;
  rank_id: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  shop_items?: ShopItem;
}

interface FeaturedRanksProps {
  previewMode?: boolean;
  previewItems?: ShopItem[];
}

// Generate CSS for a color or gradient based on colors array and gradient type
const generateColorStyle = (colors: ColorData[], gradientType: GradientType): string => {
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
    return `linear-gradient(to right, ${colorStops})`;
  } else if (gradientType === 'radial') {
    const colorStops = sortedColors.map(c => 
      `${c.color} ${c.position !== undefined ? c.position + '%' : ''}`
    ).join(', ');
    return `radial-gradient(circle, ${colorStops})`;
  }
  
  return colors[0].color; // Fallback
};

// Helper function to parse color data from shop item
const parseColorData = (item: ShopItem): { colors: ColorData[], gradientType: GradientType } => {
  // If the item has a color field that's a JSON string, try to parse it
  if (item.color && typeof item.color === 'string') {
    try {
      if (item.color.startsWith('{')) {
        // It's a JSON object with our new format
        const parsed = JSON.parse(item.color);
        return {
          colors: parsed.colors || [{ color: parsed.color || '#6366F1', position: 0 }],
          gradientType: parsed.gradientType || 'none'
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
  return generateColorStyle(colors, gradientType);
};

const FeaturedRanks = ({ previewMode = false, previewItems = [] }: FeaturedRanksProps) => {
  const router = useRouter();
  const [featuredRanks, setFeaturedRanks] = useState<ShopItem[]>([]);
  const [currentRankIndex, setCurrentRankIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(!previewMode);

  useEffect(() => {
    // If in preview mode, use the provided previewItems
    if (previewMode && previewItems.length > 0) {
      setFeaturedRanks(previewItems);
      setIsLoading(false);
      return;
    }

    const fetchFeaturedRanks = async () => {
      try {
        // First try to get ranks from the featured_ranks table
        const { data: featuredData, error: featuredError } = await supabase
          .from('featured_ranks')
          .select('*, shop_items(*)')
          .order('display_order', { ascending: true });

        if (featuredError) throw featuredError;
        
        if (featuredData && featuredData.length > 0) {
          // Extract shop items from the featured ranks
          const shopItems = featuredData
            .filter(item => item.shop_items)
            .map(item => item.shop_items as ShopItem);
          
          setFeaturedRanks(shopItems);
        } else {
          // Fallback: Fetch top 3 serverwide ranks if no featured ranks are set
          const { data, error } = await supabase
            .from('shop_items')
            .select('*')
            .eq('category', 'Serverwide Ranks')
            .order('price', { ascending: false })
            .limit(3);

          if (error) throw error;
          
          setFeaturedRanks(data || []);
        }
      } catch (error) {
        console.error('Error fetching featured ranks:', error);
        // Instead of using placeholder data, just set an empty array
        setFeaturedRanks([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if not in preview mode
    if (!previewMode) {
      fetchFeaturedRanks();
    }

    // Auto-rotate featured ranks every 5 seconds
    const interval = setInterval(() => {
      setCurrentRankIndex((prevIndex) => 
        prevIndex === featuredRanks.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredRanks.length, previewMode, previewItems]);

  const goToRank = (index: number) => {
    setCurrentRankIndex(index);
  };

  const currentRank = featuredRanks[currentRankIndex];

  // Helper function to dynamically get icon component from name
  const getIconComponent = (iconName: string) => {
    const IconComponent = FaIcons[iconName as keyof typeof FaIcons] || FaStar;
    return <IconComponent />;
  };

  // Extract the first 3 perks from the rank
  const getDisplayPerks = (rank: ShopItem) => {
    if (!rank.perks || !Array.isArray(rank.perks)) return [];
    return rank.perks.slice(0, 3);
  };

  return (
    <NineSliceContainer className={styles.featuredSection} variant="blue">
      <NineSliceContainer className={styles.sectionHeader} variant="standard">
        <h2 className={styles.sectionTitle}>Featured Ranks</h2>
      </NineSliceContainer>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.featuredIcon}>
                <FaHourglassHalf size={40} />
              </div>
              <h3 className={styles.featuredTitle}>Loading Ranks...</h3>
              <p className={styles.featuredDescription}>Please wait while we fetch the latest ranks</p>
            </div>
          ) : featuredRanks.length > 0 && currentRank ? (
            <div className={styles.rankContent}>
              <NineSliceContainer className={styles.rankContainer} variant="standard">
                <div className={styles.badgeContainer}>
                  {currentRank.is_exclusive && (
                    <NineSliceContainer className={styles.exclusiveBadge} variant="warning">
                      <FaCrown /> Exclusive
                    </NineSliceContainer>
                  )}
                  {currentRank.is_new && (
                    <NineSliceContainer className={styles.newBadge} variant="info">
                      <FaBolt /> New
                    </NineSliceContainer>
                  )}
                  {currentRank.is_popular && (
                    <NineSliceContainer className={styles.popularBadge} variant="danger">
                      <FaFireAlt /> Popular
                    </NineSliceContainer>
                  )}
                </div>
                <NineSliceContainer className={styles.rankContent} variant="standard">
                  <div 
                    className={styles.featuredIcon} 
                    style={{ color: getRankDisplayColor(currentRank) }}
                >
                  {currentRank.icon ? getIconComponent(currentRank.icon) : <FaStar size={40} />}
                </div>
                <h3 className={styles.featuredTitle}>{currentRank.name}</h3>
                <div className={styles.featuredPrice}>
                  £{currentRank.price.toFixed(2)}
                </div>
                <p className={styles.featuredDescription}>
                  {currentRank.description.split('.')[0]}.
                </p>
                
                {currentRank.perks && currentRank.perks.length > 0 && (
                  <div className={styles.featuredPerks}>
                    {getDisplayPerks(currentRank).map((perk, idx) => (
                      <NineSliceContainer key={idx} className={styles.perk} variant="standard">
                        <span className={styles.perkIcon}>
                          {getIconComponent(perk.icon)}
                        </span>
                        <span className={styles.perkName}>{perk.name}</span>
                      </NineSliceContainer>
                    ))}
                  </div>
                )}
                </NineSliceContainer>
              </NineSliceContainer>
                
            </div>
            
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.featuredIcon}>
                <FaSearch size={40} />
              </div>
              <h3 className={styles.featuredTitle}>No Featured Ranks</h3>
              <p className={styles.featuredDescription}>
                There are no featured ranks at the moment. Check back later!
              </p>
            </div>
          )}
          <NineSliceContainer className={styles.footerContainer} variant="standard">
          <div className={styles.carouselContainer}>
                  {featuredRanks.map((_, index) => {
                    const dotColor = index === currentRankIndex 
                      ? getRankDisplayColor(currentRank)
                      : undefined;
                    
                    return (
                      <button
                        key={index}
                        className={`${styles.dot} ${index === currentRankIndex ? styles.activeDot : ''}`}
                        onClick={() => goToRank(index)}
                        aria-label={`View rank ${index + 1}`}
                        style={index === currentRankIndex ? { backgroundColor: dotColor, borderColor: dotColor } : {}}
                      ></button>
                    );
                  })}
                </div>
                
                <Button 
                  variant="info"
                  size="medium"
                  nineSlice={true}
                  className={styles.featuredCta}
                  onClick={() => router.push(`/shop${currentRank.category ? `#${currentRank.category.toLowerCase().replace(/\s+/g, '-')}` : ''}`)} 
                >
                  View Details
                </Button>
          </NineSliceContainer>

    </NineSliceContainer>
  );
};

export default FeaturedRanks; 