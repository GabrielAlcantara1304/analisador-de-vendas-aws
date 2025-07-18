# 🚀 Instruções de Deploy - Analisador de Vendas AWS

## 📋 Visão Geral
Este guia explica como migrar o sistema do local para uma EC2 atrás de um Application Load Balancer (ALB) com HTTPS no domínio `loja-aws.com`.

## 🏗️ Arquitetura
```
Internet → ALB (HTTPS) → EC2 (HTTP) → Docker Containers
           ↓
    loja-aws.com
```

## 📁 Arquivos Criados
- `deploy-ec2.sh` - Script de deploy completo
- `ec2-init.sh` - Script de inicialização da EC2
- `terraform/alb-ec2.tf` - Infraestrutura Terraform
- `INSTRUCOES-DEPLOY.md` - Este arquivo

## 🔧 Pré-requisitos

### 1. Certificado SSL
- Obtenha um certificado SSL para `loja-aws.com` no AWS Certificate Manager (ACM)
- Certifique-se de que está na região `us-east-1`

### 2. Key Pair
- Crie ou use uma key pair existente para acessar a EC2

### 3. IAM Role (Recomendado)
- Crie um IAM Role com permissões para S3, Lambda e outros serviços AWS
- Anexe o role à EC2

## 🚀 Passo a Passo

### Passo 1: Configurar Terraform

1. **Editar `terraform/alb-ec2.tf`:**
   ```bash
   # Substitua estas linhas:
   key_name = "sua-key-pair"  # Sua key pair
   certificate_arn = "arn:aws:acm:us-east-1:SEU_ACCOUNT_ID:certificate/SEU_CERTIFICATE_ID"
   ```

2. **Aplicar Terraform:**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

### Passo 2: Preparar Arquivos para EC2

1. **Criar arquivo de configuração do Nginx para produção:**
   ```bash
   # O arquivo nginx-prod.conf será criado automaticamente pelo script
   ```

2. **Criar Docker Compose para produção:**
   ```bash
   # O arquivo docker-compose.prod.yml será criado automaticamente
   ```

### Passo 3: Deploy na EC2

#### Opção A: Usando Script Automático
1. **Conectar na EC2:**
   ```bash
   ssh -i sua-key.pem ec2-user@IP_DA_EC2
   ```

2. **Executar script de inicialização:**
   ```bash
   # Copiar o arquivo ec2-init.sh para a EC2
   chmod +x ec2-init.sh
   ./ec2-init.sh
   ```

3. **Copiar arquivos do projeto:**
   ```bash
   # Via SCP
   scp -r -i sua-key.pem . ec2-user@IP_DA_EC2:/opt/analisador-vendas/
   
   # Ou via Git
   cd /opt/analisador-vendas
   git clone https://github.com/seu-usuario/analisador-de-vendas-aws.git .
   ```

4. **Executar deploy:**
   ```bash
   cd /opt/analisador-vendas
   ./deploy.sh
   ```

#### Opção B: Deploy Manual
1. **Instalar dependências:**
   ```bash
   sudo yum update -y
   sudo yum install -y docker git
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -a -G docker ec2-user
   ```

2. **Instalar Docker Compose:**
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Copiar arquivos e executar:**
   ```bash
   cd /opt/analisador-vendas
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Passo 4: Configurar DNS

1. **Se usar Route 53 (configurado no Terraform):**
   - O DNS será configurado automaticamente

2. **Se usar outro provedor DNS:**
   - Configure um registro A apontando para o DNS do ALB
   - Exemplo: `loja-aws.com` → `analisador-vendas-alb-123456789.us-east-1.elb.amazonaws.com`

### Passo 5: Verificar Funcionamento

1. **Verificar containers:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Verificar logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

3. **Testar health check:**
   ```bash
   curl http://IP_DA_EC2/health
   # Deve retornar: healthy
   ```

4. **Acessar aplicação:**
   - Abra `https://loja-aws.com` no navegador

## 🔍 Monitoramento e Manutenção

### Comandos Úteis
```bash
# Ver status dos containers
./monitor.sh

# Ver logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f

# Reiniciar serviços
docker-compose -f docker-compose.prod.yml restart

# Parar serviços
docker-compose -f docker-compose.prod.yml down

# Backup
./backup.sh

# Atualizar aplicação
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Logs
- **Nginx:** `/var/log/nginx/`
- **Docker:** `docker-compose -f docker-compose.prod.yml logs`
- **Sistema:** `/var/log/messages`

## 🔒 Segurança

### Security Groups
- ALB: Portas 80 e 443 abertas para internet
- EC2: Apenas portas 80 e 8000 do ALB

### Certificado SSL
- Configurado no ALB
- Redirecionamento automático HTTP → HTTPS

### Credenciais AWS
- Use IAM Role quando possível
- Se usar credenciais, configure em `~/.aws/`

## 🚨 Troubleshooting

### Problemas Comuns

1. **Health Check falhando:**
   ```bash
   # Verificar se o endpoint /health está funcionando
   curl http://localhost/health
   ```

2. **Containers não iniciam:**
   ```bash
   # Verificar logs
   docker-compose -f docker-compose.prod.yml logs
   
   # Verificar recursos
   docker stats
   ```

3. **Problemas de conectividade:**
   ```bash
   # Verificar security groups
   # Verificar route tables
   # Verificar firewall
   sudo firewall-cmd --list-all
   ```

4. **Problemas de DNS:**
   ```bash
   # Verificar resolução
   nslookup loja-aws.com
   dig loja-aws.com
   ```

### Logs de Debug
```bash
# Logs do ALB
aws logs describe-log-groups --log-group-name-prefix "/aws/applicationloadbalancer"

# Logs da EC2
sudo journalctl -u docker
sudo journalctl -u analisador-vendas.service
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs
2. Teste localmente primeiro
3. Verifique configurações de rede
4. Consulte a documentação da AWS

## 🔄 Atualizações

Para atualizar a aplicação:
```bash
cd /opt/analisador-vendas
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## 💰 Custos Estimados

- **EC2 t3.medium:** ~$30/mês
- **ALB:** ~$20/mês
- **Data Transfer:** ~$10/mês
- **Total estimado:** ~$60/mês

---

**✅ Deploy concluído!** Sua aplicação estará disponível em `https://loja-aws.com` 