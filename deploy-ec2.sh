#!/bin/bash

# Script de Deploy para EC2 com ALB
# Domínio: loja-aws.com

set -e

echo "🚀 Iniciando deploy na EC2..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
sudo yum update -y
sudo yum install -y docker git

# Iniciar e habilitar Docker
echo "🐳 Configurando Docker..."
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Instalar Docker Compose
echo "📋 Instalando Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Criar diretório do projeto
echo "📁 Criando estrutura de diretórios..."
sudo mkdir -p /opt/analisador-vendas
sudo chown ec2-user:ec2-user /opt/analisador-vendas
cd /opt/analisador-vendas

# Clonar ou copiar código (ajuste conforme necessário)
# git clone <seu-repositorio> .
# ou copiar arquivos manualmente

# Criar arquivo de configuração do Nginx para produção
echo "⚙️ Configurando Nginx para produção..."
cat > nginx-prod.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Redirecionar HTTP para HTTPS (será configurado pelo ALB)
    return 301 https://$host$request_uri;
}

server {
    listen 80;
    server_name _;
    
    # Configuração para ALB health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # API routes
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://backend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Frontend
    location / {
        root   /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        
        # Cache estático
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
}
EOF

# Criar Docker Compose para produção
echo "🐳 Criando Docker Compose para produção..."
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - BUCKET_NAME=gabriel-datalake-vendas
      - AWS_REGION=us-east-1
    ports:
      - "8000:80"
    volumes:
      - ~/.aws:/root/.aws:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build: 
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
    environment:
      - REACT_APP_API_URL=/api
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  default:
    driver: bridge
EOF

# Criar Dockerfile de produção para frontend
echo "🏗️ Criando Dockerfile de produção para frontend..."
cat > frontend/Dockerfile.prod << 'EOF'
FROM node:20-alpine as build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache curl

# Copiar build do React
COPY --from=build /app/build /usr/share/nginx/html

# Copiar configuração do Nginx
COPY nginx-prod.conf /etc/nginx/conf.d/default.conf

# Criar diretório de logs
RUN mkdir -p /var/log/nginx

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Copiar configuração do Nginx
cp nginx-prod.conf frontend/nginx-prod.conf

# Configurar credenciais AWS (ajuste conforme necessário)
echo "🔑 Configurando credenciais AWS..."
mkdir -p ~/.aws
cat > ~/.aws/credentials << 'EOF'
[default]
aws_access_key_id = SEU_ACCESS_KEY_AQUI
aws_secret_access_key = SEU_SECRET_KEY_AQUI
EOF

cat > ~/.aws/config << 'EOF'
[default]
region = us-east-1
output = json
EOF

chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config

# Construir e iniciar containers
echo "🔨 Construindo e iniciando containers..."
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
echo "✅ Verificando status dos containers..."
docker-compose -f docker-compose.prod.yml ps

# Configurar firewall (se necessário)
echo "🔥 Configurando firewall..."
sudo yum install -y firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

echo "🎉 Deploy concluído!"
echo "📋 Próximos passos:"
echo "1. Configure o ALB para apontar para esta EC2 na porta 80"
echo "2. Configure o certificado SSL no ALB"
echo "3. Configure o target group para health check em /health"
echo "4. Configure o DNS do domínio loja-aws.com para apontar para o ALB"
echo ""
echo "🔍 Para verificar logs:"
echo "docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🔄 Para reiniciar:"
echo "docker-compose -f docker-compose.prod.yml restart" 