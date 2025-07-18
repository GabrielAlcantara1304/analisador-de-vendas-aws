import boto3
import csv
import os
import tempfile
from collections import defaultdict

def lambda_handler(event, context):
    s3 = boto3.client('s3')
    bucket = os.environ['BUCKET_NAME']
    # Pega o nome do arquivo enviado
    key = event['Records'][0]['s3']['object']['key']
    # Baixa o arquivo CSV
    with tempfile.NamedTemporaryFile() as tmp:
        s3.download_file(bucket, key, tmp.name)
        vendas = []
        with open(tmp.name, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                vendas.append(row)
    # Processa os dados
    vendas_por_regiao = defaultdict(float)
    total_lucro = 0.0
    for venda in vendas:
        regiao = venda['regiao']
        quantidade = float(venda['quantidade'])
        preco = float(venda['preco'])
        receita = quantidade * preco
        vendas_por_regiao[regiao] += receita
        total_lucro += receita
    # Gera relatório CSV
    output_key = key.replace('raw/', 'relatorios/').replace('.csv', '_relatorio.csv')
    with tempfile.NamedTemporaryFile(mode='w+', newline='', encoding='utf-8', delete=False) as out_csv:
        writer = csv.writer(out_csv)
        writer.writerow(['regiao', 'total_receita'])
        for regiao, total in vendas_por_regiao.items():
            writer.writerow([regiao, f'{total:.2f}'])
        writer.writerow([])
        writer.writerow(['total_lucro', f'{total_lucro:.2f}'])
        out_csv.flush()
        s3.upload_file(out_csv.name, bucket, output_key)
    return {
        'statusCode': 200,
        'body': f'Relatório gerado em {output_key}'
    } 