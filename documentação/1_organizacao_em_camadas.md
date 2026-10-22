# Organização do código em camadas

## Como o projeto base funciona hoje

```txt
src/
  config/
    db.js                 conexão com o PostgreSQL
  routes/
    estoque.routes.js     TODAS as rotas, validações, regras e SQL
  server.js               cria o Fastify, registra as rotas e liga o servidor
```

### db.js: a conexão

```js
import { Pool } from 'pg'
import 'dotenv/config'

const sql = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'senai',
  database: process.env.DB_NAME || 'empresa'
})

export default sql
```

- `Pool` é um conjunto de conexões abertas com o banco, reaproveitadas a cada consulta.
  É o mesmo `new Pool({...})` das aulas, só que num arquivo próprio.
- `import 'dotenv/config'` lê o arquivo `.env` da raiz e coloca cada linha em `process.env`.
  `DB_PASSWORD=senai` no `.env` vira `process.env.DB_PASSWORD` no código.
- O `||` é o valor usado quando a variável não existe no `.env`.
- `export default sql`: qualquer arquivo que precisar do banco faz `import sql from '../config/db.js'`.
  Existe **um** Pool só para o projeto inteiro.

O `.env` não vem no clone (está no `.gitignore`). Crie copiando o modelo:

```bash
cp .env.example .env
```

e ajuste a senha do PostgreSQL da sua máquina.

### server.js: o ponto de partida

```js
import Fastify from 'fastify'
import 'dotenv/config'

import estoqueRoutes from './routes/estoque.routes.js'

const servidor = Fastify()

servidor.register(estoqueRoutes)

const porta = Number(process.env.PORT) || 3000

servidor.listen({ port: porta }, (erro) => { ... })
```

`servidor.register(estoqueRoutes)` chama a função exportada pelo arquivo de rotas passando o `servidor`.
É isso que permite escrever rotas em outro arquivo.

### estoque.routes.js: um plugin do Fastify

```js
import sql from '../config/db.js'

export default async function estoqueRoutes(servidor) {
  servidor.post('/add_produto', async (request, reply) => {
    // valida o body
    // faz o SQL
    // responde
  })
  // ... todas as outras rotas
}
```

Toda função registrada com `servidor.register` recebe o `servidor` e pode criar rotas nele, igual ao `server.js`
das aulas. No Fastify isso se chama **plugin**.

## O problema

O `estoque.routes.js` faz tudo ao mesmo tempo: recebe a requisição, valida, aplica regra de negócio e escreve SQL.
Funciona, mas:

- para mudar uma regra é preciso procurar no meio de SQL e de respostas HTTP;
- a mesma validação aparece copiada em várias rotas (o cadastro e a atualização validam os mesmos campos);
- o arquivo só cresce quando entram login, perfis, paginação e saída de estoque.

A solução reconhecida pela comunidade é **separar responsabilidades em camadas**: cada arquivo cuida de uma coisa só.

## As camadas

```txt
requisição HTTP
      |
   routes          qual URL chama qual função (e quais preHandlers rodam antes)
      |
   controllers     lê request (body, params, query, user) e responde com reply
      |
   services        regras de negócio: validações, "pode ou não pode"
      |
   repositories    SQL: só conversa com o banco (usa o sql do db.js)
      |
   PostgreSQL
```

| Camada | Pode | Não pode |
| --- | --- | --- |
| routes | registrar URL, método e preHandler | ter SQL ou regra |
| controllers | usar `request` e `reply`, chamar o service | ter SQL |
| services | validar, decidir, lançar erro com status | usar `request`/`reply` ou SQL |
| repositories | `sql.query(...)` | usar `request`/`reply` ou regra de negócio |
| config | conexão com o banco (`db.js`) | |
| middlewares | funções que rodam antes da rota (ex: autenticar) | |
| utils | funções pequenas usadas por várias camadas | |

Isso é a **arquitetura em camadas**, parente do MVC: o controller é o C, o repository faz o papel do M.
Não existe a View porque a API devolve JSON, não tela.

A regra de ouro: cada camada só conversa com a **camada logo abaixo**.
O controller nunca faz SQL; o repository nunca decide status HTTP.

## Estrutura de pastas

```txt
src/
  config/
    db.js                         (já existe, continua igual)
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
  utils/
    responderErro.js
  server.js
```

Os arquivos de usuário e o middleware entram junto com o login (`2_usuarios_bcrypt_jwt_e_perfis.md`).

## utils/responderErro.js: um tratamento de erro para todos

Os services avisam que algo está errado **lançando** um objeto com status e mensagem:

```js
throw { status: 404, erro: 'Produto nao encontrado' }
```

Os controllers pegam esse objeto no `catch` e transformam em resposta HTTP. Como todos fazem igual,
a função fica num arquivo só:

`src/utils/responderErro.js`

```js
export function responderErro(reply, erro) {
  if (erro.status) {
    return reply.status(erro.status).send({ erro: erro.erro })
  }
  console.log(erro)
  return reply.status(500).send({ erro: 'Erro interno no servidor' })
}
```

Erro com `status` é um erro de regra, lançado de propósito. Qualquer outro (banco fora do ar, SQL errado)
vira `500` e aparece no terminal para você investigar.

## Produto em camadas (todas as rotas)

As mesmas rotas, os mesmos status e as mesmas mensagens do projeto base, agora separados.

### repository: só SQL

`src/repositories/produto.repository.js`

```js
import sql from '../config/db.js'

const CAMPOS = 'id_produto, nome, descricao, valor_unitario, quantidade, data_cadastro'

export async function listar() {
  const resultado = await sql.query('SELECT ' + CAMPOS + ' FROM produto ORDER BY id_produto')
  return resultado.rows
}

export async function buscarPorId(id) {
  const resultado = await sql.query('SELECT ' + CAMPOS + ' FROM produto WHERE id_produto = $1', [id])
  return resultado.rows[0]   // undefined quando não encontra
}

export async function inserir(produto) {
  const resultado = await sql.query(
    'INSERT INTO produto (nome, descricao, valor_unitario, quantidade) VALUES ($1, $2, $3, $4) RETURNING id_produto',
    [produto.nome, produto.descricao, produto.valor, produto.quantidade]
  )
  return resultado.rows[0].id_produto
}

export async function atualizar(id, produto) {
  const resultado = await sql.query(
    'UPDATE produto SET nome = $1, descricao = $2, valor_unitario = $3, quantidade = $4 WHERE id_produto = $5',
    [produto.nome, produto.descricao, produto.valor, produto.quantidade, id]
  )
  return resultado.rowCount   // quantas linhas mudaram (0 = não existe)
}

export async function possuiMovimentacoes(id) {
  const resultado = await sql.query('SELECT 1 FROM movimentacao WHERE id_produto = $1 LIMIT 1', [id])
  return resultado.rows.length > 0
}

export async function remover(id) {
  const resultado = await sql.query('DELETE FROM produto WHERE id_produto = $1', [id])
  return resultado.rowCount
}
```

- `rows`: as linhas que voltaram do `SELECT` (ou do `RETURNING`).
- `rowCount`: quantas linhas o `UPDATE`/`DELETE` alterou. Zero quer dizer que o id não existe.
- O repository **não** decide se zero é erro. Ele só informa; quem decide é o service.

### service: validações e regras

`src/services/produto.service.js`

```js
import * as produtoRepository from '../repositories/produto.repository.js'

function validarId(id, mensagem = 'O id informado e invalido') {
  if (id === undefined || id === null || isNaN(Number(id))) {
    throw { status: 422, erro: mensagem }
  }
  return Number(id)
}

function validarDados(dados) {
  const { nome, descricao, valor, quantidade } = dados || {}

  if (!nome || nome.trim() === '') {
    throw { status: 422, erro: 'O campo nome e obrigatorio' }
  }
  if (valor === undefined || valor === null || isNaN(Number(valor)) || Number(valor) < 0) {
    throw { status: 422, erro: 'O campo valor deve ser um numero maior ou igual a zero' }
  }
  if (quantidade === undefined || quantidade === null || isNaN(Number(quantidade)) || Number(quantidade) < 0) {
    throw { status: 422, erro: 'O campo quantidade deve ser um numero maior ou igual a zero' }
  }

  return { nome, descricao: descricao || null, valor: Number(valor), quantidade: Number(quantidade) }
}

export async function listar() {
  return produtoRepository.listar()
}

export async function consultar(id) {
  const produto = await produtoRepository.buscarPorId(validarId(id))
  if (!produto) {
    throw { status: 404, erro: 'Produto nao encontrado' }
  }
  return produto
}

export async function cadastrar(dados) {
  const produto = validarDados(dados)
  return produtoRepository.inserir(produto)
}

export async function atualizar(id, dados) {
  const idValido = validarId(id)
  const produto = validarDados(dados)

  const alterados = await produtoRepository.atualizar(idValido, produto)
  if (alterados === 0) {
    throw { status: 404, erro: 'Produto nao encontrado' }
  }
}

export async function remover(id) {
  const idValido = validarId(id, 'O campo id_produto e obrigatorio')

  if (await produtoRepository.possuiMovimentacoes(idValido)) {
    throw { status: 409, erro: 'O produto possui movimentacoes e nao pode ser removido' }
  }

  const removidos = await produtoRepository.remover(idValido)
  if (removidos === 0) {
    throw { status: 404, erro: 'Produto nao encontrado' }
  }
}
```

- `validarDados` é usado no cadastro **e** na atualização: a validação existe num lugar só.
  No projeto base ela estava copiada nas duas rotas.
- Funções sem `export` (`validarId`, `validarDados`) só existem dentro deste arquivo.
- `mensagem = '...'` é um valor padrão: quando a função é chamada sem o segundo parâmetro, usa esse texto.

### controller: request e reply

`src/controllers/produto.controller.js`

```js
import * as produtoService from '../services/produto.service.js'
import { responderErro } from '../utils/responderErro.js'

export async function listar(request, reply) {
  try {
    const produtos = await produtoService.listar()
    return reply.status(200).send(produtos)
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

export async function consultar(request, reply) {
  try {
    const produto = await produtoService.consultar(request.params.id)
    return reply.status(200).send(produto)
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

export async function cadastrar(request, reply) {
  try {
    const id = await produtoService.cadastrar(request.body)
    return reply.status(201).send({ mensagem: 'Produto cadastrado com sucesso', id_produto: id })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

export async function atualizar(request, reply) {
  try {
    await produtoService.atualizar(request.params.id, request.body)
    return reply.status(200).send({ mensagem: 'Produto atualizado com sucesso' })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

export async function remover(request, reply) {
  try {
    const body = request.body || {}
    await produtoService.remover(body.id_produto)
    return reply.status(200).send({ mensagem: 'Produto removido com sucesso' })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}
```

Todo controller tem o mesmo formato: pega os dados do `request`, chama o service, responde.
Se o service lançar erro, o `catch` responde.

### routes: só o mapa de URLs

`src/routes/produto.routes.js`

```js
import * as produtoController from '../controllers/produto.controller.js'

export default async function produtoRoutes(servidor) {
  servidor.get('/listar_produtos', produtoController.listar)
  servidor.get('/listar_produto/:id', produtoController.consultar)
  servidor.post('/add_produto', produtoController.cadastrar)
  servidor.put('/atualizar_produto/:id', produtoController.atualizar)
  servidor.delete('/deletar_produto', produtoController.remover)
}
```

Lendo só este arquivo dá para ver todas as rotas de produto. Os `preHandler` de autenticação e perfil
entram aqui (veja `2_usuarios_bcrypt_jwt_e_perfis.md`).

## Movimentação em camadas

O mesmo desenho. Aqui está a entrada de estoque como ela é no projeto base; a versão com data/hora,
usuário e saída está em `4_movimentacoes_data_usuario_e_saida.md` e substitui estas funções.

`src/repositories/movimentacao.repository.js`

```js
import sql from '../config/db.js'

export async function registrarEntrada(idProduto, quantidade) {
  await sql.query(
    'INSERT INTO movimentacao (id_produto, tipo, quantidade) VALUES ($1, $2, $3)',
    [idProduto, 'ENTRADA', quantidade]
  )
  const resultado = await sql.query(
    'UPDATE produto SET quantidade = quantidade + $1 WHERE id_produto = $2 RETURNING quantidade',
    [quantidade, idProduto]
  )
  return resultado.rows[0].quantidade
}

export async function listar() {
  const resultado = await sql.query(
    'SELECT m.id_movimentacao, m.id_produto, p.nome, m.tipo, m.quantidade ' +
    'FROM movimentacao m ' +
    'INNER JOIN produto p ON p.id_produto = m.id_produto ' +
    'ORDER BY m.id_movimentacao DESC'
  )
  return resultado.rows
}
```

`src/services/movimentacao.service.js`

```js
import * as movimentacaoRepository from '../repositories/movimentacao.repository.js'
import * as produtoRepository from '../repositories/produto.repository.js'

export async function registrar(dados) {
  const { id_produto, tipo, quantidade } = dados || {}

  if (id_produto === undefined || id_produto === null || isNaN(Number(id_produto))) {
    throw { status: 422, erro: 'O campo id_produto e obrigatorio' }
  }
  if (tipo !== 'ENTRADA') {
    throw { status: 422, erro: 'Somente movimentacoes do tipo ENTRADA estao implementadas' }
  }
  if (quantidade === undefined || quantidade === null || isNaN(Number(quantidade)) || Number(quantidade) <= 0) {
    throw { status: 422, erro: 'O campo quantidade deve ser um numero maior que zero' }
  }

  const produto = await produtoRepository.buscarPorId(Number(id_produto))
  if (!produto) {
    throw { status: 404, erro: 'Produto nao encontrado' }
  }

  return movimentacaoRepository.registrarEntrada(Number(id_produto), Number(quantidade))
}

export async function listar() {
  return movimentacaoRepository.listar()
}
```

Um service pode usar o repository de outra entidade (aqui, o de produto para saber se ele existe).
O contrário não: um repository nunca chama service.

`src/controllers/movimentacao.controller.js`

```js
import * as movimentacaoService from '../services/movimentacao.service.js'
import { responderErro } from '../utils/responderErro.js'

export async function registrar(request, reply) {
  try {
    const quantidadeAtual = await movimentacaoService.registrar(request.body)
    return reply.status(201).send({ mensagem: 'Entrada registrada com sucesso', quantidade_atual: quantidadeAtual })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

export async function listar(request, reply) {
  try {
    const movimentacoes = await movimentacaoService.listar()
    return reply.status(200).send(movimentacoes)
  } catch (erro) {
    return responderErro(reply, erro)
  }
}
```

`src/routes/movimentacao.routes.js`

```js
import * as movimentacaoController from '../controllers/movimentacao.controller.js'

export default async function movimentacaoRoutes(servidor) {
  servidor.post('/movimentar_produto', movimentacaoController.registrar)
  servidor.get('/listar_movimentacoes', movimentacaoController.listar)
}
```

## server.js depois da reorganização

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

O `estoque.routes.js` sai do `server.js` e pode ser apagado.

## Mudando sem quebrar

- **Uma rota por vez.** Mova uma rota para as camadas, apague ela do `estoque.routes.js`, teste no
  `referencias.http`. Funcionou, vá para a próxima.
- **A mesma rota não pode existir em dois arquivos.** Se `GET /listar_produtos` estiver no `estoque.routes.js`
  **e** no `produto.routes.js`, o servidor nem sobe: `Method 'GET' already declared for route '/listar_produtos'`.
- **Mesmo comportamento.** Reorganizar não muda o que a API faz: mesmas URLs, mesmos status, mesmas mensagens.
  Compare as respostas antes e depois.
- **Commit quando tudo funcionar** (`0_git_branch_e_pull_request.md`), assim existe um ponto seguro para voltar.

## Detalhes do JavaScript que fazem diferença

- O projeto usa **ES Modules** (`"type": "module"` no `package.json`). Por isso é `import`/`export`, e o caminho
  do import **precisa terminar em `.js`**: `'../services/produto.service.js'`. Sem o `.js` dá `ERR_MODULE_NOT_FOUND`.
- `../` sobe uma pasta. De `src/services/` para chegar em `src/repositories/` é `../repositories/...`.
- `export async function nome()` exporta várias funções do mesmo arquivo.
  `import * as produtoService from '...'` importa todas de uma vez: `produtoService.consultar(...)`.
- `import { responderErro } from '...'` importa só uma função pelo nome (com chaves).
- `export default` é uma exportação só por arquivo, importada sem chaves (usado no `db.js` e nos arquivos de rotas).
- No Fastify, a função da rota recebe `(request, reply)`. Passar `produtoController.listar` no lugar da
  `async (request, reply) => { ... }` é a mesma coisa: o Fastify chama a função com esses dois parâmetros.

## README

O `README.md` descreve a estrutura de pastas e a lista de endpoints. Quando a estrutura mudar ou entrar
rota nova (login, cadastro de usuário, saída, filtros), atualize as duas partes.

Documentação oficial: Fastify > Reference > Routes, Plugins e Encapsulation; Node.js > ECMAScript modules;
README do `pg` (node-postgres) > Pooling; README do `dotenv`.
