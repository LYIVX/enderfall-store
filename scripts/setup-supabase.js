#!/usr/bin/env node

/**
 * This script creates the necessary tables in Supabase for the application
 *
 * To run:
 * 1. Make sure you have your Supabase database credentials in your .env file
 * 2. Run: node scripts/setup-supabase.js
 */

require("dotenv").config();
const { Pool } = require("pg");

// Check for PostgreSQL environment variables
const pgUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!pgUrl) {
  console.error("❌ Error: Missing PostgreSQL connection details!");
  console.error(
    "Please make sure POSTGRES_URL_NON_POOLING or POSTGRES_URL is set in your .env.local file"
  );
  process.exit(1);
}

// Create a cleaner connection URL
const pgHost =
  process.env.POSTGRES_HOST || "db.wsjjasupxnzinvopxgum.supabase.co";
const pgUser = process.env.POSTGRES_USER || "postgres";
const pgPassword = process.env.POSTGRES_PASSWORD || "a0i1usThtxYIacR1";
const pgDatabase = process.env.POSTGRES_DATABASE || "postgres";
const connectionString = `postgres://${pgUser}.wsjjasupxnzinvopxgum:${pgPassword}@${pgHost}:5432/${pgDatabase}`;

// Create a PostgreSQL client
console.log("🔌 Connecting to PostgreSQL database...");
console.log(
  `Using connection from environment variables (partially hidden): ${pgUrl.substring(0, 20)}...`
);

// Parse the connection URL to separate sslmode parameters
let connectionUrl = pgUrl;
if (connectionUrl.includes("?sslmode=require")) {
  connectionUrl = connectionUrl.replace("?sslmode=require", "");
}

const pool = new Pool({
  connectionString: connectionUrl,
  ssl: false, // Disable SSL for local development
});

// SQL definitions for tables
const tables = [
  {
    name: "minecraft_accounts",
    sql: `
      CREATE TABLE IF NOT EXISTS minecraft_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, username)
      );
      
      -- Index for faster queries by user_id
      CREATE INDEX IF NOT EXISTS idx_minecraft_accounts_user_id ON minecraft_accounts(user_id);
    `,
  },
  {
    name: "user_ranks",
    sql: `
      CREATE TABLE IF NOT EXISTS user_ranks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        minecraft_username TEXT NOT NULL,
        rank_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(minecraft_username, rank_id)
      );
      
      -- Index for faster queries by minecraft_username
      CREATE INDEX IF NOT EXISTS idx_user_ranks_minecraft_username ON user_ranks(minecraft_username);
    `,
  },
  {
    name: "pending_purchases",
    sql: `
      CREATE TABLE IF NOT EXISTS pending_purchases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        rank_id TEXT NOT NULL,
        minecraft_username TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        session_id TEXT NOT NULL UNIQUE,
        is_gift BOOLEAN DEFAULT FALSE,
        recipient TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Indexes for faster queries
      CREATE INDEX IF NOT EXISTS idx_pending_purchases_session_id ON pending_purchases(session_id);
      CREATE INDEX IF NOT EXISTS idx_pending_purchases_user_id ON pending_purchases(user_id);
    `,
  },
  {
    name: "resets",
    sql: `
      CREATE TABLE IF NOT EXISTS resets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL UNIQUE,
        reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        session_ids TEXT[] DEFAULT '{}',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Index for faster queries by user_id
      CREATE INDEX IF NOT EXISTS idx_resets_user_id ON resets(user_id);
    `,
  },
];

// Function to create a table
async function createTable(tableInfo) {
  try {
    console.log(`📦 Creating table: ${tableInfo.name}...`);
    await pool.query(tableInfo.sql);
    console.log(`✅ Table ${tableInfo.name} created successfully!`);
    return true;
  } catch (err) {
    console.error(
      `❌ Exception creating table ${tableInfo.name}:`,
      err.message
    );
    return false;
  }
}

// Function to enable the pgcrypto extension (for uuid_generate_v4)
async function enablePgCrypto() {
  try {
    console.log("🔐 Enabling pgcrypto extension...");
    await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
    console.log("✅ pgcrypto extension enabled successfully!");
    return true;
  } catch (err) {
    console.error("❌ Exception enabling pgcrypto extension:", err.message);
    return false;
  }
}

// Main function to run the setup
async function setupSupabase() {
  console.log("🚀 Starting database setup...");

  try {
    // Enable pgcrypto for UUID generation
    await enablePgCrypto();

    // Create tables
    const results = await Promise.all(tables.map(createTable));

    if (results.every(Boolean)) {
      console.log("✅ All tables created successfully!");
      console.log("🎉 Database setup completed!");
    } else {
      console.error("❌ Some tables failed to create.");
      console.error("Please check the error messages above and try again.");
    }
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the setup
setupSupabase().catch((err) => {
  console.error("❌ Unexpected error during setup:", err);
  process.exit(1);
});
