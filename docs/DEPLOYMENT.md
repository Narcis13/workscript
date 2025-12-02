# Workscript Deployment Guide

Complete deployment guide for deploying Workscript to production:
- **Backend (API + Packages)**: Ubuntu Server with PM2
- **Frontend**: Vercel (SPA)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Ubuntu Server Deployment (API)](#part-1-ubuntu-server-deployment-api)
   - [Server Preparation](#1-server-preparation)
   - [Code Transfer](#2-code-transfer)
   - [Environment Configuration](#3-environment-configuration)
   - [Database Setup](#4-database-setup)
   - [Build Process](#5-build-process)
   - [PM2 Process Management](#6-pm2-process-management)
   - [Reverse Proxy (Nginx)](#7-reverse-proxy-nginx)
   - [SSL Certificate](#8-ssl-certificate)
   - [Firewall Configuration](#9-firewall-configuration)
3. [Part 2: Vercel Deployment (Frontend)](#part-2-vercel-deployment-frontend)
   - [Vercel Setup](#1-vercel-setup)
   - [Project Configuration](#2-project-configuration)
   - [Environment Variables](#3-environment-variables)
   - [SPA Routing Configuration](#4-spa-routing-configuration)
   - [Deploy](#5-deploy)
   - [Custom Domain](#6-custom-domain)
4. [Post-Deployment](#post-deployment)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance](#maintenance)

---

## Prerequisites

### Development Machine
- Git repository with latest code
- All tests passing: `bun run test`
- Build succeeds locally: `bun run build`

### Ubuntu Server Requirements
- Ubuntu 20.04+ with sudo/root access
- Bun runtime installed (verified: already installed)
- MySQL 8.0+ running (verified: already running)
- At least 2GB RAM, 20GB disk space
- Domain name pointing to server IP (optional but recommended)

### Vercel Requirements
- Vercel account (free tier works)
- GitHub/GitLab repository access (or Vercel CLI)

---

## Part 1: Ubuntu Server Deployment (API)

### 1. Server Preparation

#### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.2 Verify Bun Installation
```bash
bun --version
# Should output version 1.x
```

If Bun is not installed:
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

#### 1.3 Install PM2 (Process Manager)
```bash
# Install PM2 globally via npm (or bun)
bun install -g pm2

# Or using npm if preferred
# npm install -g pm2
```

#### 1.4 Install Nginx (Reverse Proxy)
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### 1.5 Create Application User (Optional but Recommended)
```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash workscript
sudo usermod -aG sudo workscript

# Switch to the user
sudo su - workscript
```

#### 1.6 Create Application Directory
```bash
sudo mkdir -p /var/www/workscript
sudo chown $USER:$USER /var/www/workscript
```

---

### 2. Code Transfer

#### Option A: Git Clone (Recommended)
```bash
cd /var/www/workscript
git clone https://github.com/narcisbrindusescu/workscript.git .

# Or if private repository
git clone git@github.com:narcisbrindusescu/workscript.git .
```

#### Option B: Rsync from Development Machine
From your development machine:
```bash
rsync -avz --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.env' \
  /Users/narcisbrindusescu/teste/workscript/ \
  user@your-server:/var/www/workscript/
```

#### Option C: Manual Upload
1. Create a tarball on development machine:
```bash
cd /Users/narcisbrindusescu/teste
tar -czvf workscript.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='.env' \
  workscript/
```

2. Upload and extract on server:
```bash
scp workscript.tar.gz user@your-server:/var/www/
ssh user@your-server
cd /var/www
tar -xzvf workscript.tar.gz
rm workscript.tar.gz
```

---

### 3. Environment Configuration

#### 3.1 Create Production Environment File
```bash
cd /var/www/workscript/apps/api
cp .env.example .env
nano .env  # or vim .env
```

#### 3.2 Configure Production Environment Variables
Update these critical values in `.env`:

```bash
# ==============================================================================
# Database Configuration
# ==============================================================================
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="workscript_user"
DB_PASSWORD="YOUR_STRONG_DATABASE_PASSWORD"
DB_NAME="workscript_prod"

# ==============================================================================
# Server Configuration
# ==============================================================================
PORT=3013
SERVER_ID="workscript-api-prod"
NODE_ENV="production"

# API Base URL (your production API domain)
API_BASE_URL="https://api.yourdomain.com"

# ==============================================================================
# JWT Secrets (GENERATE NEW ONES FOR PRODUCTION!)
# ==============================================================================
# Generate with: openssl rand -hex 32
JWT_SECRET="GENERATE_NEW_64_CHAR_HEX_STRING"
JWT_REFRESH_SECRET="GENERATE_DIFFERENT_64_CHAR_HEX_STRING"

# Token expiry (production values)
JWT_ACCESS_EXPIRY=900          # 15 minutes
JWT_REFRESH_EXPIRY=604800      # 7 days

# ==============================================================================
# Session Configuration
# ==============================================================================
SESSION_SECRET="GENERATE_ANOTHER_64_CHAR_HEX_STRING"

# Redis (recommended for production sessions)
# REDIS_URL="redis://localhost:6379"
SESSION_EXPIRY=86400

# ==============================================================================
# CORS Configuration - CRITICAL FOR FRONTEND
# ==============================================================================
# Set to your Vercel frontend URL(s)
CLIENT_URL="https://your-app.vercel.app"

# Multiple origins (if needed):
# CLIENT_URL="https://your-app.vercel.app,https://www.yourdomain.com"

# ==============================================================================
# Google OAuth (if using)
# ==============================================================================
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="https://api.yourdomain.com/api/auth/google/callback"

# ==============================================================================
# OpenRouter AI (if using AI features)
# ==============================================================================
OPENROUTER_API_KEY="sk-or-v1-your-production-api-key"
OPENROUTER_SITE_URL="https://your-app.vercel.app"
OPENROUTER_SITE_NAME="Workscript"

# ==============================================================================
# Security Settings
# ==============================================================================
BCRYPT_ROUNDS=12              # Higher for production
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900
```

#### 3.3 Generate Secure Secrets
Run this command multiple times for each secret:
```bash
openssl rand -hex 32
```

#### 3.4 Set Proper File Permissions
```bash
chmod 600 /var/www/workscript/apps/api/.env
```

---

### 4. Database Setup

#### 4.1 Create Production Database and User
```bash
sudo mysql -u root -p
```

```sql
-- Create database
CREATE DATABASE workscript_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user
CREATE USER 'workscript_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_DATABASE_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON workscript_prod.* TO 'workscript_user'@'localhost';
FLUSH PRIVILEGES;

EXIT;
```

#### 4.2 Verify Database Connection
```bash
mysql -u workscript_user -p workscript_prod -e "SELECT 1;"
```

---

### 5. Build Process

#### 5.1 Install Dependencies
```bash
cd /var/www/workscript
bun install
```

#### 5.2 Build Packages in Order
The build order is critical due to dependencies:

```bash
# 1. Build engine first (no dependencies)
cd /var/www/workscript/packages/engine
bun run build

# 2. Build nodes (depends on engine)
cd /var/www/workscript/packages/nodes
bun run build

# 3. Build API (depends on engine and nodes)
cd /var/www/workscript/apps/api
bun run build
```

Or from root (uses the correct order automatically):
```bash
cd /var/www/workscript
bun run build:engine && bun run build:nodes && bun run build:api
```

#### 5.3 Run Database Migrations
```bash
cd /var/www/workscript/apps/api
bun run db:push
```

#### 5.4 Verify Build
```bash
# Test that server starts
cd /var/www/workscript/apps/api
timeout 10 bun run start || true
# Should see: "✓ Server running at http://localhost:3013"
```

---

### 6. PM2 Process Management

#### 6.1 Create PM2 Ecosystem File
```bash
nano /var/www/workscript/ecosystem.config.cjs
```

```javascript
module.exports = {
  apps: [
    {
      name: 'workscript-api',
      cwd: '/var/www/workscript/apps/api',
      script: 'src/index.ts',
      interpreter: 'bun',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3013,
      },
      // Logging
      error_file: '/var/log/workscript/error.log',
      out_file: '/var/log/workscript/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Restart policy
      max_restarts: 10,
      restart_delay: 5000,
      autorestart: true,
      watch: false,
      // Memory management
      max_memory_restart: '500M',
    },
  ],
};
```

#### 6.2 Create Log Directory
```bash
sudo mkdir -p /var/log/workscript
sudo chown $USER:$USER /var/log/workscript
```

#### 6.3 Start Application with PM2
```bash
cd /var/www/workscript
pm2 start ecosystem.config.cjs
```

#### 6.4 Verify PM2 Status
```bash
pm2 status
pm2 logs workscript-api
```

#### 6.5 Configure PM2 Startup
```bash
# Generate startup script
pm2 startup

# Follow the instructions it outputs, typically:
# sudo env PATH=$PATH:/home/user/.bun/bin pm2 startup systemd -u user --hp /home/user

# Save current process list
pm2 save
```

#### 6.6 PM2 Common Commands
```bash
# View status
pm2 status

# View logs
pm2 logs workscript-api
pm2 logs workscript-api --lines 100

# Restart
pm2 restart workscript-api

# Stop
pm2 stop workscript-api

# Reload (zero-downtime)
pm2 reload workscript-api

# Delete from PM2
pm2 delete workscript-api
```

---

### 7. Reverse Proxy (Nginx)

#### 7.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/workscript-api
```

```nginx
# Upstream for WebSocket support
upstream workscript_backend {
    server 127.0.0.1:3013;
    keepalive 64;
}

server {
    listen 80;
    server_name api.yourdomain.com;  # Replace with your domain

    # Redirect HTTP to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://workscript_backend;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket specific location (if needed)
    location /ws {
        proxy_pass http://workscript_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://workscript_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

#### 7.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/workscript-api /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### 8. SSL Certificate

#### 8.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### 8.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d api.yourdomain.com
```

Follow the prompts:
- Enter email address
- Agree to terms
- Choose redirect option (recommended: redirect HTTP to HTTPS)

#### 8.3 Verify Auto-Renewal
```bash
sudo certbot renew --dry-run
```

---

### 9. Firewall Configuration

#### 9.1 Configure UFW
```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow port 3013 only from localhost (optional - Nginx handles external)
# sudo ufw allow from 127.0.0.1 to any port 3013

# Check status
sudo ufw status
```

#### 9.2 Verify Firewall Rules
```bash
sudo ufw status verbose
```

Expected output:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
```

---

## Part 2: Vercel Deployment (Frontend)

### 1. Vercel Setup

#### 1.1 Install Vercel CLI (Optional)
```bash
# On development machine
npm install -g vercel
# or
bun install -g vercel

# Login
vercel login
```

#### 1.2 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub/GitLab/Email
3. Connect your Git provider

---

### 2. Project Configuration

#### 2.1 Create vercel.json in Frontend Directory
Create `/apps/frontend/vercel.json`:

```json
{
  "version": 2,
  "framework": "vite",
  "buildCommand": "cd ../.. && bun install && bun run build:engine && cd apps/frontend && bun run build",
  "outputDirectory": "dist",
  "installCommand": "cd ../.. && bun install",
  "rewrites": [
    {
      "source": "/((?!assets|vite.svg).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### 2.2 Alternative: Root Directory Configuration
If deploying the entire monorepo to Vercel, create `/vercel.json` at root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "apps/frontend/dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/apps/frontend/dist/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/apps/frontend/dist/index.html"
    }
  ]
}
```

---

### 3. Environment Variables

#### 3.1 Via Vercel Dashboard
1. Go to your Vercel project
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_API_URL` | `https://api.yourdomain.com` | Production |
| `VITE_API_URL` | `https://staging-api.yourdomain.com` | Preview |
| `VITE_API_URL` | `http://localhost:3013` | Development |

#### 3.2 Via Vercel CLI
```bash
vercel env add VITE_API_URL production
# Enter: https://api.yourdomain.com
```

---

### 4. SPA Routing Configuration

The `vercel.json` rewrites handle SPA routing, but ensure your `vite.config.ts` doesn't conflict:

The current `vite.config.ts` is already compatible. The build output will be a proper SPA with `index.html` as the entry point.

---

### 5. Deploy

#### Option A: Via Git Integration (Recommended)
1. Push code to GitHub/GitLab
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Configure project:
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `cd ../.. && bun install && bun run build:engine && cd apps/frontend && bun run build`
   - **Output Directory**: `dist`
   - **Install Command**: `cd ../.. && bun install`
5. Add environment variables
6. Click **Deploy**

#### Option B: Via Vercel CLI
```bash
cd /Users/narcisbrindusescu/teste/workscript/apps/frontend

# First deployment (will create project)
vercel

# Production deployment
vercel --prod
```

#### Option C: Manual Build and Deploy
```bash
# Build locally
cd /Users/narcisbrindusescu/teste/workscript
bun run build:frontend

# Deploy dist folder
cd apps/frontend
vercel dist --prod
```

---

### 6. Custom Domain

#### 6.1 Add Domain in Vercel
1. Go to Project **Settings** → **Domains**
2. Add your domain: `app.yourdomain.com`
3. Follow DNS configuration instructions

#### 6.2 DNS Configuration
Add these records at your DNS provider:

| Type | Name | Value |
|------|------|-------|
| A | app | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com` |

Or if using Vercel for the main domain:
| Type | Name | Value |
|------|------|-------|
| CNAME | app | `cname.vercel-dns.com` |

---

## Post-Deployment

### 1. Verify Deployment

#### API Server
```bash
# Health check
curl https://api.yourdomain.com/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...}

# WebSocket test
wscat -c wss://api.yourdomain.com/ws
# or use browser console:
# new WebSocket('wss://api.yourdomain.com/ws')
```

#### Frontend
1. Open `https://your-app.vercel.app` in browser
2. Check browser console for errors
3. Test login/register flow
4. Verify API calls work (Network tab)

### 2. Update CORS Settings

After deploying frontend, update API's `.env`:
```bash
CLIENT_URL="https://your-app.vercel.app,https://app.yourdomain.com"
```

Then restart PM2:
```bash
pm2 restart workscript-api
```

### 3. Monitor Logs

#### Server Logs
```bash
# PM2 logs
pm2 logs workscript-api

# Application logs
tail -f /var/log/workscript/output.log
tail -f /var/log/workscript/error.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### Vercel Logs
- Go to Vercel Dashboard → Project → **Deployments** → Select deployment → **Logs**

---

## Troubleshooting

### API Issues

#### Port Already in Use
```bash
# Find process using port 3013
lsof -i :3013

# Kill it
kill -9 <PID>

# Or use the built-in command
cd /var/www/workscript/apps/api
bun run kill-port
```

#### PM2 Not Starting
```bash
# Check logs
pm2 logs workscript-api --lines 200

# Verify Bun path
which bun
# Update ecosystem.config.cjs if path differs

# Manual test
cd /var/www/workscript/apps/api
bun src/index.ts
```

#### Database Connection Failed
```bash
# Test MySQL connection
mysql -u workscript_user -p workscript_prod -e "SELECT 1;"

# Check .env credentials match
cat /var/www/workscript/apps/api/.env | grep DB_

# Check MySQL is running
sudo systemctl status mysql
```

### Frontend Issues

#### Build Failures on Vercel
- Check build logs in Vercel dashboard
- Ensure `@workscript/engine` builds before frontend
- Verify all dependencies are listed in `package.json`

#### API Calls Failing (CORS)
1. Check browser console for CORS errors
2. Verify `CLIENT_URL` in API `.env` includes frontend URL
3. Restart PM2 after changing `.env`

#### Blank Page After Deploy
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly in Vercel
- Ensure `vercel.json` rewrites are configured

### WebSocket Issues

#### Connection Refused
```bash
# Check if WebSocket endpoint responds
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" \
  -H "Sec-WebSocket-Version: 13" \
  https://api.yourdomain.com/ws
```

#### WebSocket Behind Nginx
Ensure Nginx config has:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;
```

---

## Maintenance

### Update Deployment

#### API Update
```bash
# SSH into server
ssh user@your-server

# Pull latest code
cd /var/www/workscript
git pull origin main

# Install new dependencies
bun install

# Rebuild packages
bun run build:engine && bun run build:nodes && bun run build:api

# Run migrations if needed
cd apps/api && bun run db:push

# Reload with zero downtime
pm2 reload workscript-api
```

#### Frontend Update
With Git integration, simply push to main branch. Vercel will auto-deploy.

Manual:
```bash
cd apps/frontend
vercel --prod
```

### Database Backup
```bash
# Create backup
mysqldump -u workscript_user -p workscript_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u workscript_user -p workscript_prod < backup_20240101_120000.sql
```

### SSL Certificate Renewal
Certbot handles this automatically, but you can force renewal:
```bash
sudo certbot renew
```

### Log Rotation
PM2 has built-in log rotation. For custom rotation:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Quick Reference Commands

### Server Management
| Command | Description |
|---------|-------------|
| `pm2 status` | View process status |
| `pm2 logs workscript-api` | View logs |
| `pm2 restart workscript-api` | Restart server |
| `pm2 reload workscript-api` | Zero-downtime reload |
| `pm2 stop workscript-api` | Stop server |
| `pm2 monit` | Real-time monitoring |

### Nginx
| Command | Description |
|---------|-------------|
| `sudo systemctl status nginx` | Check status |
| `sudo nginx -t` | Test configuration |
| `sudo systemctl reload nginx` | Reload config |
| `sudo systemctl restart nginx` | Full restart |

### Database
| Command | Description |
|---------|-------------|
| `bun run db:push` | Push schema changes |
| `bun run db:generate` | Generate migrations |
| `bun run db:studio` | Open Drizzle Studio |

---

## Architecture Diagram

```
                                    ┌─────────────────────────────────────────────┐
                                    │                   USERS                     │
                                    └─────────────────────────────────────────────┘
                                                        │
                    ┌───────────────────────────────────┼───────────────────────────────────┐
                    │                                   │                                   │
                    ▼                                   ▼                                   │
    ┌───────────────────────────────┐   ┌───────────────────────────────┐                  │
    │         VERCEL (CDN)          │   │       UBUNTU SERVER           │                  │
    │  ┌─────────────────────────┐  │   │  ┌─────────────────────────┐  │                  │
    │  │    React Frontend       │  │   │  │        NGINX            │  │                  │
    │  │    (SPA - Static)       │  │   │  │   (Reverse Proxy)       │  │                  │
    │  │                         │  │   │  │   Port 80/443           │  │                  │
    │  │  VITE_API_URL ─────────────────────►                        │  │                  │
    │  └─────────────────────────┘  │   │  └───────────┬─────────────┘  │                  │
    │                               │   │              │                │                  │
    │  https://app.yourdomain.com   │   │              ▼                │                  │
    └───────────────────────────────┘   │  ┌─────────────────────────┐  │                  │
                                        │  │      PM2 Manager        │  │                  │
                                        │  │  ┌───────────────────┐  │  │                  │
                                        │  │  │   Hono API        │  │  │                  │
                                        │  │  │   Port 3013       │  │  │                  │
                                        │  │  │                   │  │  │                  │
                                        │  │  │ @workscript/api   │  │  │                  │
                                        │  │  │ @workscript/engine│  │  │                  │
                                        │  │  │ @workscript/nodes │  │  │                  │
                                        │  │  └─────────┬─────────┘  │  │                  │
                                        │  └────────────┼────────────┘  │                  │
                                        │               │               │                  │
                                        │               ▼               │                  │
                                        │  ┌─────────────────────────┐  │                  │
                                        │  │        MySQL            │  │                  │
                                        │  │     (workscript_prod)   │  │                  │
                                        │  └─────────────────────────┘  │                  │
                                        │                               │                  │
                                        │  https://api.yourdomain.com   │                  │
                                        └───────────────────────────────┘                  │
                                                        │                                  │
                                                        │ WebSocket (ws://)                │
                                                        └──────────────────────────────────┘
```

---

**Version:** 1.0.0 | **Last Updated:** 2025-12-01 | **Author:** Workscript Team
