#!/bin/bash

# Script de Inicialização da EC2
# Este script será executado automaticamente quando a EC2 iniciar

set -e

echo "🚀 Iniciando configuração da EC2..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
sudo yum update -y

# Instalar dependências
echo "🔧 Instalando dependências..."
sudo yum install -y docker git curl wget

# Configurar Docker
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

# Baixar arquivos do projeto (ajuste conforme necessário)
echo "📥 Baixando arquivos do projeto..."
# Opção 1: Se você tiver um repositório Git
# git clone https://github.com/seu-usuario/analisador-de-vendas-aws.git .

# Opção 2: Se você tiver os arquivos em um S3 bucket
# aws s3 sync s3://seu-bucket/analisador-vendas/ .

# Opção 3: Copiar arquivos manualmente via SCP ou outros métodos

# Configurar credenciais AWS (se necessário)
echo "🔑 Configurando credenciais AWS..."
mkdir -p ~/.aws

# Se você usar IAM Role, não precisa configurar credenciais
# Se precisar de credenciais, configure aqui:
# cat > ~/.aws/credentials << 'EOF'
# [default]
# aws_access_key_id = SEU_ACCESS_KEY
# aws_secret_access_key = SEU_SECRET_KEY
# EOF

cat > ~/.aws/config << 'EOF'
[default]
region = us-east-1
output = json
EOF

chmod 600 ~/.aws/credentials 2>/dev/null || true
chmod 600 ~/.aws/config

# Configurar firewall
echo "🔥 Configurando firewall..."
sudo yum install -y firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# Criar script de deploy
echo "📝 Criando script de deploy..."
cat > deploy.sh << 'EOF'
#!/bin/bash

cd /opt/analisador-vendas

# Construir e iniciar containers
echo "🔨 Construindo e iniciando containers..."
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
echo "✅ Verificando status dos containers..."
docker-compose -f docker-compose.prod.yml ps

echo "🎉 Deploy concluído!"
EOF

chmod +x deploy.sh

# Criar script de monitoramento
echo "📊 Criando script de monitoramento..."
cat > monitor.sh << 'EOF'
#!/bin/bash

echo "=== Status dos Containers ==="
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=== Logs do Frontend ==="
docker-compose -f docker-compose.prod.yml logs --tail=20 frontend

echo ""
echo "=== Logs do Backend ==="
docker-compose -f docker-compose.prod.yml logs --tail=20 backend

echo ""
echo "=== Uso de Recursos ==="
docker stats --no-stream
EOF

chmod +x monitor.sh

# Criar script de backup
echo "💾 Criando script de backup..."
cat > backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup dos logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /var/log/nginx/ /opt/analisador-vendas/logs/ 2>/dev/null || true

# Backup dos dados (se houver)
tar -czf $BACKUP_DIR/data_$DATE.tar.gz /opt/analisador-vendas/data/ 2>/dev/null || true

echo "Backup criado: $BACKUP_DIR/logs_$DATE.tar.gz"
echo "Backup criado: $BACKUP_DIR/data_$DATE.tar.gz"

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Configurar cron jobs
echo "⏰ Configurando cron jobs..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/analisador-vendas/backup.sh") | crontab -
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/analisador-vendas/monitor.sh > /opt/analisador-vendas/monitor.log 2>&1") | crontab -

# Criar arquivo de configuração do sistema
echo "⚙️ Criando configuração do sistema..."
cat > /etc/systemd/system/analisador-vendas.service << 'EOF'
[Unit]
Description=Analisador de Vendas AWS
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/analisador-vendas
ExecStart=/opt/analisador-vendas/deploy.sh
ExecStop=/usr/local/bin/docker-compose -f /opt/analisador-vendas/docker-compose.prod.yml down
User=ec2-user
Group=ec2-user

[Install]
WantedBy=multi-user.target
EOF

# Habilitar serviço
sudo systemctl daemon-reload
sudo systemctl enable analisador-vendas.service

echo "✅ Configuração da EC2 concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Copie os arquivos do projeto para /opt/analisador-vendas/"
echo "2. Execute: cd /opt/analisador-vendas && ./deploy.sh"
echo "3. Verifique o status: ./monitor.sh"
echo ""
echo "🔧 Comandos úteis:"
echo "- Ver logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "- Reiniciar: docker-compose -f docker-compose.prod.yml restart"
echo "- Parar: docker-compose -f docker-compose.prod.yml down"
echo "- Backup: ./backup.sh"
echo "- Monitoramento: ./monitor.sh" 