# Deployment Guide

This guide covers deploying the TOS Management PWA to various environments.

## 🚀 Quick Deployment Checklist

- [ ] Configure environment variables
- [ ] Set up database connection
- [ ] Build frontend assets
- [ ] Configure web server
- [ ] Set up SSL certificates
- [ ] Test PWA installation
- [ ] Configure backup strategy

## 🗄️ Database Setup

### SQL Server Configuration

1. **Create Database**:
```sql
CREATE DATABASE WBN_DATABASE;
```

2. **Create User** (if needed):
```sql
CREATE LOGIN headofnickel WITH PASSWORD = 'your_secure_password';
USE WBN_DATABASE;
CREATE USER headofnickel FOR LOGIN headofnickel;
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO headofnickel;
```

3. **Create TOS Table**:
```sql
USE WBN_DATABASE;
CREATE TABLE TOS (
    ID int PRIMARY KEY IDENTITY(1,1),
    CONTRACTOR nvarchar(255) NOT NULL,
    DATE date NOT NULL,
    SHIFT nvarchar(50) NOT NULL,
    STOCK_ID nvarchar(100) NOT NULL,
    STOCK_STATUS nvarchar(50) NOT NULL,
    CREATED_AT datetime DEFAULT GETDATE(),
    UPDATED_AT datetime DEFAULT GETDATE()
);

-- Create indexes for better search performance
CREATE INDEX IX_TOS_STOCK_ID ON TOS(STOCK_ID);
CREATE INDEX IX_TOS_CONTRACTOR ON TOS(CONTRACTOR);
CREATE INDEX IX_TOS_STATUS ON TOS(STOCK_STATUS);
CREATE INDEX IX_TOS_DATE ON TOS(DATE);
```

## 🖥️ Backend Deployment

### Option 1: Node.js with PM2

1. **Install PM2**:
```bash
npm install -g pm2
```

2. **Create ecosystem file** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'tos-backend',
    script: './src/server.js',
    cwd: './backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

3. **Deploy**:
```bash
cd backend
npm install --production
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Option 2: Docker

1. **Create Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src ./src

EXPOSE 3001

USER node

CMD ["node", "src/server.js"]
```

2. **Build and run**:
```bash
cd backend
docker build -t tos-backend .
docker run -d -p 3001:3001 --env-file .env --name tos-backend tos-backend
```

### Option 3: Heroku

1. **Create Procfile**:
```
web: node src/server.js
```

2. **Deploy**:
```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set DB_SERVER=your-db-server
heroku config:set DB_NAME=WBN_DATABASE
# ... set other environment variables
git push heroku main
```

## 🌐 Frontend Deployment

### Option 1: Static Hosting (Netlify/Vercel)

1. **Build the project**:
```bash
cd frontend
pnpm run build
```

2. **Deploy to Netlify**:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

3. **Configure redirects** (`frontend/public/_redirects`):
```
/*    /index.html   200
/api/*  https://your-backend-url.com/api/:splat  200
```

### Option 2: Nginx

1. **Build the project**:
```bash
cd frontend
pnpm run build
```

2. **Nginx configuration** (`/etc/nginx/sites-available/tos-app`):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/tos-app/dist;
    index index.html;

    # PWA Service Worker
    location /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # PWA Manifest
    location /manifest.json {
        add_header Content-Type "application/manifest+json";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # React Router fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

3. **Enable site**:
```bash
sudo ln -s /etc/nginx/sites-available/tos-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 3: Docker

1. **Create Dockerfile** (`frontend/Dockerfile`):
```dockerfile
# Build stage
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

2. **nginx.conf**:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /sw.js {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
}
```

## 📱 PWA Configuration

### Service Worker Registration

Ensure the service worker is properly registered for offline functionality:

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => console.log('SW registered'))
    .catch(error => console.log('SW registration failed'));
}
```

### PWA Manifest

Ensure `manifest.json` is properly configured:

```json
{
  "name": "TOS Management PWA",
  "short_name": "TOS PWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🔒 Security Considerations

### Backend Security

1. **Environment Variables**: Never commit sensitive data
2. **Database Security**: Use strong passwords and limited permissions
3. **CORS**: Configure appropriate origins
4. **Rate Limiting**: Implement rate limiting for production
5. **Input Validation**: Validate all input data
6. **SQL Injection**: Use parameterized queries

### Frontend Security

1. **Content Security Policy**: Configure CSP headers
2. **HTTPS**: Use SSL certificates in production
3. **Environment Variables**: Don't expose sensitive data in frontend

## 🔧 Environment-Specific Configuration

### Development
```env
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:3001/api
```

### Staging
```env
NODE_ENV=staging
VITE_API_BASE_URL=https://staging-api.yourapp.com/api
```

### Production
```env
NODE_ENV=production
VITE_API_BASE_URL=https://api.yourapp.com/api
```

## 📊 Monitoring and Logging

### Backend Logging

Consider using structured logging:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Performance Monitoring

- Use tools like New Relic, DataDog, or custom metrics
- Monitor API response times
- Track PWA installation rates
- Monitor database performance

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**: Check CORS configuration in backend
2. **PWA Not Installing**: Verify manifest.json and service worker
3. **Database Connection**: Check connection strings and firewall
4. **Build Failures**: Check Node.js version compatibility

### Health Checks

Implement health check endpoints:

```javascript
// Backend health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'connected' // check actual database status
  });
});
```

## 📋 Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database connection working
- [ ] API endpoints responding correctly
- [ ] PWA installing on mobile devices
- [ ] Offline functionality working
- [ ] SSL certificates active
- [ ] Monitoring and logging configured
- [ ] Backup strategy implemented
- [ ] Performance benchmarks established