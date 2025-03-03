# Enderfall Store

A Next.js web application for managing Minecraft server ranks and purchases, with Stripe integration.

## Features

- 🎮 Minecraft rank management
- 💳 Secure payments with Stripe
- 🔒 Authentication system
- 🎯 Real-time rank application
- 🌐 API integration with Minecraft server

## Prerequisites

- Node.js 18+ and npm
- Stripe account
- Minecraft server with LuckPerms

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Minecraft Server
MINECRAFT_SERVER_API_KEY=your-minecraft-api-key
MINECRAFT_SERVER_API_URL=http://localhost:8080

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/enderfall-store.git
cd enderfall-store
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

The application can be easily deployed to Vercel:

1. Push your code to GitHub
2. Import your repository in Vercel
3. Configure environment variables
4. Deploy!

## Minecraft Plugin

The Minecraft plugin code is maintained in a separate repository. Please refer to the plugin documentation for setup instructions.

## Supabase Integration

This project uses [Supabase](https://supabase.com/) as its primary data storage solution. The integration stores:

- **Minecraft Accounts**: Track user-saved Minecraft accounts
- **User Ranks**: Store rank purchases for Minecraft usernames
- **Pending Purchases**: Keep track of ongoing purchase sessions
- **Resets**: Manage data resets for testing and support

### Setup

1. Set up a Supabase project
2. Add your Supabase credentials to `.env` and `.env.local` files:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the setup script to create the required tables:
   ```
   node scripts/setup-supabase.js
   ```

### API

The Supabase client and related functions are available in `lib/supabase.ts`. Key functions include:

- `getSavedAccounts(userId)`: Get a user's saved Minecraft accounts
- `addSavedAccount(userId, username)`: Add a Minecraft account for a user
- `getUserRanks(minecraftUsername)`: Get ranks for a Minecraft username
- `saveUserRankData(minecraftUsername, rankId)`: Save a rank purchase
- `getPendingPurchases()`: Get all pending purchase sessions
- `addPendingPurchase(purchase)`: Add a new pending purchase
- `getResetData(userId)`: Get reset data for a user

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
