#!/bin/sh
# Roda uma vez, na criação do banco. Papéis separados (D4): o app é dono das tabelas; o worker só recebe
# SELECT e UPDATE em tarefas_midia, concedidos pela migration que cria a tabela.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE ROLE maquina_app LOGIN PASSWORD '${DB_APP_PASSWORD}';
CREATE ROLE maquina_worker LOGIN PASSWORD '${DB_WORKER_PASSWORD}';
GRANT ALL ON SCHEMA public TO maquina_app;
ALTER DATABASE ${POSTGRES_DB} OWNER TO maquina_app;
SQL
