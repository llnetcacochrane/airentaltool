#!/bin/bash

#############################################
# AI Rental Tools - Bare Metal Installation
# Ubuntu Server Setup Script
# Version: 1.0.0
#############################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    clear
    echo -e "${CYAN}"
    echo "=============================================="
    echo "  AI Rental Tools - Installation Script"
    echo "  Full Production Server Setup"
    echo "=============================================="
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_step() {
    echo ""
    echo -e "${BLUE}===> $1${NC}"
    echo ""
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Run as a regular user with sudo privileges."
fi

print_header

# Installation directories
INSTALL_DIR="/opt/airentaltools"
DEV_DIR="/home/$USER/airentaltools-dev"
LOG_DIR="$INSTALL_DIR/logs"

print_info "Installation will use:"
print_info "  Production: $INSTALL_DIR"
print_info "  Development: $DEV_DIR"
echo ""

#############################################
# STEP 1: Database Configuration
#############################################

print_step "STEP 1: Database Configuration"
echo "Choose your database setup:"
echo "  1) Remote PostgreSQL server"
echo "  2) Install PostgreSQL locally"
echo "  3) Use Supabase (recommended for cloud hosting)"
echo ""
read -p "Enter your choice (1/2/3): " db_choice

USE_SUPABASE=false

if [ "$db_choice" == "1" ]; then
    print_info "Configuring remote PostgreSQL connection..."
    echo ""

    read -p "PostgreSQL server IP address: " pg_host
    read -p "PostgreSQL port [5432]: " pg_port
    pg_port=${pg_port:-5432}
    read -p "PostgreSQL superuser username [postgres]: " pg_superuser
    pg_superuser=${pg_superuser:-postgres}
    read -sp "PostgreSQL superuser password: " pg_superpass
    echo ""
    read -p "Database name to create [airentaltools]: " db_name
    db_name=${db_name:-airentaltools}
    read -p "Database username [airentaltools_user]: " db_user
    db_user=${db_user:-airentaltools_user}
    read -sp "Database user password: " db_password
    echo ""

    print_info "Installing PostgreSQL client..."
    sudo apt install -y postgresql-client > /dev/null 2>&1

    print_info "Testing database connection..."
    PGPASSWORD=$pg_superpass psql -h $pg_host -p $pg_port -U $pg_superuser -d postgres -c "SELECT version();" > /dev/null 2>&1 || \
        print_error "Failed to connect to PostgreSQL server at $pg_host:$pg_port"

    print_success "Database connection successful!"

    print_info "Creating database and user..."
    PGPASSWORD=$pg_superpass psql -h $pg_host -p $pg_port -U $pg_superuser -d postgres <<EOF > /dev/null 2>&1
CREATE DATABASE $db_name;
CREATE USER $db_user WITH ENCRYPTED PASSWORD '$db_password';
GRANT ALL PRIVILEGES ON DATABASE $db_name TO $db_user;
\c $db_name
GRANT ALL ON SCHEMA public TO $db_user;
ALTER DATABASE $db_name OWNER TO $db_user;
EOF

    DB_URL="postgresql://${db_user}:${db_password}@${pg_host}:${pg_port}/${db_name}"
    print_success "Database '$db_name' created successfully!"

elif [ "$db_choice" == "2" ]; then
    print_info "Installing PostgreSQL locally..."
    echo ""

    read -p "Database name to create [airentaltools]: " db_name
    db_name=${db_name:-airentaltools}
    read -p "Database username [airentaltools_user]: " db_user
    db_user=${db_user:-airentaltools_user}
    read -sp "Database user password: " db_password
    echo ""

    print_info "Installing PostgreSQL server..."
    sudo apt install -y postgresql postgresql-contrib > /dev/null 2>&1

    sudo systemctl start postgresql
    sudo systemctl enable postgresql

    print_success "PostgreSQL installed and started"

    print_info "Creating database and user..."
    sudo -u postgres psql <<EOF > /dev/null 2>&1
CREATE DATABASE $db_name;
CREATE USER $db_user WITH ENCRYPTED PASSWORD '$db_password';
GRANT ALL PRIVILEGES ON DATABASE $db_name TO $db_user;
\c $db_name
GRANT ALL ON SCHEMA public TO $db_user;
ALTER DATABASE $db_name OWNER TO $db_user;
EOF

    DB_URL="postgresql://${db_user}:${db_password}@localhost:5432/${db_name}"
    print_success "Local PostgreSQL configured successfully!"

else
    USE_SUPABASE=true
    print_info "Using Supabase..."
    echo ""
    print_info "You can find these values at: https://app.supabase.com/project/_/settings/api"
    echo ""
    read -p "Supabase Project URL (https://xxxxx.supabase.co): " supabase_url
    read -p "Supabase Anon Key: " supabase_anon_key
    read -p "Supabase Service Role Key: " supabase_service_key

    print_success "Supabase configuration saved!"
fi

#############################################
# STEP 2: Install System Dependencies
#############################################

print_step "STEP 2: Installing System Dependencies"

print_info "Updating package lists..."
sudo apt update > /dev/null 2>&1

print_info "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
sudo apt install -y nodejs > /dev/null 2>&1

print_info "Installing build essentials..."
sudo apt install -y build-essential git curl wget unzip > /dev/null 2>&1

print_info "Installing PM2 process manager..."
sudo npm install -g pm2 > /dev/null 2>&1

print_info "Installing Nginx web server..."
sudo apt install -y nginx > /dev/null 2>&1

print_info "Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx > /dev/null 2>&1

print_success "System dependencies installed!"
print_info "Node.js version: $(node --version)"
print_info "npm version: $(npm --version)"
print_info "PM2 version: $(pm2 --version)"

#############################################
# STEP 3: GitHub Configuration
#############################################

print_step "STEP 3: GitHub Repository Setup"

read -p "Enter GitHub repository URL (e.g., https://github.com/username/repo.git): " git_repo
read -p "Is this a private repository? (y/n) [n]: " is_private
is_private=${is_private:-n}

if [ "$is_private" == "y" ]; then
    echo ""
    print_info "For private repositories, you need GitHub authentication."
    echo "Options:"
    echo "  1) Personal Access Token (recommended)"
    echo "  2) SSH Key"
    read -p "Choose authentication method (1/2): " git_auth

    if [ "$git_auth" == "1" ]; then
        read -p "Enter your GitHub Personal Access Token: " github_token
        # Inject token into URL
        git_repo=$(echo $git_repo | sed "s|https://|https://${github_token}@|")
    else
        print_info "SSH key setup..."
        if [ ! -f ~/.ssh/id_rsa ]; then
            read -p "Enter your email for SSH key: " ssh_email
            ssh-keygen -t rsa -b 4096 -C "$ssh_email" -f ~/.ssh/id_rsa -N ""
            print_info "SSH public key generated. Add this to GitHub:"
            echo ""
            cat ~/.ssh/id_rsa.pub
            echo ""
            read -p "Press Enter after adding the key to GitHub..."
        fi
    fi
fi

print_info "Setting up Git configuration..."
read -p "Enter your Git username: " git_username
read -p "Enter your Git email: " git_email

git config --global user.name "$git_username"
git config --global user.email "$git_email"

#############################################
# STEP 4: Clone Repository
#############################################

print_step "STEP 4: Cloning Repository"

# Create dev directory
print_info "Creating development directory: $DEV_DIR"
mkdir -p $DEV_DIR

# Clone to dev directory
print_info "Cloning repository..."
git clone $git_repo $DEV_DIR || print_error "Failed to clone repository"
print_success "Repository cloned to $DEV_DIR"

# Create production directory and copy files
print_info "Creating production directory: $INSTALL_DIR"
sudo mkdir -p $INSTALL_DIR
sudo chown $USER:$USER $INSTALL_DIR

print_info "Copying files to production directory..."
cp -r $DEV_DIR/* $INSTALL_DIR/
cp -r $DEV_DIR/.* $INSTALL_DIR/ 2>/dev/null || true

cd $INSTALL_DIR
print_success "Production directory ready!"

#############################################
# STEP 5: Domain Configuration
#############################################

print_step "STEP 5: Domain Configuration"

read -p "Enter API domain [api.airentaltools.com]: " api_domain
api_domain=${api_domain:-api.airentaltools.com}

read -p "Enter Frontend domain [app.airentaltools.com]: " frontend_domain
frontend_domain=${frontend_domain:-app.airentaltools.com}

read -p "Enter root domain for public pages [airentaltools.com]: " root_domain
root_domain=${root_domain:-airentaltools.com}

print_info "Configured domains:"
print_info "  API: https://$api_domain"
print_info "  Frontend: https://$frontend_domain"
print_info "  Public: https://$root_domain"

#############################################
# STEP 6: Environment Configuration
#############################################

print_step "STEP 6: Creating Environment Configuration"

if [ "$USE_SUPABASE" == true ]; then
    cat > $INSTALL_DIR/.env <<EOF
# Supabase Configuration
VITE_SUPABASE_URL=$supabase_url
VITE_SUPABASE_ANON_KEY=$supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=$supabase_service_key

# Application Configuration
NODE_ENV=production
VITE_API_URL=https://$api_domain
VITE_APP_URL=https://$frontend_domain
PORT=3000

# Build timestamp
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
else
    cat > $INSTALL_DIR/.env <<EOF
# Database Configuration
DATABASE_URL=$DB_URL

# Application Configuration
NODE_ENV=production
VITE_API_URL=https://$api_domain
VITE_APP_URL=https://$frontend_domain
PORT=3000

# Build timestamp
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
fi

# Copy to dev directory too
cp $INSTALL_DIR/.env $DEV_DIR/.env

print_success "Environment configuration created!"

#############################################
# STEP 7: Install Dependencies & Build
#############################################

print_step "STEP 7: Installing Dependencies & Building Application"

print_info "Installing npm dependencies..."
npm install > /dev/null 2>&1 || print_error "Failed to install dependencies"

print_success "Dependencies installed!"

print_info "Building production frontend..."
npm run build || print_error "Build failed"

print_success "Frontend built successfully!"

#############################################
# STEP 8: Configure PM2
#############################################

print_step "STEP 8: Configuring PM2 Process Manager"

mkdir -p $LOG_DIR

cat > $INSTALL_DIR/ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'airentaltools-api',
    script: 'npm',
    args: 'run preview',
    cwd: '$INSTALL_DIR',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '$LOG_DIR/api-error.log',
    out_file: '$LOG_DIR/api-out.log',
    log_file: '$LOG_DIR/api-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

print_info "Starting application with PM2..."
pm2 delete airentaltools-api 2>/dev/null || true
pm2 start ecosystem.config.js > /dev/null 2>&1

print_info "Saving PM2 configuration..."
pm2 save > /dev/null 2>&1

print_info "Setting up PM2 to start on boot..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER > /dev/null 2>&1

print_success "PM2 configured and application started!"

#############################################
# STEP 9: Configure Nginx
#############################################

print_step "STEP 9: Configuring Nginx Web Server"

# API Server Configuration
sudo tee /etc/nginx/sites-available/$api_domain > /dev/null <<EOF
server {
    listen 80;
    server_name $api_domain;

    # API endpoints
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Frontend Application Configuration
sudo tee /etc/nginx/sites-available/$frontend_domain > /dev/null <<EOF
server {
    listen 80;
    server_name $frontend_domain;
    root $INSTALL_DIR/dist;
    index index.html;

    # SPA routing - try files, fallback to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Static assets with caching
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Images and media
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
EOF

# Root Domain - Public Pages
sudo tee /etc/nginx/sites-available/$root_domain > /dev/null <<EOF
server {
    listen 80;
    server_name $root_domain www.$root_domain;
    root $INSTALL_DIR/dist;
    index index.html;

    # Public pages accessible from root domain
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Images and media
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
EOF

# Enable sites
sudo ln -sf /etc/nginx/sites-available/$api_domain /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/$frontend_domain /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/$root_domain /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
print_info "Testing Nginx configuration..."
sudo nginx -t || print_error "Nginx configuration test failed"

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx > /dev/null 2>&1

print_success "Nginx configured and running!"

#############################################
# STEP 10: SSL Configuration
#############################################

print_step "STEP 10: SSL Certificate Configuration"

read -p "Configure SSL certificates now? (requires DNS to be pointing to this server) (y/n) [y]: " configure_ssl
configure_ssl=${configure_ssl:-y}

if [ "$configure_ssl" == "y" ]; then
    read -p "Enter email address for Let's Encrypt notifications: " ssl_email

    print_info "Obtaining SSL certificate for $api_domain..."
    sudo certbot --nginx -d $api_domain --non-interactive --agree-tos -m $ssl_email --redirect || \
        print_error "Failed to obtain SSL for $api_domain. Ensure DNS is configured."

    print_info "Obtaining SSL certificate for $frontend_domain..."
    sudo certbot --nginx -d $frontend_domain --non-interactive --agree-tos -m $ssl_email --redirect

    print_info "Obtaining SSL certificate for $root_domain..."
    sudo certbot --nginx -d $root_domain -d www.$root_domain --non-interactive --agree-tos -m $ssl_email --redirect

    # Setup auto-renewal
    sudo systemctl enable certbot.timer > /dev/null 2>&1

    print_success "SSL certificates configured!"
else
    print_info "Skipping SSL configuration."
    print_info "Run 'sudo certbot --nginx' later to configure SSL after DNS is set up."
fi

#############################################
# STEP 11: Firewall Configuration
#############################################

print_step "STEP 11: Firewall Configuration"

read -p "Configure UFW firewall? (y/n) [y]: " configure_firewall
configure_firewall=${configure_firewall:-y}

if [ "$configure_firewall" == "y" ]; then
    sudo ufw --force enable > /dev/null 2>&1
    sudo ufw allow 22/tcp > /dev/null 2>&1
    sudo ufw allow 80/tcp > /dev/null 2>&1
    sudo ufw allow 443/tcp > /dev/null 2>&1
    sudo ufw --force reload > /dev/null 2>&1

    print_success "Firewall configured!"
    print_info "Allowed ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)"
fi

#############################################
# STEP 12: Database Migrations
#############################################

print_step "STEP 12: Database Migrations"

if [ "$USE_SUPABASE" == true ]; then
    print_info "Using Supabase - migrations should be applied via Supabase Studio or CLI"
    print_info "Migration files are located in: $INSTALL_DIR/supabase/migrations/"
else
    print_info "Migration files found in: $INSTALL_DIR/supabase/migrations/"
    read -p "Apply database migrations now? (y/n) [y]: " apply_migrations
    apply_migrations=${apply_migrations:-y}

    if [ "$apply_migrations" == "y" ]; then
        for migration in $INSTALL_DIR/supabase/migrations/*.sql; do
            if [ -f "$migration" ]; then
                print_info "Applying: $(basename $migration)"
                PGPASSWORD=$db_password psql -h ${pg_host:-localhost} -p ${pg_port:-5432} -U $db_user -d $db_name -f "$migration" || {
                    print_error "Migration failed: $migration"
                }
            fi
        done
        print_success "All migrations applied successfully!"
    fi
fi

#############################################
# STEP 13: Create Update Script
#############################################

print_step "STEP 13: Creating Update Script"

cat > $DEV_DIR/update.sh <<'UPDATEEOF'
#!/bin/bash
# Update script for AI Rental Tools

echo "Pulling latest changes from Git..."
git pull

echo "Copying to production directory..."
sudo rsync -av --exclude 'node_modules' --exclude 'dist' --exclude 'logs' --exclude '.env' ./ /opt/airentaltools/

cd /opt/airentaltools

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Restarting PM2..."
pm2 restart airentaltools-api

echo "Update complete!"
pm2 status
UPDATEEOF

chmod +x $DEV_DIR/update.sh

print_success "Update script created at: $DEV_DIR/update.sh"

#############################################
# STEP 14: Final Summary
#############################################

print_step "INSTALLATION COMPLETE!"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗"
echo -e "║                                                    ║"
echo -e "║     AI Rental Tools - Installation Summary        ║"
echo -e "║                                                    ║"
echo -e "╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Installation successful!${NC}"
echo ""
echo -e "${YELLOW}URLs:${NC}"
echo "  Frontend:  https://$frontend_domain"
echo "  API:       https://$api_domain"
echo "  Public:    https://$root_domain"
echo ""
echo -e "${YELLOW}Directories:${NC}"
echo "  Production:  $INSTALL_DIR"
echo "  Development: $DEV_DIR"
echo "  Logs:        $LOG_DIR"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View logs:           pm2 logs airentaltools-api"
echo "  Restart app:         pm2 restart airentaltools-api"
echo "  Stop app:            pm2 stop airentaltools-api"
echo "  App status:          pm2 status"
echo "  Update app:          cd $DEV_DIR && ./update.sh"
echo ""
echo "  Nginx config test:   sudo nginx -t"
echo "  Restart Nginx:       sudo systemctl restart nginx"
echo "  View Nginx errors:   sudo tail -f /var/log/nginx/error.log"
echo ""
echo "  Database (psql):     psql $DB_URL"
echo "  Firewall status:     sudo ufw status"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Configure DNS records:"
echo "     - Point $api_domain to $(curl -s ifconfig.me 2>/dev/null || echo 'this server IP')"
echo "     - Point $frontend_domain to $(curl -s ifconfig.me 2>/dev/null || echo 'this server IP')"
echo "     - Point $root_domain to $(curl -s ifconfig.me 2>/dev/null || echo 'this server IP')"
echo ""
if [ "$configure_ssl" != "y" ]; then
    echo "  2. Configure SSL: sudo certbot --nginx"
    echo ""
fi
if [ "$USE_SUPABASE" == true ]; then
    echo "  3. Apply database migrations via Supabase Studio"
else
    echo "  3. Verify database migrations completed"
fi
echo ""
echo -e "${GREEN}Your application is now running!${NC}"
echo ""

# Save installation info
cat > $INSTALL_DIR/INSTALL_INFO.txt <<EOF
AI Rental Tools - Installation Information
==========================================

Installation Date: $(date)
Server IP: $(curl -s ifconfig.me 2>/dev/null || echo 'unknown')

Domains:
  Frontend: $frontend_domain
  API: $api_domain
  Public: $root_domain

Directories:
  Production: $INSTALL_DIR
  Development: $DEV_DIR
  Logs: $LOG_DIR

Database:
$([ "$USE_SUPABASE" == true ] && echo "  Type: Supabase" || echo "  Type: PostgreSQL")
$([ "$USE_SUPABASE" != true ] && echo "  URL: $DB_URL")

System Information:
  OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo 'Unknown')
  Node.js: $(node --version)
  npm: $(npm --version)
  PM2: $(pm2 --version)
  Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)

Git Repository: $git_repo
Git User: $git_username <$git_email>

Update Script: $DEV_DIR/update.sh
EOF

print_success "Installation info saved to: $INSTALL_DIR/INSTALL_INFO.txt"
echo ""
