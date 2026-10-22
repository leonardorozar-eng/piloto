# Organização do código em camadas

## O problema

No projeto base, o arquivo `src/routes/estoque.routes.js` faz tudo ao mesmo tempo:
recebe a requisição, valida os dados, aplica as regras de negócio e escreve o SQL.
Funciona, mas:

- para mudar uma regra você precisa procurar no meio de SQL e de respostas HTTP;
- o mesmo SQL aparece repetido em várias rotas;
- um arquivo só cresce sem parar quando entram login, perfis, paginação, saída de estoque...

A solução da comunidade é **separar responsabilidades em camadas**: cada arquivo cuida de uma coisa só.

## As camadas

```txt
requisição HTTP
      |
   routes          diz qual URL chama qual função (e quais preHandlers rodam antes)
      |
   controllers     lê request (body, params, query, user) e responde com reply
      |
   services        regras de negócio: validações, "pode ou não pode"
      |
   repositories    SQL: só conversa com o banco
      |
   PostgreSQL
```

| Camada | Pode | Não pode |
| --- | --- | --- |
| routes | registrar URL, método e preHandler | ter SQL ou regra |
| controllers | usar `request` e `reply`, chamar o service | ter SQL |
| services | validar, decidir, lançar erro com status | usar `request`/`reply` ou SQL |
| repositories | `sql.query(...)` | usar `request`/`reply` ou regra de negócio |
| middlewares | funções que rodam antes da rota (ex: autenticar) | |

Esse modelo é conhecido como **arquitetura em camadas** (ou MVC sem a View, porque a API não tem tela).

## Estrutura de pastas

```txt
src/
  config/
    db.js                         conexão (já existe)
  routes/
    produto.routes.js
    movimentacao.routes.js
    usuario.routes.js
  controllers/
    produto.controller.js
    movimentacao.controller.js
    usuario.controller.js
  services/
    produto.service.js
    movimentacao.service.js
    usuario.service.js
  repositories/
    produto.repository.js
    movimentacao.repository.js
    usuario.repository.js
  middlewares/
    autenticar.js
  server.js
```

Os arquivos de usuário e o middleware entram junto com o login (veja `2_usuarios_bcrypt_jwt_e_perfis.md`).
Quando todas as rotas estiverem nos arquivos novos, o `estoque.routes.js` antigo pode ser apagado.

## Exemplo completo: consultar produto pelo id

A rota `GET /listar_produto/:id` do projeto base, separada em camadas.

### repository: só SQL

`src/repositories/produto.repository.js`

```js
import sql from '../config/db.js'

export async function buscarPorId(id) {
  const resultado = await sql.query(
    'SELECT id_produto, nome, descricao, valor_unitario, quantidade, data_cadastro FROM produto WHERE id_produto = $1',
    [id]
  )
  return resultado.rows[0]   // undefined quando não encontra
}

export async function inserir(produto) {
  const resultado = await sql.query(
    'INSERT INTO produto (nome, descricao, valor_unitario, quantidade) VALUES ($1, $2, $3, $4) RETURNING id_produto',
    [produto.nome, produto.descricao, produto.valor, produto.quantidade]
  )
  return resultado.rows[0].id_produto
}
```

### service: regras

`src/services/produto.service.js`

```js
import * as produtoRepository from '../repositories/produto.repository.js'

export async function consultar(id) {
  if (isNaN(Number(id))) {
    throw { status: 422, erro: 'O id informado e invalido' }
  }

  const produto = await produtoRepository.buscarPorId(Number(id))

  if (!produto) {
    throw { status: 404, erro: 'Produto nao encontrado' }
  }

  return produto
}
```

O service não sabe nada de HTTP. Quando algo está errado ele **lança** (`throw`) um objeto com o status
e a mensagem, e quem chamou decide o que fazer.

### controller: request e reply

`src/controllers/produto.controller.js`

```js
import * as produtoService from '../services/produto.service.js'

export async function consultar(request, reply) {
  try {
    const produto = await produtoService.consultar(request.params.id)
    return reply.status(200).send(produto)
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

function responderErro(reply, erro) {
  if (erro.status) {
    return reply.status(erro.status).send({ erro: erro.erro })
  }
  console.log(erro)
  return reply.status(500).send({ erro: 'Erro interno no servidor' })
}
```

Erros que o service lançou de propósito têm `status`. Qualquer outro (banco fora do ar, SQL errado) vira `500`.
Como todos os controllers usam o `responderErro`, ele pode ir para um arquivo próprio
(ex: `src/utils/responderErro.js`) e ser importado onde precisar.

### routes: só o mapa de URLs

`src/routes/produto.routes.js`

```js
import * as produtoController from '../controllers/produto.controller.js'

export default async function produtoRoutes(servidor) {
  servidor.get('/listar_produto/:id', produtoController.consultar)
  servidor.post('/add_produto', produtoController.cadastrar)
  // ... as demais rotas de produto
}
```

### server.js: registra os arquivos de rotas

```js
import Fastify from 'fastify'
import 'dotenv/config'

import produtoRoutes from './routes/produto.routes.js'
import movimentacaoRoutes from './routes/movimentacao.routes.js'

const servidor = Fastify()

servidor.register(produtoRoutes)
servidor.register(movimentacaoRoutes)

const porta = Number(process.env.PORT) || 3000

servidor.listen({ port: porta }, (erro) => {
  if (erro) {
    console.log(erro)
    process.exit(1)
  }
  console.log('Servidor rodando na porta ' + porta)
})
```

## Detalhes do JavaScript que fazem diferença

- O projeto usa **ES Modules** (`"type": "module"` no `package.json`). Por isso é `import`/`export`, e o caminho
  do import **precisa terminar em `.js`**: `'../services/produto.service.js'`. Sem o `.js` dá `ERR_MODULE_NOT_FOUND`.
- `export async function nome()` exporta várias funções do mesmo arquivo.
  `import * as produtoService from '...'` importa todas de uma vez: `produtoService.consultar(...)`.
- `export default` é uma exportação só por arquivo (usado nos arquivos de rotas, para o `servidor.register`).
- O Fastify passa o `servidor` para a função registrada. Dentro dela, `servidor.get(...)`, `servidor.post(...)` etc.
  funcionam igual ao `server.js`.

## Mantendo o comportamento

Reorganizar **não muda** o que a API faz: as mesmas URLs, os mesmos status e as mesmas mensagens.
Depois de mover uma rota, rode o `referencias.http` de novo e confira se as respostas continuam iguais.

## README

O `README.md` descreve a estrutura de pastas e a lista de endpoints. Quando a estrutura mudar ou entrar
rota nova (login, cadastro de usuário, saída, filtros), atualize as duas partes.

Documentação oficial: Fastify > Reference > Routes, Plugins e Encapsulation; Node.js > ECMAScript modules.
