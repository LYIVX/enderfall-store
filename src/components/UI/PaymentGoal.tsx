"use client";

import { useState, useEffect } from 'react';
import { stripe } from '@/lib/stripe';
import Box from './Box';
import styles from './PaymentGoal.module.css';
import { FaHourglassHalf, FaMoneyBillWave, FaChartBar } from 'react-icons/fa';
import NineSliceContainer from './NineSliceContainer';
import ScrollbarContainer from './ScrollbarContainer';

type PaymentGoalType = {
  title: string;
  description: string | null;
  goal_amount: number;
  current_amount: number;
};

const PaymentGoal = () => {
  const [goal, setGoal] = useState<PaymentGoalType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMonthlyIncome = async () => {
      try {
        // Get the current date range for this month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Convert to Unix timestamps for Stripe API
        const startTimestamp = Math.floor(firstDay.getTime() / 1000);
        const endTimestamp = Math.floor(lastDay.getTime() / 1000);
        
        // Make a server-side API call to get Stripe data
        const response = await fetch('/api/stripe/monthly-income', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start: startTimestamp,
            end: endTimestamp,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch payment data');
        }
        
        const data = await response.json();
        
        // Set the goal with fixed target of £50
        setGoal({
          title: "Monthly Server Funding",
          description: "Help us keep the server running by contributing to our monthly target.",
          goal_amount: 50, // £50 target as requested
          current_amount: data.totalAmount || 0,
        });
        
      } catch (error) {
        console.error('Error fetching monthly income:', error);
        // Set a default goal with £0 progress in case of error
        setGoal({
          title: "Monthly Server Funding",
          description: "Help us keep the server running by contributing to our monthly target.",
          goal_amount: 50,
          current_amount: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMonthlyIncome();
  }, []);

  const calculatePercentage = () => {
    if (!goal) return 0;
    const percentage = (goal.current_amount / goal.goal_amount) * 100;
    return Math.min(percentage, 100);
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  return (
    <NineSliceContainer className={styles.goalSection} variant="blue">
      <NineSliceContainer className={styles.sectionHeader} variant="standard">
        <h2 className={styles.sectionTitle}>Server Payment Goal</h2>
      </NineSliceContainer>

      <NineSliceContainer className={styles.goalBox} variant="standard">
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.goalIcon}>
              <FaHourglassHalf size={40} />
            </div>
            <h3 className={styles.goalTitle}>Loading Goal...</h3>
            <p className={styles.goalDescription}>Retrieving funding information</p>
          </div>
        ) : goal ? (
          <div className={styles.goalContent}>
            <div className={styles.goalIcon}>
              <FaMoneyBillWave size={40} />
            </div>
            <NineSliceContainer className={styles.goalTitle} variant="standard">
              <h3 >{goal.title}</h3>
            </NineSliceContainer>
            {goal.description && <p className={styles.goalDescription}>{goal.description}</p>}

            <div className={styles.progressWrapper}>
              <ScrollbarContainer 
                className={styles.progressContainer} 
                variant="horizontal-background"
                fullWidth
              >
                <ScrollbarContainer 
                  className={styles.progressBar}
                  variant="horizontal-handle"
                  style={{ 
                    width: calculatePercentage() === 0 
                      ? '0%' 
                      : `calc(${calculatePercentage()}% + ${16 * (calculatePercentage()/100)}px)` 
                  }}
                />
              </ScrollbarContainer>
            </div>
            
            <div className={styles.percentageText}>
              {calculatePercentage().toFixed(0)}% Complete
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.goalIcon}>
              <FaChartBar size={40} />
            </div>
            <h3 className={styles.goalTitle}>No Goal Set</h3>
            <p className={styles.goalDescription}>
              No current payment goal is available
            </p>
          </div>
        )}
      </NineSliceContainer>
    </NineSliceContainer>
  );
};

export default PaymentGoal; 