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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
