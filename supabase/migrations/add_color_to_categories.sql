 -- Add a color column to the categories table
ALTER TABLE categories ADD COLUMN color TEXT DEFAULT '#6366F1';

-- Update existing categories with default colors
UPDATE categories SET color = '#9D4EDD' WHERE name = 'Serverwide Ranks';
UPDATE categories SET color = '#3A0CA3' WHERE name = 'Serverwide Upgrades';
UPDATE categories SET color = '#4CAF50' WHERE name = 'Towny Ranks';
UPDATE categories SET color = '#43AA8B' WHERE name = 'Towny Upgrades';
UPDATE categories SET color = '#2196f3' WHERE name = 'Beta Access';
UPDATE categories SET color = '#E91E63' WHERE name = 'Cosmetics';
UPDATE categories SET color = '#FFC107' WHERE name = 'Perks';
UPDATE categories SET color = '#607D8B' WHERE name = 'Bundles'; 