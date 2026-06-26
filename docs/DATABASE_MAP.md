# DATABASE MAP — ShareScreen LAN

Mapeamento do banco de dados do projeto. A aplicação utiliza um banco relacional em arquivo local **SQLite** gerenciado pela biblioteca **better-sqlite3** com suporte a WAL (Write-Ahead Logging).

## Informações Gerais
* **Motor de Banco de Dados:** SQLite 3.
* **Arquivo do Banco Físico:** `data/sharescreen.db` (Criado automaticamente na primeira execução).
* **Diretório Associado:** `data/lower-thirds/` (Armazena os vídeos WebM de lower-thirds vinculados às linhas da tabela).
* **Código de Inicialização/Consultas:** [client-db.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/client-db.js).

---

## Estrutura das Tabelas (Schema)

O esquema é definido e executado via código JS com declarações DDL de `CREATE TABLE IF NOT EXISTS` na função `getDb()`.

### Tabela 1: `clients`
Mapeia os computadores da LAN aos respectivos usuários cadastrados.

| Campo | Tipo SQL | Chave/Índice | Descrição |
| --- | --- | --- | --- |
| `name` | `TEXT` | `PRIMARY KEY` (Collate NOCASE) | Nome amigável e único do usuário/exibição. |
| `ip` | `TEXT` | `NOT NULL` (Índice: `idx_clients_ip`) | Endereço IP atual da máquina na rede local (IPv4). |
| `computer_name` | `TEXT` | `NOT NULL DEFAULT ''` (Índice: `idx_clients_computer`) | Nome do computador host no domínio da rede. |
| `updated_at` | `INTEGER` | `NOT NULL` | Timestamp em milissegundos da última modificação. |

### Tabela 2: `lower_thirds`
Armazena metadados e arquivos de vídeo de Lower Thirds (legendas/revestimentos de vídeo com transparência).

| Campo | Tipo SQL | Chave/Índice | Descrição |
| --- | --- | --- | --- |
| `client_name` | `TEXT` | `PRIMARY KEY` (Collate NOCASE) | Nome do cliente associado (liga-se a `clients.name`). |
| `filename` | `TEXT` | `NOT NULL` | Nome do arquivo físico em `data/lower-thirds/`. |
| `width` | `INTEGER` | `NOT NULL` | Largura de renderização do overlay na tela do espectador. |
| `height` | `INTEGER` | `NOT NULL` | Altura de renderização do overlay na tela do espectador. |
| `orig_width` | `INTEGER` | `NOT NULL` | Largura original do arquivo de vídeo importado. |
| `orig_height` | `INTEGER` | `NOT NULL` | Altura original do arquivo de vídeo importado. |
| `chroma_color` | `TEXT` | `NOT NULL DEFAULT '#00FF00'` | Cor hexadecimal que será transparente via Chroma Key. |
| `chroma_tolerance` | `INTEGER` | `NOT NULL DEFAULT 40` | Tolerância de variação da cor na remoção de fundo (5 a 120). |
| `updated_at` | `INTEGER` | `NOT NULL` | Timestamp em milissegundos da última modificação. |

---

## Relacionamentos

* **Clientes <-> Lower Thirds (1:1):** Relacionamento de um para um conceitual no nível da aplicação. A chave `lower_thirds.client_name` mapeia-se para `clients.name`. Não há restrição física de chave estrangeira (`FOREIGN KEY`) no banco SQL, a integridade é tratada na lógica do backend em [client-db.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/client-db.js).

---

## Migrações de Schema

Não há frameworks de migração (como Knex ou Sequelize). As migrações ocorrem de forma imperativa:
1. Ao iniciar o banco em `getDb()`, roda-se o `CREATE TABLE IF NOT EXISTS`.
2. A função `migrateClientSchema(db)` lê a estrutura da tabela usando `PRAGMA table_info(clients)`.
3. Se a coluna `computer_name` não existir na tabela `clients`, ela executa o comando `ALTER TABLE clients ADD COLUMN...` e cria o respectivo índice.

---

## Cuidados antes de alterar o Schema (Guia IA)

* **WAL Mode:** O banco executa em modo WAL (`PRAGMA journal_mode = WAL`). Isso gera os arquivos extras `sharescreen.db-shm` e `sharescreen.db-wal` no diretório `/data`. **Nunca delete esses arquivos** enquanto a aplicação estiver rodando.
* **Permissões de Escrita:** O SQLite é extremamente sensível a permissões de disco. Se rodar em servidores Windows onde a pasta `data/` está compartilhada via rede (UNC), erros de `SQLITE_READONLY` podem ocorrer.
  * Para corrigir permissões em produção, execute o script: [fix-data-permissoes.bat](file:///e:/Projetos/Trabalho/Screen%20Share/fix-data-permissoes.bat).
* **Modificar estrutura:** Ao adicionar novas colunas ou tabelas, faça-o de forma compatível com o banco existente em [client-db.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/client-db.js) inserindo queries condicionais ou checagem de colunas para evitar erros de execução.

---

## Carga Inicial (Seeding)

Se o banco SQLite for criado do zero e estiver vazio:
1. O servidor tentará ler o arquivo [users.json](file:///e:/Projetos/Trabalho/Screen%20Share/users.json) na raiz do projeto.
2. Irá disparar a rotina `seedUsersIfEmpty(usersJsonPath)` para popular os cadastros padrão (nome, IP, computador).
3. Em todo startup e a cada 24 horas, o servidor tambem sincroniza os IPs atuais por `computer_name` via ping/DNS e atualiza `clients.ip` e `users.json` quando houver mudanca.
4. Desenvolvedores também podem re-forçar essa importação chamando o endpoint `/api/admin/seed` (disponível apenas em modo DEV).
