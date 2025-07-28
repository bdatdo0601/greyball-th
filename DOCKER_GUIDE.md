# Docker Setup Guide

This document provides comprehensive instructions for running the Document Management System using Docker and Docker Compose.

## 🐳 Quick Start with Docker

### Prerequisites
- Docker (20.10+ recommended)
- Docker Compose (2.0+ recommended)
- At least 2GB free disk space

### Production Deployment
```bash
# Start all services in production mode
./docker-manage.sh start prod

# Or manually:
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# PostgreSQL: localhost:5432
```

### Development Mode
```bash
# Start all services in development mode (with hot reload)
./docker-manage.sh start dev

# Or manually:
docker-compose -f docker-compose.dev.yml up -d

# Additional development tools:
# pgAdmin: http://localhost:5050 (admin@example.com / admin)
```

## 📋 Docker Services

### Production Services (`docker-compose.yml`)

1. **postgres**: PostgreSQL 15 database with automatic schema initialization
2. **backend**: Fastify API server (production build)
3. **frontend**: Next.js web application (production build)

### Development Services (`docker-compose.dev.yml`)

1. **postgres**: PostgreSQL 15 database
2. **backend**: Fastify API server (development mode with hot reload)
3. **frontend**: Next.js web application (development mode with hot reload)
4. **pgadmin**: Database management interface (optional)

## 🛠️ Management Commands

### Using the Management Script

```bash
# Start services
./docker-manage.sh start [prod|dev]

# Stop services
./docker-manage.sh stop [prod|dev]

# View logs
./docker-manage.sh logs

# Check service status
./docker-manage.sh status

# Restart services
./docker-manage.sh restart [prod|dev]

# Build images
./docker-manage.sh build

# Clean up (removes all data!)
./docker-manage.sh clean [prod|dev]
```

### Manual Docker Compose Commands

```bash
# Production mode
docker-compose up -d                    # Start all services
docker-compose down                     # Stop all services
docker-compose logs -f                  # View logs
docker-compose ps                       # List services
docker-compose exec backend bash       # Access backend container

# Development mode
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f backend
```

## 📁 Volume Management

### Data Persistence
- **postgres_data**: PostgreSQL database files
- **postgres_dev_data**: Development PostgreSQL database files
- **pgadmin_data**: pgAdmin configuration (dev mode only)

### Backup and Restore
```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres document_management > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres document_management < backup.sql

# Export volume backup
docker run --rm -v postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volume backup
docker run --rm -v postgres_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/postgres_backup.tar.gz -C /data
```

## 🔧 Configuration

### Environment Variables

**Backend Configuration:**
```yaml
DB_HOST: postgres
DB_PORT: 5432
DB_NAME: document_management
DB_USER: postgres
DB_PASSWORD: password
PORT: 3001
HOST: 0.0.0.0
NODE_ENV: production|development
```

**Frontend Configuration:**
```yaml
NEXT_PUBLIC_API_URL: http://localhost:3001
NODE_ENV: production|development
WATCHPACK_POLLING: true  # For development hot reload
```

### Custom Configuration
Create `.env` files to override default settings:

**backend/.env.docker:**
```env
DB_PASSWORD=your_secure_password
PORT=3001
```

**frontend/.env.docker:**
```env
NEXT_PUBLIC_API_URL=http://your-api-domain:3001
```

Then mount these in docker-compose.yml:
```yaml
services:
  backend:
    env_file:
      - ./backend/.env.docker
```

## 🔍 Troubleshooting

### Common Issues

**1. Port conflicts:**
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Change ports in docker-compose.yml if needed
ports:
  - "3002:3000"  # Map to different host port
```

**2. Permission issues:**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

**3. Database connection issues:**
```bash
# Check database health
docker-compose exec postgres pg_isready -U postgres

# View database logs
docker-compose logs postgres

# Connect to database manually
docker-compose exec postgres psql -U postgres -d document_management
```

**4. Build failures:**
```bash
# Clean build cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Health Checks

**Check service health:**
```bash
# Backend health
curl http://localhost:3001/health

# Frontend health
curl http://localhost:3000

# Database health
docker-compose exec postgres pg_isready -U postgres
```

**Container logs:**
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Follow logs
docker-compose logs -f --tail=100
```

## 🚀 Performance Optimization

### Production Optimizations

**1. Multi-stage builds**: Already implemented in Dockerfiles
**2. Non-root users**: Containers run as non-root users
**3. Health checks**: Built-in health monitoring
**4. Volume optimization**: Persistent data storage

### Resource Limits
Add resource limits to docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Scaling
Scale specific services:
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Use load balancer (nginx, traefik, etc.)
```

## 🔐 Security Considerations

### Production Security
1. **Change default passwords**:
   ```yaml
   environment:
     POSTGRES_PASSWORD: your_strong_password_here
   ```

2. **Use secrets management**:
   ```yaml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

3. **Network isolation**:
   ```yaml
   networks:
     frontend:
     backend:
       internal: true
   ```

4. **Read-only containers**:
   ```yaml
   services:
     frontend:
       read_only: true
   ```

## 📊 Monitoring

### Container Monitoring
```bash
# Resource usage
docker stats

# Container information
docker inspect <container_name>

# System information
docker system df
docker system events
```

### Logging
Configure centralized logging:
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🔄 CI/CD Integration

### Example GitHub Actions
```yaml
name: Deploy with Docker
on:
  push:
    branches: [main]
    
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          docker-compose down
          docker-compose pull
          docker-compose up -d
```

### Docker Registry
```bash
# Tag and push images
docker tag document-management-backend:latest your-registry/backend:latest
docker push your-registry/backend:latest

# Update compose file to use registry images
image: your-registry/backend:latest
```

This Docker setup provides a complete containerized environment for development and production deployment of the Document Management System.
