# Enderfall Minecraft Server Website

This is the official website for the Enderfall Minecraft server, built with Next.js 14 and Supabase.

## Features

- Modern, responsive design
- Shop for server ranks and upgrades
- User authentication with Discord and Google
- User profiles with Minecraft account linking
- Forums for community discussion

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works for development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/enderfall.git
   cd enderfall
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Setting up Supabase Authentication

1. **Create a Supabase project**:
   - Go to [Supabase](https://supabase.com/) and create a new project
   - Note your project URL and anon key (needed for `.env.local`)

2. **Set up the database schema**:
   - Run the following SQL in the Supabase SQL editor:

   ```sql
   -- Create profiles table
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     username TEXT NOT NULL,
     avatar_url TEXT,
     minecraft_username TEXT,
     discord_id TEXT,
     google_id TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Set up Row Level Security (RLS)
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Public profiles are viewable by everyone"
     ON profiles FOR SELECT
     USING (true);

   CREATE POLICY "Users can insert their own profile"
     ON profiles FOR INSERT
     WITH CHECK (auth.uid() = id);

   CREATE POLICY "Users can update their own profile"
     ON profiles FOR UPDATE
     USING (auth.uid() = id);

   -- Create required tables for the shop
   CREATE TABLE shop_items (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     description TEXT NOT NULL,
     price DECIMAL(10,2) NOT NULL,
     image_url TEXT,
     category TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create user purchases table
   CREATE TABLE user_purchases (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     item_id UUID REFERENCES shop_items(id) NOT NULL,
     purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     transaction_id TEXT
   );
   ```

3. **Set up OAuth providers**:

   #### Discord Authentication
   1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   2. Create a new application
   3. Go to OAuth2 settings
   4. Add a redirect URL: `https://your-supabase-project-url.supabase.co/auth/v1/callback`
   5. Copy the Client ID and Client Secret
   6. In Supabase Auth settings, enable Discord provider and paste the credentials

   #### Google Authentication
   1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
   2. Create a new project
   3. Go to APIs & Services > Credentials
   4. Configure the OAuth consent screen
   5. Create an OAuth client ID (Web application)
   6. Add authorized redirect URI: `https://your-supabase-project-url.supabase.co/auth/v1/callback`
   7. Copy the Client ID and Client Secret
   8. In Supabase Auth settings, enable Google provider and paste the credentials

4. **Configure site URL in Supabase**:
   - In the Supabase Auth settings, set the Site URL to your production URL
   - For development, add `http://localhost:3000` to Additional Redirect URLs

## Deployment

1. Deploy to Vercel:
   ```bash
   npm run build
   ```

2. Set the production environment variables in your hosting platform

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Recent Updates

### Payment Goal Component Update
- The PaymentGoal component now fetches monthly income directly from Stripe instead of using Supabase.
- Set a fixed monthly target of £50 for server funding.
- Removed the payment_goals table from Supabase since it's no longer needed.
- Created a new `/api/stripe/monthly-income` endpoint to fetch payment data from Stripe.

## Nine-Slice Button Implementation

The application now features a versatile nine-slice button system that can be applied to any button variant, creating pixel-perfect Minecraft-style buttons.

### How It Works

The nine-slice technique is now implemented as a boolean property (`nineSlice`) that can be applied to any button variant:

```jsx
<Button variant="primary" nineSlice>Primary Nine-Slice Button</Button>
<Button variant="success" nineSlice>Success Nine-Slice Button</Button>
```

### Required Button Images

For each button variant that will use the nine-slice technique, you'll need three button images in the `/public/images/buttons/` directory:

- `{variant}-button.png` - Normal state
- `{variant}-button_highlighted.png` - Hover state
- `{variant}-button_disabled.png` - Disabled state

For example, for the "primary" variant:
- `primary-button.png`
- `primary-button_highlighted.png`
- `primary-button_disabled.png`

### Supported Variants

Nine-slice rendering is supported for these button variants:
- primary
- secondary
- danger
- success
- warning
- info

Each requires its own set of images as described above.

### Default Images

If variant-specific images aren't found, the button will fall back to:
- `button.png`
- `button_highlighted.png`
- `button_disabled.png`

### Special Border Slicing

The nine-slice buttons use a special border slicing pattern:
- 3px for top border
- 3px for right border
- 5px for bottom border
- 3px for left border

This creates a visual effect where the bottom of the button appears slightly heavier, which is common in Minecraft-style UI elements.

When creating your button images, make sure the bottom border area is 5px tall, while the other borders are 3px.

## Minecraft Fonts for UI Elements

The application includes several Minecraft-style fonts for use in UI elements, especially nine-slice buttons. These fonts are already included in the project.

### Available Fonts

The following Minecraft fonts are available:

1. **MinecraftFive**: 
   - Regular and Bold variants
   - Good for general text and UI elements
   - Used by default in nine-slice buttons

2. **MinecraftSeven**:
   - Regular and V2 variants
   - Slightly larger and more spaced out than MinecraftFive

3. **MinecraftTen**:
   - Regular and V2 variants
   - Largest of the three, good for headings

### Font Classes

For easy application, use the following CSS classes:

```css
.minecraft-five { /* Uses MinecraftFive font */ }
.minecraft-seven { /* Uses MinecraftSeven font */ }
.minecraft-ten { /* Uses MinecraftTen font */ }
```

Example:
```jsx
<p className="minecraft-five">This text uses MinecraftFive font</p>
<h2 className="minecraft-ten">This heading uses MinecraftTen font</h2>
```

### Customizing Nine-Slice Buttons

To change the font used by the nine-slice buttons, modify the Button.module.css file:

```css
.nineSlice {
  /* ... other properties ... */
  font-family: 'MinecraftFive', 'Courier New', monospace; /* Change to MinecraftSeven or MinecraftTen */
}
```

Check out the Font Demo section in the UI demo page for examples of all available fonts and variations.

### Font Rendering Tips

For crisp, pixel-perfect rendering of Minecraft fonts:

1. **Use optimal font sizes**: 
   - Use font sizes that are multiples of 8px (8px, 16px, 24px, 32px)
   - This ensures fonts render cleanly on pixel boundaries

2. **Apply the pixel-font class**:
   ```jsx
   <div className="pixel-font minecraft-five">Crisp text</div>
   ```

3. **Set text-shadow carefully**:
   - Avoid blurry shadows by using whole pixel values:
   ```css
   text-shadow: 1px 1px 0 rgba(0, 0, 0, 1);
   ```

4. **Consider device pixel ratio**:
   - On high-DPI screens, pixel fonts may still appear slightly blurry
   - Test on various devices to ensure optimal appearance 