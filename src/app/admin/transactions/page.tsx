"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from '../admin.module.css';
import Dropdown from '@/components/UI/Dropdown';
import Button from '@/components/UI/Button';
import { Loading } from '@/components/UI';
import { FaEye, FaInfo } from 'react-icons/fa';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';

interface Transaction {
  id: string;
  user_id: string | null;
  email?: string | null;
  transaction_id: string | null;
  amount: number;
  currency: string;
  payment_status?: string;
  created_at: string;
  purchase_date?: string;
  item_id?: string;
  items?: Array<{
    price_id: string;
    amount: number;
    currency: string;
    quantity: number;
    rank_name: string;
  }>;
  user?: {
    username: string;
    email?: string;
    avatar_url?: string;
  } | null;
  item?: {
    name: string;
    price: number;
    category: string;
  } | null;
  metadata?: Record<string, any>;
  source: 'stripe' | 'database';
  detailsLoaded?: boolean;
}

type SortField = 'created_at' | 'amount' | 'status' | 'user' | 'item' | 'transaction_id' | 'source';
type SortDirection = 'asc' | 'desc';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'recent', 'this-year', 'this-month', 'this-week'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [thisYearRevenue, setThisYearRevenue] = useState(0);
  const [thisMonthRevenue, setThisMonthRevenue] = useState(0);
  const [thisWeekRevenue, setThisWeekRevenue] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const [changingPage, setChangingPage] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Observer for lazy loading transaction details when they become visible
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedRows = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    fetchTransactions();
    fetchRevenueData();
  }, [timeFilter, categoryFilter]);
  
  useEffect(() => {
    fetchTransactions();
  }, [pagination.page, sortField, sortDirection]);
  
  // Set up intersection observer for lazy loading transaction details
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const transactionId = entry.target.getAttribute('data-id');
          if (transactionId) {
            loadTransactionDetails(transactionId);
          }
        }
      });
    }, { threshold: 0.1 });
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
  
  // Observe new transaction rows when they're rendered
  useEffect(() => {
    if (observerRef.current) {
      // First disconnect all currently observed elements
      observerRef.current.disconnect();
      observedRows.current.clear();
      
      // Then observe all transaction rows that don't have details loaded
      setTimeout(() => {
        document.querySelectorAll('tr[data-id]').forEach(row => {
          const id = row.getAttribute('data-id');
          if (id && !observedRows.current.has(id)) {
            observerRef.current?.observe(row);
            observedRows.current.set(id, true);
          }
        });
      }, 100);
    }
  }, [transactions]);
  
  // Load individual transaction details for a specific transaction
  const loadTransactionDetails = useCallback(async (transactionId: string) => {
    // Check if this transaction already has details loaded
    const transactionIndex = transactions.findIndex(t => t.id + t.source === transactionId);
    if (transactionIndex === -1 || transactions[transactionIndex].detailsLoaded) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/transaction?id=${transactionId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction details: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update the transaction with full details
      setTransactions(prev => {
        const newTransactions = [...prev];
        newTransactions[transactionIndex] = {
          ...newTransactions[transactionIndex],
          ...data.transaction,
          detailsLoaded: true
        };
        return newTransactions;
      });
      
      // Stop observing this row
      const row = document.querySelector(`tr[data-id="${transactionId}"]`);
      if (row && observerRef.current) {
        observerRef.current.unobserve(row);
      }
    } catch (error) {
      console.error('Error loading transaction details:', error);
    }
  }, [transactions]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // If clicking on the same field, toggle direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking on a new field, set it as the sort field with default 'desc'
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Render sort indicator arrow
  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) return null;
    
    return (
      <span className={styles.sortArrow}>
        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
      </span>
    );
  };

  // Function to fetch just the revenue data (separate from the transactions)
  async function fetchRevenueData() {
    setLoadingRevenue(true);
    try {
      // Prepare query parameters for the API call
      const params = new URLSearchParams();
      
      // Handle time period filters
      if (timeFilter === 'recent') {
        params.append('timeframe', 'recent');
      } else if (timeFilter === 'this-year') {
        params.append('timeframe', 'this-year');
      } else if (timeFilter === 'this-month') {
        params.append('timeframe', 'this-month');
      } else if (timeFilter === 'this-week') {
        params.append('timeframe', 'this-week');
      }
      
      // Handle category filter
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      // Fetch revenue data from our API endpoint
      const response = await fetch(`/api/admin/revenue?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set revenue data
      setTotalRevenue(data.totalRevenue || 0);
      setThisYearRevenue(data.yearRevenue || 0);
      setThisMonthRevenue(data.monthRevenue || 0);
      setThisWeekRevenue(data.weekRevenue || 0);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoadingRevenue(false);
    }
  }

  async function fetchTransactions() {
    setLoading(true);
    try {
      // Prepare query parameters for the API call
      const params = new URLSearchParams();
      
      // Handle time period filters
      if (timeFilter === 'recent') {
        params.append('timeframe', 'recent');
      } else if (timeFilter === 'this-year') {
        params.append('timeframe', 'this-year');
      } else if (timeFilter === 'this-month') {
        params.append('timeframe', 'this-month');
      } else if (timeFilter === 'this-week') {
        params.append('timeframe', 'this-week');
      }
      
      // Handle category filter
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      // Add pagination parameters
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      // Add sorting parameters
      params.append('sortField', sortField);
      params.append('sortDirection', sortDirection);
      
      // Fetch transactions from our API endpoint (now with server-side pagination)
      const response = await fetch(`/api/admin/transactions?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Get category list from the API - if available
      if (data.categories) {
        setCategories(data.categories);
      }
      
      // Set transactions directly from the API
      setTransactions(data.transactions.map((tx: Transaction) => ({
        ...tx,
        detailsLoaded: false // Mark as not loaded so we can lazy load details
      })));
      
      // Update pagination info from API response
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setChangingPage(false); // Ensure changing page state is reset after fetch
    }
  }

  // Function to navigate to next/previous pages
  function goToPage(page: number) {
    if (page >= 1 && page <= pagination.pages) {
      setChangingPage(true);
      setPagination(prev => ({ ...prev, page }));
      // The fetchTransactions will be triggered by the effect that watches pagination.page
    }
  }

  // Format metadata for display
  function formatMetadata(metadata?: Record<string, any>): string {
    if (!metadata || Object.keys(metadata).length === 0) {
      return 'None';
    }
    
    try {
      // Format each key-value pair
      const formattedPairs = Object.entries(metadata)
        .filter(([key]) => key !== 'cartItems') // Skip cart items which might be too long
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
        
      return formattedPairs || 'None';
    } catch (error) {
      return 'Error parsing metadata';
    }
  }
  
  // Format item name for better readability
  function formatItemName(name: string): string {
    if (!name) return 'Unknown Item';
    
    // Replace underscores and hyphens with spaces
    const spacedName = name.replace(/[_-]/g, ' ');
    
    // Capitalize each word
    return spacedName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Display username with proper formatting
  function formatUsername(transaction: Transaction): JSX.Element {
    // If we have user data with a username
    if (transaction.user?.username) {
      return (
        <div className={styles.userWrapper}>
          {transaction.user.avatar_url ? (
            <AvatarWithStatus
              userId={transaction.user_id || 'transaction-user'}
              avatarUrl={transaction.user.avatar_url}
              username={transaction.user.username}
              size="small"
              className={styles.userAvatar}
            />
          ) : (
            <div className={styles.userAvatarPlaceholder}>
              {transaction.user.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              <span className={styles.badgeInfo}>{formatItemName(transaction.user.username)}</span>
            </div>
          </div>
        </div>
      );
    }
    
    // Fallback to email
    return (
      <div className={styles.userWrapper}>
        <div className={styles.userAvatarPlaceholder}>
          ?
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>Unknown User</div>
        </div>
      </div>
    );
  }

  // Render all item names for a transaction
  function renderItemNames(transaction: Transaction): JSX.Element {
    if (transaction.source === 'stripe' && transaction.items && transaction.items.length > 0) {
      return (
        <div>
          <ul className={styles.itemList}>
            {transaction.items.map((item, index) => (
              <li key={index} className={styles.itemListItem}>
                {formatItemName(item.rank_name) || 'Unknown Item'}
              </li>
            ))}
          </ul>
        </div>
      );
    } else {
      return (
        <div>
          {formatItemName(transaction.item?.name || '') || 'Unknown Item'}
        </div>
      );
    }
  }
  
  // Format date and time
  function formatDateTime(dateString: string): JSX.Element {
    const date = new Date(dateString);
    return (
      <div>
        <div>{date.toLocaleDateString()}</div>
        <div className={styles.itemDetail}>{date.toLocaleTimeString()}</div>
      </div>
    );
  }

  if (loading && transactions.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Loading type="fullscreen" text="Loading transactions..." />
      </div>
    );
  }

  return (
    <div className={styles.contentWrapper}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Transaction History</h2>
        <div className={styles.headerFilters}>
          <div className={styles.filterWrapper}>
            <Dropdown
              label="Time Period"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'this-week', label: 'This Week' },
                { value: 'this-month', label: 'This Month' },
                { value: 'this-year', label: 'This Year' },
                { value: 'recent', label: 'Recent (30 days)' }
              ]}
              layout="horizontal"
            />
          </div>
          <div className={styles.filterWrapper}>
            <Dropdown
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map(category => ({
                  value: category,
                  label: formatItemName(category)
                }))
              ]}
              layout="horizontal"
            />
          </div>
        </div>
      </div>

      {(loading || loadingRevenue) && (
        <Loading type="overlay" text="Loading..." withOverlay={true} />
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>All Time Revenue</h3>
          <div className={styles.statValue}>${totalRevenue.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <h3>This Year</h3>
          <div className={styles.statValue}>${thisYearRevenue.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <h3>This Month</h3>
          <div className={styles.statValue}>${thisMonthRevenue.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <h3>This Week</h3>
          <div className={styles.statValue}>${thisWeekRevenue.toFixed(2)}</div>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th 
              className={`${styles.colUser} ${styles.sortableHeader}`}
              onClick={() => handleSort('user')}
            >
              User {renderSortArrow('user')}
            </th>
            <th 
              className={`${styles.colItem} ${styles.sortableHeader}`}
              onClick={() => handleSort('item')}
            >
              Item {renderSortArrow('item')}
            </th>
            <th 
              className={`${styles.colAmount} ${styles.sortableHeader}`}
              onClick={() => handleSort('amount')}
            >
              Amount {renderSortArrow('amount')}
            </th>
            <th 
              className={`${styles.colDate} ${styles.sortableHeader}`}
              onClick={() => handleSort('created_at')}
            >
              Date/Time {renderSortArrow('created_at')}
            </th>
            <th 
              className={`${styles.colStatus} ${styles.sortableHeader}`}
              onClick={() => handleSort('status')}
            >
              Status {renderSortArrow('status')}
            </th>
            <th 
              className={`${styles.colTransactionId} ${styles.sortableHeader}`}
              onClick={() => handleSort('transaction_id')}
            >
              Transaction ID {renderSortArrow('transaction_id')}
            </th>
            <th 
              className={`${styles.colSource} ${styles.sortableHeader}`}
              onClick={() => handleSort('source')}
            >
              Source {renderSortArrow('source')}
            </th>
            <th 
              className={`${styles.colActions} ${styles.sortableHeader}`}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr 
              key={transaction.id + transaction.source} 
              data-id={transaction.id + transaction.source}
            >
              <td className={styles.colUser}>
                {formatUsername(transaction)}
              </td>
              <td className={styles.colItem}>
                {renderItemNames(transaction)}
              </td>
              <td className={styles.colAmount}>
                {transaction.currency 
                  ? `${transaction.currency.toUpperCase()} ${transaction.amount?.toFixed(2) || 0}`
                  : `$${transaction.item?.price?.toFixed(2) || transaction.amount?.toFixed(2) || '0.00'}`
                }
              </td>
              <td className={styles.colDate}>
                {formatDateTime(transaction.created_at || transaction.purchase_date || '')}
              </td>
              <td className={styles.colStatus}>
                <span className={
                  transaction.payment_status === 'paid' || transaction.payment_status === 'completed' 
                    ? styles.badgeSuccess 
                    : styles.badgeWarning
                }>
                  {transaction.payment_status || 'Completed'}
                </span>
              </td>
              <td className={styles.colTransactionId}>
                {transaction.transaction_id || 'N/A'}
              </td>
              <td className={styles.colSource}>
                <span className={
                  transaction.source === 'stripe' 
                    ? styles.badgeSuccess 
                    : styles.badgeInfo
                }>
                  {transaction.source === 'stripe' ? 'Stripe' : 'Database'}
                </span>
              </td>
              <td className={styles.colActions}>
                <div className={styles.postActions}>
                  <Button
                    variant="view"
                    size="small"
                    className={`${styles.actionButton} ${styles.viewButton}`}
                    onClick={() => {
                      if (transaction.transaction_id) {
                        window.open(`/admin/transactions/details/${transaction.transaction_id}`, '_blank');
                      }
                    }}
                  >
                  </Button>
                  <Button
                    variant="info"
                    size="small"
                    className={`${styles.actionButton} ${styles.infoButton}`}
                    onClick={() => {
                      loadTransactionDetails(transaction.id + transaction.source);
                    }}
                  >
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center' }}>No transactions found</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination controls */}
      {pagination.pages > 1 && (
        <div className={styles.paginationControls}>
          <Button
            variant="secondary"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || changingPage}
          >
            Previous
          </Button>
          <span className={styles.paginationInfo}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="secondary"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages || changingPage}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
} 