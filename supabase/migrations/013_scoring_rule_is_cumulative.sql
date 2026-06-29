-- Indica se os valores diários acumulam no período (ex: qtd de vendas)
-- vs. valores que não acumulam (ex: ticket médio, clientes positivados únicos)
alter table scoring_rules add column if not exists is_cumulative boolean not null default false;
