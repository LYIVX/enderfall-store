-- Create an enum for the item categories
CREATE TYPE shop_item_category AS ENUM (
  'Serverwide Ranks',
  'Towny Ranks',
  'Beta Access',
  'Cosmetics',
  'Perks',
  'Bundles'
);

-- Create the shop_items table
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category shop_item_category NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  price_id TEXT, -- For payment providers like Stripe
  image_url TEXT,
  icon TEXT, -- Icon name/code
  color TEXT, -- Primary color (hex code)
  color2 TEXT, -- Secondary color for gradients (hex code), optional
  perks JSONB, -- Array of perks with icons and tooltips
  is_featured BOOLEAN DEFAULT FALSE,
  is_popular BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_exclusive BOOLEAN DEFAULT FALSE, -- Flag for exclusive ranks
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on category for faster filtering
CREATE INDEX shop_items_category_idx ON shop_items (category);

-- Sample data for Serverwide Ranks
INSERT INTO shop_items (name, category, description, price, icon, color, color2, perks, is_exclusive) VALUES
(
  'Shadow Enchanter',
  'Serverwide Ranks',
  'The first rank in our serverwide progression. Includes 2 sethomes, basic claim abilities, and access to colored chat.',
  9.99,
  'FaStar',
  '#9D4EDD',
  NULL,
  '[
    {"name": "2 sethomes", "icon": "FaHome", "tooltip": "Set up to 2 home locations that you can teleport to at any time."},
    {"name": "Basic claim abilities", "icon": "FaShieldAlt", "tooltip": "Protect your creations with additional claim blocks."},
    {"name": "Colored chat", "icon": "FaComments", "tooltip": "Express yourself with vibrant colored text in chat."}
  ]'::jsonb,
  FALSE
),
(
  'Void Walker',
  'Serverwide Ranks',
  'The second tier of our serverwide ranks. Includes 5 sethomes, enhanced claim protection, and access to special server areas.',
  19.99,
  'FaLock',
  '#3A0CA3',
  NULL,
  '[
    {"name": "5 sethomes", "icon": "FaHome", "tooltip": "Set up to 5 home locations that you can teleport to at any time."},
    {"name": "Enhanced claim protection", "icon": "FaShieldAlt", "tooltip": "Protect larger areas with more claim blocks and advanced protection features."},
    {"name": "Special area access", "icon": "FaDoorOpen", "tooltip": "Access exclusive areas that are off-limits to lower ranks."},
    {"name": "Chat prefix", "icon": "FaHashtag", "tooltip": "The exclusive Void Walker prefix appears before your name in chat."}
  ]'::jsonb,
  FALSE
),
(
  'Ethereal Warden',
  'Serverwide Ranks',
  'The third tier of our serverwide ranks. Includes 10 sethomes, fly ability, advanced protection, and economy boosts.',
  29.99,
  'FaMountain',
  '#7209B7',
  NULL,
  '[
    {"name": "10 sethomes", "icon": "FaHome", "tooltip": "Set up to 10 home locations that you can teleport to at any time."},
    {"name": "Fly ability", "icon": "FaFeather", "tooltip": "Access to the /fly command allows you to soar through the air freely."},
    {"name": "Advanced protection", "icon": "FaShieldAlt", "tooltip": "Protect even larger areas with more claim blocks and advanced protection features."},
    {"name": "Economy boosts", "icon": "FaCoins", "tooltip": "Enjoy economic advantages that help you amass wealth more quickly."},
    {"name": "Exclusive chat prefix", "icon": "FaHashtag", "tooltip": "The exclusive Ethereal Warden prefix appears before your name in chat."}
  ]'::jsonb,
  FALSE
),
(
  'Astral Guardian',
  'Serverwide Ranks',
  'Our premium serverwide rank. Includes unlimited sethomes, all protection features, economy perks, and exclusive cosmetics.',
  39.99,
  'FaRocket',
  '#4361EE',
  NULL,
  '[
    {"name": "Unlimited sethomes", "icon": "FaHome", "tooltip": "Set an unlimited number of home locations that you can teleport to at any time."},
    {"name": "All protection features", "icon": "FaShieldAlt", "tooltip": "Access all protection features including advanced claim flags and options."},
    {"name": "Premium economy perks", "icon": "FaCoins", "tooltip": "Receive the highest economic advantages, discounts, and money-making opportunities."},
    {"name": "Exclusive cosmetics", "icon": "FaPalette", "tooltip": "Access to exclusive particle effects, titles, and visual enhancements."},
    {"name": "Priority server access", "icon": "FaKey", "tooltip": "Join the server even when it is full and receive priority support."},
    {"name": "Exclusive chat prefix", "icon": "FaHashtag", "tooltip": "The exclusive Astral Guardian prefix appears before your name in chat."}
  ]'::jsonb,
  TRUE
);

-- Add additional Serverwide Ranks
INSERT INTO shop_items (name, category, description, price, icon, color, color2, perks, is_exclusive) VALUES
(
  'Celestial Emperor',
  'Serverwide Ranks',
  'The ultimate serverwide rank. Includes all benefits of previous ranks plus exclusive server-wide commands and custom titles.',
  59.99,
  'FaCrown',
  '#FF6D00',
  '#FF9E40',
  '[
    {"name": "All previous rank perks", "icon": "FaCheck", "tooltip": "Includes all benefits from previous ranks."},
    {"name": "Custom title system", "icon": "FaTag", "tooltip": "Create and use custom titles that appear in chat and on the server."},
    {"name": "Advanced teleportation", "icon": "FaBolt", "tooltip": "Access to advanced teleportation commands including /tpa and /back."},
    {"name": "Economy multipliers", "icon": "FaMoneyBillWave", "tooltip": "Receive multipliers on all server economy activities."},
    {"name": "Particle effects", "icon": "FaMagic", "tooltip": "Unlock custom particle effects that follow your character."},
    {"name": "Developer access", "icon": "FaCode", "tooltip": "Get direct access to our development team for suggestions."}
  ]'::jsonb,
  TRUE
),
(
  'Shadow Upgrade',
  'Serverwide Ranks',
  'Upgrade from Shadow Enchanter to Void Walker. Save compared to buying the rank directly.',
  10.99,
  'FaArrowUp',
  '#9D4EDD',
  '#3A0CA3',
  '[
    {"name": "Upgrade to Void Walker", "icon": "FaArrowUp", "tooltip": "Upgrade your current rank to Void Walker and gain all its benefits."},
    {"name": "Cost savings", "icon": "FaCoins", "tooltip": "Save money compared to purchasing the Void Walker rank directly."}
  ]'::jsonb,
  FALSE
),
(
  'Void Upgrade',
  'Serverwide Ranks',
  'Upgrade from Void Walker to Ethereal Warden. Get all the perks at a discount.',
  14.99,
  'FaArrowUp',
  '#3A0CA3',
  '#7209B7',
  '[
    {"name": "Upgrade to Ethereal Warden", "icon": "FaArrowUp", "tooltip": "Upgrade your current rank to Ethereal Warden and gain all its benefits."},
    {"name": "Cost savings", "icon": "FaCoins", "tooltip": "Save money compared to purchasing the Ethereal Warden rank directly."}
  ]'::jsonb,
  FALSE
),
(
  'Ethereal Upgrade',
  'Serverwide Ranks',
  'Upgrade from Ethereal Warden to Astral Guardian. Final tier upgrade with exclusive features.',
  19.99,
  'FaArrowUp',
  '#7209B7',
  '#4361EE',
  '[
    {"name": "Upgrade to Astral Guardian", "icon": "FaArrowUp", "tooltip": "Upgrade your current rank to Astral Guardian and gain all its benefits."},
    {"name": "Cost savings", "icon": "FaCoins", "tooltip": "Save money compared to purchasing the Astral Guardian rank directly."},
    {"name": "Exclusive features", "icon": "FaStar", "tooltip": "Gain access to exclusive features only available to Astral Guardian and above."}
  ]'::jsonb,
  FALSE
),
(
  'Ultimate Upgrade',
  'Serverwide Ranks',
  'Upgrade from Astral Guardian to Celestial Emperor. Our most premium upgrade package.',
  29.99,
  'FaArrowUp',
  '#4361EE',
  '#FF6D00',
  '[
    {"name": "Upgrade to Celestial Emperor", "icon": "FaArrowUp", "tooltip": "Upgrade your current rank to Celestial Emperor, our most prestigious rank."},
    {"name": "Cost savings", "icon": "FaCoins", "tooltip": "Save money compared to purchasing the Celestial Emperor rank directly."},
    {"name": "All premium features", "icon": "FaCrown", "tooltip": "Gain access to all premium features available on the server."}
  ]'::jsonb,
  TRUE
);

-- Sample data for Towny Ranks
INSERT INTO shop_items (name, category, description, price, icon, color, perks, is_exclusive) VALUES
(
  'Citizen',
  'Towny Ranks',
  'The basic towny rank. Includes town membership perks and basic town-related commands.',
  4.99,
  'FaHome',
  '#4CAF50',
  '[
    {"name": "Town membership", "icon": "FaHome", "tooltip": "Official recognition as a citizen of your town with basic rights."},
    {"name": "Town chat", "icon": "FaComments", "tooltip": "Access to the town chat channel to communicate with fellow citizens."},
    {"name": "Basic town commands", "icon": "FaTools", "tooltip": "Access to essential town-related commands."}
  ]'::jsonb,
  FALSE
),
(
  'Merchant',
  'Towny Ranks',
  'A specialized towny rank for commerce. Includes shop discounts and economy perks.',
  9.99,
  'FaCoins',
  '#43AA8B',
  '[
    {"name": "Shop discounts", "icon": "FaGem", "tooltip": "Receive exclusive discounts on server shops and services."},
    {"name": "Economy perks", "icon": "FaCoins", "tooltip": "Special access to money-making opportunities and financial benefits."},
    {"name": "Extended town plots", "icon": "FaShieldAlt", "tooltip": "Claim additional land within your town for shops and trading."}
  ]'::jsonb,
  FALSE
),
(
  'Mayor',
  'Towny Ranks',
  'The leadership rank for towns. Includes town management abilities and leadership perks.',
  19.99,
  'FaUserTie',
  '#277DA1',
  '[
    {"name": "Town management", "icon": "FaTools", "tooltip": "Full control over town settings, plots, and membership."},
    {"name": "Mayor chat prefix", "icon": "FaHashtag", "tooltip": "Display your Mayor status in your town with this special chat prefix."},
    {"name": "Leadership perks", "icon": "FaCrown", "tooltip": "Special abilities and permissions for managing your settlement."},
    {"name": "Extended town claim", "icon": "FaShieldAlt", "tooltip": "Claim and protect additional land for your town."}
  ]'::jsonb,
  FALSE
),
(
  'Governor',
  'Towny Ranks',
  'Advanced leadership rank with enhanced town management and economy benefits.',
  29.99,
  'FaChess',
  '#184E77',
  '[
    {"name": "Enhanced town management", "icon": "FaTools", "tooltip": "Advanced town management options including taxation and plot permissions."},
    {"name": "Region control", "icon": "FaMap", "tooltip": "Control over multiple towns in a region with special permissions."},
    {"name": "Economic influence", "icon": "FaCoins", "tooltip": "Influence over regional economy with tax benefits and trade options."},
    {"name": "Governor title", "icon": "FaHashtag", "tooltip": "Exclusive Governor title displayed in chat and town interfaces."}
  ]'::jsonb,
  FALSE
),
(
  'Noble',
  'Towny Ranks',
  'Elite town rank with special privileges and enhanced economy features.',
  39.99,
  'FaStar',
  '#F9C74F',
  '[
    {"name": "Noble status", "icon": "FaCrown", "tooltip": "Elite status within the town hierarchy with special permissions."},
    {"name": "Economic privileges", "icon": "FaCoins", "tooltip": "Significant economic advantages and reduced taxation."},
    {"name": "Noble residence", "icon": "FaHome", "tooltip": "Ability to claim larger and more protected personal plots."},
    {"name": "Town influence", "icon": "FaUsers", "tooltip": "Special influence over town decisions and development."}
  ]'::jsonb,
  TRUE
),
(
  'Duke',
  'Towny Ranks',
  'Premium town rank with extensive territory control and command abilities.',
  49.99,
  'FaGem',
  '#F8961E',
  '[
    {"name": "Territory control", "icon": "FaGlobe", "tooltip": "Control over large territories spanning multiple regions."},
    {"name": "Advanced commands", "icon": "FaTerminal", "tooltip": "Access to advanced town-related commands and settings."},
    {"name": "Economic dominance", "icon": "FaMoneyBillWave", "tooltip": "Significant economic influence across all connected towns."},
    {"name": "Duke title", "icon": "FaHashtag", "tooltip": "Prestigious Duke title displayed in all communications."}
  ]'::jsonb,
  TRUE
),
(
  'King',
  'Towny Ranks',
  'The highest towny rank with server-wide influence and elite privileges.',
  69.99,
  'FaCrown',
  '#F3722C',
  '[
    {"name": "Kingdom management", "icon": "FaChessKing", "tooltip": "Create and manage a kingdom spanning multiple towns and regions."},
    {"name": "Royal commands", "icon": "FaScepter", "tooltip": "Access to royal commands that affect all citizens in your kingdom."},
    {"name": "Economic sovereignty", "icon": "FaLandmark", "tooltip": "Create and manage your own economy within your kingdom."},
    {"name": "Royal title", "icon": "FaHashtag", "tooltip": "The prestigious King/Queen title displayed throughout the server."},
    {"name": "Custom kingdom banners", "icon": "FaFlag", "tooltip": "Create custom banners and flags for your kingdom."}
  ]'::jsonb,
  TRUE
),
(
  'Divine Ruler',
  'Towny Ranks',
  'The ultimate towny rank with godlike powers and complete control.',
  99.99,
  'FaMagic',
  '#F94144',
  '[
    {"name": "Divine authority", "icon": "FaSun", "tooltip": "The highest authority level with control over all towns and kingdoms."},
    {"name": "Unlimited claims", "icon": "FaGlobeAmericas", "tooltip": "No limits on land claims and territory expansion."},
    {"name": "Complete economic control", "icon": "FaUniversity", "tooltip": "Complete control over all economic aspects of your realm."},
    {"name": "Divine powers", "icon": "FaBolt", "tooltip": "Special commands and abilities not available to any other rank."},
    {"name": "Custom realm design", "icon": "FaPalette", "tooltip": "Design custom visual elements for your entire realm."}
  ]'::jsonb,
  TRUE
);

-- Add Town Rank Upgrades
INSERT INTO shop_items (name, category, description, price, icon, color, color2, perks, is_exclusive) VALUES
(
  'Merchant Upgrade',
  'Towny Ranks',
  'Upgrade from Citizen to Merchant rank with economic benefits.',
  5.99,
  'FaArrowUp',
  '#4CAF50',
  '#43AA8B',
  '[
    {"name": "Upgrade to Merchant", "icon": "FaArrowUp", "tooltip": "Upgrade your Citizen rank to Merchant and gain all economic benefits."},
    {"name": "Economy focus", "icon": "FaCoins", "tooltip": "Focus on trading and economic aspects of town life."}
  ]'::jsonb,
  FALSE
),
(
  'Mayor Upgrade',
  'Towny Ranks',
  'Upgrade from Merchant to Mayor with leadership abilities.',
  10.99,
  'FaArrowUp',
  '#43AA8B',
  '#277DA1',
  '[
    {"name": "Upgrade to Mayor", "icon": "FaArrowUp", "tooltip": "Upgrade your Merchant rank to Mayor with town leadership abilities."},
    {"name": "Town administration", "icon": "FaUserTie", "tooltip": "Gain administration rights for your town."}
  ]'::jsonb,
  FALSE
),
(
  'Governor Upgrade',
  'Towny Ranks',
  'Upgrade from Mayor to Governor with regional control.',
  14.99,
  'FaArrowUp',
  '#277DA1',
  '#184E77',
  '[
    {"name": "Upgrade to Governor", "icon": "FaArrowUp", "tooltip": "Upgrade your Mayor rank to Governor with regional control."},
    {"name": "Regional authority", "icon": "FaChess", "tooltip": "Extend your influence to a regional level."}
  ]'::jsonb,
  FALSE
),
(
  'Noble Upgrade',
  'Towny Ranks',
  'Upgrade from Governor to Noble with elite status.',
  19.99,
  'FaArrowUp',
  '#184E77',
  '#F9C74F',
  '[
    {"name": "Upgrade to Noble", "icon": "FaArrowUp", "tooltip": "Upgrade your Governor rank to Noble with elite status."},
    {"name": "Elite privileges", "icon": "FaStar", "tooltip": "Gain access to elite privileges and economic advantages."}
  ]'::jsonb,
  TRUE
),
(
  'Duke Upgrade',
  'Towny Ranks',
  'Upgrade from Noble to Duke with territory control.',
  24.99,
  'FaArrowUp',
  '#F9C74F',
  '#F8961E',
  '[
    {"name": "Upgrade to Duke", "icon": "FaArrowUp", "tooltip": "Upgrade your Noble rank to Duke with territory control."},
    {"name": "Territory expansion", "icon": "FaGem", "tooltip": "Expand your territory and influence significantly."}
  ]'::jsonb,
  TRUE
),
(
  'King Upgrade',
  'Towny Ranks',
  'Upgrade from Duke to King with kingdom management.',
  29.99,
  'FaArrowUp',
  '#F8961E',
  '#F3722C',
  '[
    {"name": "Upgrade to King", "icon": "FaArrowUp", "tooltip": "Upgrade your Duke rank to King with kingdom management."},
    {"name": "Royal authority", "icon": "FaCrown", "tooltip": "Gain royal authority over your entire kingdom."}
  ]'::jsonb,
  TRUE
),
(
  'Divine Upgrade',
  'Towny Ranks',
  'Upgrade from King to Divine Ruler with godlike powers.',
  39.99,
  'FaArrowUp',
  '#F3722C',
  '#F94144',
  '[
    {"name": "Upgrade to Divine Ruler", "icon": "FaArrowUp", "tooltip": "Upgrade your King rank to Divine Ruler with godlike powers."},
    {"name": "Divine authority", "icon": "FaMagic", "tooltip": "Attain the highest level of authority and command."}
  ]'::jsonb,
  TRUE
);

-- Sample data for Beta Access
INSERT INTO shop_items (name, category, description, price, icon, color, perks, is_exclusive) VALUES
(
  'Beta Access',
  'Beta Access',
  'Get exclusive early access to new features and content before they are released to the general public.',
  14.99,
  'FaRocket',
  '#2196f3',
  '[
    {"name": "Early access to new features", "icon": "FaRocket", "tooltip": "Be among the first to experience new additions to the server."},
    {"name": "Beta testing badge", "icon": "FaHashtag", "tooltip": "Show off your exclusive beta tester status with a special badge."},
    {"name": "Feedback priority", "icon": "FaComments", "tooltip": "Your feedback gets priority consideration from the development team."}
  ]'::jsonb,
  TRUE
),
(
  'Alpha Access',
  'Beta Access',
  'Ultra-exclusive access to test features in their earliest development stage.',
  29.99,
  'FaAtom',
  '#00BCD4',
  '[
    {"name": "Alpha stage access", "icon": "FaAtom", "tooltip": "Test features at their earliest development stage."},
    {"name": "Development influence", "icon": "FaLightbulb", "tooltip": "Direct influence on feature development and direction."},
    {"name": "Alpha tester badge", "icon": "FaHashtag", "tooltip": "Show off your ultra-exclusive alpha tester status."},
    {"name": "Developer meetings", "icon": "FaUsers", "tooltip": "Invitation to periodic developer meetings and planning sessions."}
  ]'::jsonb,
  TRUE
),
(
  'Developer Partner',
  'Beta Access',
  'Become an official development partner with direct input on server features.',
  49.99,
  'FaCode',
  '#009688',
  '[
    {"name": "Development partnership", "icon": "FaHandshake", "tooltip": "Official partnership status with the development team."},
    {"name": "Feature voting rights", "icon": "FaVoteYea", "tooltip": "Voting rights on upcoming features and changes."},
    {"name": "Custom feature request", "icon": "FaLightbulb", "tooltip": "Submit custom feature requests with priority consideration."},
    {"name": "Developer channel access", "icon": "FaDiscord", "tooltip": "Access to private developer channels and discussions."},
    {"name": "Named credit", "icon": "FaStar", "tooltip": "Your name in credits for features you helped develop or test."}
  ]'::jsonb,
  TRUE
);

-- Update timestamps function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for automatically updating the updated_at column
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON shop_items
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create RLS policies
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read shop items
CREATE POLICY "Shop items are viewable by everyone" 
ON shop_items FOR SELECT 
USING (true);

-- Only allow authenticated admins to insert/update/delete
CREATE POLICY "Admins can insert shop items" 
ON shop_items FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can update shop items" 
ON shop_items FOR UPDATE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can delete shop items" 
ON shop_items FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
)); 