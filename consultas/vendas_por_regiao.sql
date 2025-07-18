SELECT regiao, SUM(quantidade * preco) AS total_receita
FROM "vendas_db"."processed_vendas"
GROUP BY regiao;