# Cloud SQL Setup Guide

Your Cloud SQL instance: `project-ce31194e-b92f-4b22-9e0:us-west1:wordgame`

## Quick Start

### 1. Set up database user and credentials

```bash
# Set your project
gcloud config set project project-ce31194e-b92f-4b22-9e0

# Create database (if not exists)
gcloud sql databases create wordgame \
  --instance=wordgame

# Create user
gcloud sql users create wordgame_user \
  --instance=wordgame \
  --password=YOUR_SECURE_PASSWORD

# Or set password for existing user
gcloud sql users set-password wordgame_user \
  --instance=wordgame \
  --password=YOUR_SECURE_PASSWORD
```

### 2. Local Development Setup

#### Option A: Using Cloud SQL Proxy (Recommended)

1. **Install Cloud SQL Proxy**
   ```bash
   # The script will auto-install if needed
   chmod +x scripts/cloud-sql-proxy.sh
   ```

2. **Authenticate with gcloud**
   ```bash
   gcloud auth application-default login
   ```

3. **Start Cloud SQL Proxy** (in one terminal)
   ```bash
   ./scripts/cloud-sql-proxy.sh
   ```
   This creates a local connection to your Cloud SQL instance on `localhost:5432`

4. **Create .env file**
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```
   DATABASE_URL=postgresql://wordgame_user:YOUR_PASSWORD@localhost:5432/wordgame
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=$(openssl rand -base64 32)
   ```

5. **Push schema to database**
   ```bash
   npm run db:push
   ```
   This creates the `users` and `results` tables automatically.

6. **Start development server** (in another terminal)
   ```bash
   npm run dev
   ```

#### Option B: Enable Public IP (Less secure, not recommended)

1. Enable public IP on your Cloud SQL instance
2. Add your IP to authorized networks
3. Connect directly using the instance's public IP

### 3. Production Deployment (Compute Engine VM)

#### Create and configure VM

```bash
# Create VM instance (e2-micro is free tier)
gcloud compute instances create wordgame-api \
  --project=project-ce31194e-b92f-4b22-9e0 \
  --zone=us-west1-b \
  --machine-type=e2-micro \
  --boot-disk-size=30GB \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --tags=http-server
```

#### Configure firewall

```bash
# Allow API traffic
gcloud compute firewall-rules create allow-wordgame-api \
  --project=project-ce31194e-b92f-4b22-9e0 \
  --allow=tcp:3000 \
  --target-tags=http-server
```

#### Deploy to VM

```bash
# SSH into VM
gcloud compute ssh wordgame-api \
  --project=project-ce31194e-b92f-4b22-9e0 \
  --zone=us-west1-b

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Clone your repository
git clone YOUR_REPO_URL wordgame
cd wordgame

# Install dependencies
npm install

# Set up environment (Unix socket connection - no proxy needed!)
cat > .env << 'EOF'
DATABASE_URL=postgresql://wordgame_user:YOUR_PASSWORD@/wordgame?host=/cloudsql/project-ce31194e-b92f-4b22-9e0:us-west1:wordgame
NODE_ENV=production
PORT=3000
JWT_SECRET=YOUR_JWT_SECRET_HERE
EOF

# Push schema to database
npm run db:push

# Build application
npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Start application
pm2 start dist/index.js --name wordgame-api

# Configure PM2 to start on boot
pm2 save
pm2 startup
# Run the command it outputs

# Check logs
pm2 logs wordgame-api
```

### 4. Verify Setup

```bash
# Get VM external IP
gcloud compute instances describe wordgame-api \
  --project=project-ce31194e-b92f-4b22-9e0 \
  --zone=us-west1-b \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# Test API
curl http://YOUR_VM_IP:3000/health
```

## Database Schema

The following tables will be created by `npm run db:push`:

### `users` table
- `username` (varchar 50, primary key) - lowercase
- `original_username` (varchar 50) - preserved casing
- `password_hash` (text) - bcrypt hashed
- `created_at` (timestamp)

### `results` table
- `username` (varchar 50, foreign key)
- `date` (varchar 10) - YYYY-MM-DD
- `guesses` (text) - JSON array
- `num_guesses` (varchar 10)
- `won` (boolean)
- `submitted_at` (timestamp)
- **Primary key**: (username, date)

## Useful Commands

```bash
# Check database connection
gcloud sql connect wordgame --user=wordgame_user --project=project-ce31194e-b92f-4b22-9e0

# View database logs
gcloud sql operations list --instance=wordgame --project=project-ce31194e-b92f-4b22-9e0

# Update code on VM
gcloud compute ssh wordgame-api --project=project-ce31194e-b92f-4b22-9e0 --zone=us-west1-b --command="cd wordgame && git pull && npm install && npm run build && pm2 restart wordgame-api"

# View VM logs
gcloud compute ssh wordgame-api --project=project-ce31194e-b92f-4b22-9e0 --zone=us-west1-b --command="pm2 logs wordgame-api --lines 100"
```

## Troubleshooting

### "Connection refused" errors
- Make sure Cloud SQL Proxy is running (for local dev)
- Check that DATABASE_URL is correct
- Verify VM has Cloud SQL API scope enabled

### "Authentication failed" errors
- Check username and password are correct
- Verify user exists: `gcloud sql users list --instance=wordgame`

### Schema not created
- Make sure you ran `npm run db:push`
- Check drizzle.config.ts points to correct schema file
- Verify DATABASE_URL environment variable is set
