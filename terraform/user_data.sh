#!/bin/bash
set -e
# Instala Docker
apt-get update
apt-get install -y docker.io docker-compose git
systemctl enable docker
systemctl start docker
# Clona o repositório (ajuste a URL se for privado)
cd /home/ubuntu
if [ ! -d analisador-de-vendas-aws ]; then
  git clone https://github.com/seu-usuario/analisador-de-vendas-aws.git
fi
cd analisador-de-vendas-aws
# (Opcional) Checkout branch específica
# git checkout main
# Sobe backend e frontend (ajuste docker-compose.yml depois)
docker-compose up -d 