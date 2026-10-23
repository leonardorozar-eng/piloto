# Controle de Estoque - Almoxarifado SAEP

API em Node.js, Fastify e PostgreSQL para controle de produtos e movimentacoes de estoque.
Nao ha frontend: o uso e feito por requisicoes HTTP.

O codigo esta organizado em camadas (rotas, controllers, services e repositories).
Cada camada conversa somente com a camada de baixo.

## Estrutura do projeto

```txt
infra/
  bd.sql                      Tabelas produto e movimentacao e dados iniciais
  alteracoes.sql              Usuarios, data/hora da movimentacao e GRANT dos perfis
src/
  config/
    db.js                     Conexoes PostgreSQL (postgres, operador e admin)
  routes/                     URLs e preHandler de autenticacao
  controllers/                Le a requisicao e responde
  services/                   Regras de negocio
  repositories/               SQL
  middlewares/
    autenticar.js             JWT e permissao por perfil
  utils/
    responderErro.js          Resposta padrao de erro
  server.js                   Inicializacao do servidor
docs/
  plano_testes.docx           Plano dos cenarios de saida de produto
  testes/                     Evidencias cenario1, cenario2 e cenario3
documentação/                 Material de consulta do projeto base
referencias.http              Requisicoes de exemplo (extensao REST Client)
resultados.docx               Resultado da execucao dos testes
package.json
README.md
```

## Perfis

| Acao              | OPERADOR | ADMIN |
| ----------------- | -------- | ----- |
| Consultar (GET)   | sim      | sim   |
| Inserir (POST)    | sim      | sim   |
| Atualizar (PUT)   | sim      | sim   |
| Deletar (DELETE)  | nao      | sim   |

O perfil vai no token JWT. As rotas (exceto cadastro e login) exigem `Authorization: Bearer <token>`.
No PostgreSQL, as roles `operador_almox` e `admin_almox` recebem os mesmos privilegios por `GRANT`.
A API abre a conexao da role conforme o perfil autenticado.

O cadastro (`POST /usuarios`) e o login (`POST /login`) sao publicos, para ser possivel criar o primeiro usuario.
A senha e gravada com bcrypt.

## Instalacao

1. Instale as dependencias (precisa de internet):

```bash
npm install
```

2. No pgAdmin 4, crie o banco `empresa` (botao direito em Databases > Create > Database).
   Abra o Query Tool desse banco e execute, nesta ordem:

- `infra/bd.sql`
- `infra/alteracoes.sql`

O segundo script cria a tabela `usuario`, as colunas `data_hora` e `id_usuario` em `movimentacao`,
dois usuarios iniciais e as roles com `GRANT`.

Usuarios criados pelo script:

| Nome             | E-mail              | Senha    | Perfil   |
| ---------------- | ------------------- | -------- | -------- |
| Ana Admin        | ana@empresa.com     | admin123 | ADMIN    |
| Otavio Operador  | otavio@empresa.com  | oper123  | OPERADOR |

3. Copie o `.env.example` para `.env` e ajuste a senha do PostgreSQL da sua maquina:

```bash
cp .env.example .env
```

4. Inicie a API:

```bash
npm run dev
```

A API sobe em `http://localhost:3000`.

## Endpoints

| Metodo | Rota                     | Quem acessa        | Descricao                                      |
| ------ | ------------------------ | ------------------ | ---------------------------------------------- |
| POST   | `/usuarios`              | publico            | Cadastra usuario (perfil OPERADOR ou ADMIN)    |
| POST   | `/login`                 | publico            | Autentica e devolve o token                    |
| POST   | `/add_produto`           | OPERADOR e ADMIN   | Cadastra um produto                            |
| GET    | `/listar_produtos`       | OPERADOR e ADMIN   | Lista produtos com paginacao e filtros         |
| GET    | `/listar_produto/:id`    | OPERADOR e ADMIN   | Consulta um produto pelo id                    |
| PUT    | `/atualizar_produto/:id` | OPERADOR e ADMIN   | Atualiza um produto                            |
| DELETE | `/deletar_produto`       | ADMIN              | Remove um produto sem movimentacao             |
| POST   | `/movimentar_produto`    | OPERADOR e ADMIN   | Registra ENTRADA ou SAIDA                      |
| GET    | `/listar_movimentacoes`  | OPERADOR e ADMIN   | Lista movimentacoes com data/hora e usuario    |

### GET /listar_produtos

Query opcional: `pagina`, `limite`, `nome`, `data_inicio`, `data_fim` (`AAAA-MM-DD`).

```txt
GET /listar_produtos?pagina=1&limite=10&nome=mouse&data_inicio=2026-01-01&data_fim=2026-12-31
```

A resposta traz `pagina`, `limite`, `total`, `total_paginas` e `dados`.

### POST /movimentar_produto

```json
{
  "id_produto": 2,
  "tipo": "SAIDA",
  "quantidade": 5
}
```

`tipo` aceita `ENTRADA` ou `SAIDA`. A data/hora e o usuario responsavel vem do banco e do token.
O usuario nao e enviado no corpo.

Saida com quantidade maior que o saldo responde `422`:

```json
{
  "erro": "Saída não permitida: estoque insuficiente. Disponível: 25. Solicitado: 30."
}
```

Quantidade menor ou igual ao saldo registra a movimentacao e atualiza o saldo na mesma transacao.
Sem token a rota responde `401`. Operador tentando deletar responde `403`.

## Testes

O plano esta em `docs/plano_testes.docx`. As evidencias ficam em `docs/testes/` (`cenario1.txt`, `cenario2.txt`, `cenario3.txt`).
O comparativo da execucao esta em `resultados.docx`, na raiz do projeto.
