#!/bin/bash

# Script de Backup e Restore para Analisador de Vendas AWS
# Facilita a migração de dados entre ambientes

set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="analisador-vendas-backup-$DATE.tar.gz"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Função de backup
backup() {
    print_header "BACKUP - Analisador de Vendas AWS"
    
    # Criar diretório de backup
    mkdir -p "$BACKUP_DIR"
    
    print_message "Criando backup dos arquivos do projeto..."
    
    # Lista de arquivos e diretórios para backup
    BACKUP_ITEMS=(
        "backend/"
        "frontend/"
        "terraform/"
        "consultas/"
        "dados/"
        "docker-compose.yml"
        "README.md"
        "deploy-ec2.sh"
        "ec2-init.sh"
        "INSTRUCOES-DEPLOY.md"
    )
    
    # Verificar se os itens existem antes de fazer backup
    EXISTING_ITEMS=()
    for item in "${BACKUP_ITEMS[@]}"; do
        if [ -e "$item" ]; then
            EXISTING_ITEMS+=("$item")
            print_message "Incluindo: $item"
        else
            print_warning "Item não encontrado: $item"
        fi
    done
    
    # Criar arquivo de backup
    tar -czf "$BACKUP_DIR/$BACKUP_FILE" "${EXISTING_ITEMS[@]}"
    
    if [ $? -eq 0 ]; then
        print_message "Backup criado com sucesso: $BACKUP_DIR/$BACKUP_FILE"
        
        # Mostrar tamanho do backup
        SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
        print_message "Tamanho do backup: $SIZE"
        
        # Listar backups existentes
        echo ""
        print_message "Backups disponíveis:"
        ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || print_warning "Nenhum backup encontrado"
        
    else
        print_error "Erro ao criar backup"
        exit 1
    fi
}

# Função de restore
restore() {
    print_header "RESTORE - Analisador de Vendas AWS"
    
    if [ -z "$1" ]; then
        print_error "Especifique o arquivo de backup para restaurar"
        echo "Uso: $0 restore <arquivo_backup>"
        echo ""
        print_message "Backups disponíveis:"
        ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || print_warning "Nenhum backup encontrado"
        exit 1
    fi
    
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        # Tentar encontrar no diretório de backups
        if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
            BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
        else
            print_error "Arquivo de backup não encontrado: $BACKUP_FILE"
            exit 1
        fi
    fi
    
    print_message "Restaurando de: $BACKUP_FILE"
    
    # Verificar se é um arquivo tar.gz válido
    if ! tar -tzf "$BACKUP_FILE" >/dev/null 2>&1; then
        print_error "Arquivo de backup inválido ou corrompido"
        exit 1
    fi
    
    # Fazer backup do estado atual antes de restaurar
    print_warning "Fazendo backup do estado atual antes de restaurar..."
    CURRENT_BACKUP="backup-before-restore-$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$BACKUP_DIR/$CURRENT_BACKUP" . 2>/dev/null || true
    
    # Extrair backup
    print_message "Extraindo backup..."
    tar -xzf "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        print_message "Restore concluído com sucesso!"
        print_message "Backup do estado anterior salvo em: $BACKUP_DIR/$CURRENT_BACKUP"
    else
        print_error "Erro ao restaurar backup"
        exit 1
    fi
}

# Função para listar backups
list_backups() {
    print_header "BACKUPS DISPONÍVEIS"
    
    if [ -d "$BACKUP_DIR" ]; then
        if [ "$(ls -A "$BACKUP_DIR"/*.tar.gz 2>/dev/null)" ]; then
            echo "Backups encontrados:"
            echo ""
            ls -lh "$BACKUP_DIR"/*.tar.gz | while read line; do
                print_message "$line"
            done
        else
            print_warning "Nenhum backup encontrado no diretório $BACKUP_DIR"
        fi
    else
        print_warning "Diretório de backup não existe: $BACKUP_DIR"
    fi
}

# Função para limpar backups antigos
cleanup() {
    print_header "LIMPEZA DE BACKUPS ANTIGOS"
    
    if [ -z "$1" ]; then
        print_error "Especifique o número de dias para manter backups"
        echo "Uso: $0 cleanup <dias>"
        echo "Exemplo: $0 cleanup 7 (mantém backups dos últimos 7 dias)"
        exit 1
    fi
    
    DAYS="$1"
    
    if [ -d "$BACKUP_DIR" ]; then
        print_message "Removendo backups mais antigos que $DAYS dias..."
        
        # Encontrar e remover backups antigos
        OLD_BACKUPS=$(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$DAYS)
        
        if [ -n "$OLD_BACKUPS" ]; then
            echo "$OLD_BACKUPS" | while read backup; do
                print_warning "Removendo: $backup"
                rm "$backup"
            done
            print_message "Limpeza concluída!"
        else
            print_message "Nenhum backup antigo encontrado"
        fi
    else
        print_warning "Diretório de backup não existe: $BACKUP_DIR"
    fi
}

# Função para mostrar ajuda
show_help() {
    print_header "AJUDA - Script de Backup e Restore"
    
    echo "Uso: $0 [comando] [opções]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  backup                    - Criar backup do projeto"
    echo "  restore <arquivo>         - Restaurar de um backup"
    echo "  list                      - Listar backups disponíveis"
    echo "  cleanup <dias>            - Remover backups mais antigos que X dias"
    echo "  help                      - Mostrar esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 backup"
    echo "  $0 restore analisador-vendas-backup-20241201_143022.tar.gz"
    echo "  $0 restore backups/analisador-vendas-backup-20241201_143022.tar.gz"
    echo "  $0 list"
    echo "  $0 cleanup 7"
    echo ""
    echo "O backup inclui:"
    echo "  - Código fonte (backend, frontend)"
    echo "  - Configurações Terraform"
    echo "  - Scripts de deploy"
    echo "  - Dados e consultas"
    echo "  - Documentação"
}

# Verificar argumentos
case "${1:-help}" in
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    list)
        list_backups
        ;;
    cleanup)
        cleanup "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Comando inválido: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 