# Updating Vercel Environment Variables for Rank Application

To ensure ranks are applied correctly in the production environment, you need to verify and update your Vercel environment variables. Follow these steps:

## 1. Check Current Environment Variables

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`enderfall-store`)
3. Go to Settings > Environment Variables

## 2. Required Environment Variables for Rank Application

Make sure the following environment variables are correctly configured:

| Environment Variable          | Value                        | Description                                       |
| ----------------------------- | ---------------------------- | ------------------------------------------------- |
| `MINECRAFT_SERVER_API_URL`    | `http://185.206.149.79:8113` | Main API URL for the proxy server                 |
| `MINECRAFT_SERVER_API_KEY`    | `test_minecraft_key_123`     | API key matching the one in your Minecraft plugin |
| `MINECRAFT_PROXY_IP`          | `185.206.149.79`             | IP address of the proxy server                    |
| `MINECRAFT_PROXY_PORT`        | `25674`                      | Port of the proxy server                          |
| `MINECRAFT_PROXY_API_PORT`    | `8113`                       | API port for the proxy server                     |
| `MINECRAFT_LOBBY_IP`          | `194.164.96.27`              | IP address of the lobby server                    |
| `MINECRAFT_LOBBY_PORT`        | `25610`                      | Port of the lobby server                          |
| `MINECRAFT_LOBBY_API_PORT`    | `8090`                       | API port for the lobby server                     |
| `MINECRAFT_SURVIVAL_IP`       | `185.206.148.170`            | IP address of the survival server                 |
| `MINECRAFT_SURVIVAL_PORT`     | `25579`                      | Port of the survival server                       |
| `MINECRAFT_SURVIVAL_API_PORT` | `8137`                       | API port for the survival server                  |

## 3. Update Environment Variables

If any of these variables are missing or incorrect:

1. Click "Add New" or edit the existing variable
2. Enter the variable name and value
3. Choose deployment environments (Production, Preview, Development)
4. Click "Save"

## 4. Redeploy Your Application

After updating environment variables:

1. Go to the "Deployments" tab
2. Select the latest deployment
3. Click the "..." menu and select "Redeploy"
4. Confirm the redeploy

## 5. Verify Firewall Configuration

Ensure your Minecraft servers allow incoming connections from Vercel's IP ranges:

1. Find your Vercel deployment's region in your project settings
2. Check that your Minecraft server's firewall allows incoming connections from Vercel's IP ranges for that region
3. At minimum, ensure ports 8090, 8113, and 8137 are open to Vercel's servers

## 6. Run Debugging Script

After updating the environment variables, use the `production-debug.js` script to check if everything is working correctly:

1. SSH into your server or run the script locally while connected to your production database
2. Run `node production-debug.js` to test connectivity and API functionality
3. Check the logs for any errors or issues

## 7. Check Minecraft Plugin Configuration

Ensure your Minecraft plugin is correctly configured:

1. Verify the `config.yml` file in your plugin directory has the correct API key
2. Make sure the plugin is loaded and running on all servers
3. Check server logs for any plugin-related errors
