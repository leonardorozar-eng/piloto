# Controle de Estoque - Projeto Base SAEP

API em Node.js, Fastify e PostgreSQL para controle de produtos e movimentacoes de estoque.

Este e o projeto base entregue na avaliacao. Ele esta funcional, porem com toda a
logica (validacoes, regras e SQL) concentrada em um unico arquivo de rotas.

O diretorio `documentação/` traz material de consulta sobre Git, organizacao de codigo,
autenticacao, PostgreSQL e testes.

## Estrutura do projeto

```txt
infra/
  bd.sql                      Script de criacao das tabelas e dados iniciais
src/
  config/
    db.js                     Conexao com o PostgreSQL
  routes/
    estoque.routes.js         Rotas, validacoes, regras e SQL
  server.js                   Inicializacao do servidor
docs/
  testes/                     Evidencias de teste
documentação/                 Material de consulta
referencias.http              Requisicoes de exemplo (extensao REST Client)
package.json
README.md
```

## Instalacao

1. Instale as dependencias (precisa de internet):

```bash
npm install
```

2. Crie o banco de dados `empresa` no pgAdmin, abra o Query Tool nele e execute o
   conteudo de `infra/bd.sql`.

3. Configure as variaveis de ambiente copiando o `.env.example` para `.env`:

```bash
cp .env.example .env
```

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=senai
DB_NAME=empresa
```

4. Inicie a API:

```bash
npm run dev
```

A API sobe em `http://localhost:3000`.

## Endpoints

| Metodo | Rota                      | Descricao                                   |
| ------ | ------------------------- | ------------------------------------------- |
| POST   | `/add_produto`            | Cadastra um produto                         |
| GET    | `/listar_produtos`        | Lista todos os produtos                     |
| GET    | `/listar_produto/:id`     | Consulta um produto pelo id                 |
| PUT    | `/atualizar_produto/:id`  | Atualiza um produto                         |
| DELETE | `/deletar_produto`        | Remove um produto                           |
| POST   | `/movimentar_produto`     | Registra uma movimentacao (somente ENTRADA) |
| GET    | `/listar_movimentacoes`   | Lista as movimentacoes                      |

### POST /add_produto

```json
{
  "nome": "Teclado ABNT2",
  "descricao": "Teclado USB padrao ABNT2 com fio",
  "valor": 89.90,
  "quantidade": 10
}
```

O campo `descricao` e opcional. A `data_cadastro` e preenchida pelo banco.

### PUT /atualizar_produto/:id

```json
{
  "nome": "Teclado ABNT2 preto",
  "descricao": "Teclado USB padrao ABNT2 com fio",
  "valor": 99.90,
  "quantidade": 12
}
```

### DELETE /deletar_produto

```json
{
  "id_produto": 1
}
```

### POST /movimentar_produto

```json
{
  "id_produto": 1,
  "tipo": "ENTRADA",
  "quantidade": 5
}
```

Apenas o tipo `ENTRADA` esta implementado. Outros valores retornam `422`.

### GET /listar_movimentacoes

Retorna todas as movimentacoes com o nome do produto, ordenadas da mais recente
para a mais antiga pelo `id_movimentacao`.

```json
[
  {
    "id_movimentacao": 3,
    "id_produto": 3,
    "nome": "Monitor 21 polegadas",
    "tipo": "ENTRADA",
    "quantidade": 5
  }
]
```
