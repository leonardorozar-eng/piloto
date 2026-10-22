# Movimentações: data/hora, usuário responsável e saída com saldo

## Data/hora e usuário na tabela

A tabela `movimentacao` do projeto base só tem produto, tipo e quantidade.
Para saber **quando** e **quem** fez cada movimentação, entram duas colunas (no `infra/alteracoes.sql`,
depois de criar a tabela `usuario`):

```sql
ALTER TABLE movimentacao
  ADD COLUMN data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN id_usuario INT NULL,
  ADD CONSTRAINT fk_movimentacao_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);
```

- `DEFAULT CURRENT_TIMESTAMP`: o próprio banco grava a data e hora no `INSERT`. Ninguém precisa enviar.
- `id_usuario` é `NULL` porque as movimentações que já existiam não têm responsável. As novas sempre terão.
- A chave estrangeira garante que o id gravado é de um usuário que existe.

Confira no pgAdmin: `SELECT * FROM movimentacao;` mostra as colunas novas, com a data preenchida nas linhas antigas.

## De onde vem o usuário responsável

Do **token**. Depois do `autenticar`, `request.user` tem os dados do login (`id`, `nome`, `perfil`).
O usuário responsável **não** vem do body: se viesse, qualquer um poderia registrar uma movimentação em nome de outra pessoa.

```js
// controller
const idUsuario = request.user.id
```

## Saída com validação de saldo

### A regra

- A quantidade pedida é **maior** que o saldo → bloqueia, nada é gravado, e a mensagem é:

  `Saída não permitida: estoque insuficiente. Disponível: X. Solicitado: Y.`

- A quantidade pedida é **menor ou igual** ao saldo → registra a movimentação e diminui o saldo.
- Toda movimentação (entrada ou saída) grava data/hora e usuário.

Use a mensagem **exatamente** como está no caderno, trocando X pelo saldo e Y pelo pedido.
Template string (crase) deixa isso simples:

```js
`Saída não permitida: estoque insuficiente. Disponível: ${saldo}. Solicitado: ${quantidade}.`
```

Status sugerido para o bloqueio: `422` (os dados chegaram certos, mas a regra de negócio não permite).

### Transação: tudo ou nada

Registrar uma saída são **duas** escritas: o `INSERT` na movimentação e o `UPDATE` no saldo do produto.
Se a primeira der certo e a segunda falhar, o saldo fica errado. A **transação** resolve:

```sql
BEGIN;        -- começa
...           -- comandos
COMMIT;       -- confirma tudo
-- ou
ROLLBACK;     -- desfaz tudo desde o BEGIN
```

Com o `pg`, a transação precisa usar **a mesma conexão** em todos os comandos.
Por isso pega-se um cliente do Pool com `sql.connect()` e no fim ele é devolvido com `release()`.

O `SELECT ... FOR UPDATE` trava a linha do produto até o `COMMIT`. Se duas saídas do mesmo produto chegarem
ao mesmo tempo, a segunda espera a primeira terminar e lê o saldo já atualizado.

`src/repositories/movimentacao.repository.js`

```js
import sql from '../config/db.js'

export async function registrar({ idProduto, tipo, quantidade, idUsuario }) {
  const cliente = await sql.connect()

  try {
    await cliente.query('BEGIN')

    const produto = await cliente.query(
      'SELECT id_produto, quantidade FROM produto WHERE id_produto = $1 FOR UPDATE',
      [idProduto]
    )

    if (produto.rows.length === 0) {
      await cliente.query('ROLLBACK')
      return { situacao: 'PRODUTO_NAO_ENCONTRADO' }
    }

    const saldo = produto.rows[0].quantidade

    if (tipo === 'SAIDA' && quantidade > saldo) {
      await cliente.query('ROLLBACK')
      return { situacao: 'SALDO_INSUFICIENTE', saldo }
    }

    const sinal = tipo === 'SAIDA' ? -1 : 1

    const movimentacao = await cliente.query(
      'INSERT INTO movimentacao (id_produto, tipo, quantidade, id_usuario) VALUES ($1, $2, $3, $4) ' +
      'RETURNING id_movimentacao, data_hora',
      [idProduto, tipo, quantidade, idUsuario]
    )

    const atualizado = await cliente.query(
      'UPDATE produto SET quantidade = quantidade + $1 WHERE id_produto = $2 RETURNING quantidade',
      [sinal * quantidade, idProduto]
    )

    await cliente.query('COMMIT')

    return {
      situacao: 'OK',
      id_movimentacao: movimentacao.rows[0].id_movimentacao,
      data_hora: movimentacao.rows[0].data_hora,
      quantidade_atual: atualizado.rows[0].quantidade
    }
  } catch (erro) {
    await cliente.query('ROLLBACK')
    throw erro
  } finally {
    cliente.release()
  }
}

export async function listar() {
  const resultado = await sql.query(
    'SELECT m.id_movimentacao, m.id_produto, p.nome, m.tipo, m.quantidade, m.data_hora, ' +
    'm.id_usuario, u.nome AS usuario ' +
    'FROM movimentacao m ' +
    'INNER JOIN produto p ON p.id_produto = m.id_produto ' +
    'LEFT JOIN usuario u ON u.id_usuario = m.id_usuario ' +
    'ORDER BY m.data_hora DESC, m.id_movimentacao DESC'
  )
  return resultado.rows
}
```

- `finally` roda sempre (deu certo ou deu erro): o cliente sempre volta para o Pool.
  Esquecer o `release()` faz a API travar depois de algumas requisições.
- `LEFT JOIN usuario`: as movimentações antigas, sem usuário, continuam aparecendo (com `usuario: null`).
  Com `INNER JOIN` elas sumiriam da listagem.

O repository devolve uma `situacao` em vez de mensagem: quem decide o texto e o status é o service.

### service

`src/services/movimentacao.service.js`

```js
import * as movimentacaoRepository from '../repositories/movimentacao.repository.js'

const TIPOS = ['ENTRADA', 'SAIDA']

export async function registrar(dados, idUsuario) {
  const { id_produto, tipo, quantidade } = dados || {}

  if (id_produto === undefined || id_produto === null || isNaN(Number(id_produto))) {
    throw { status: 422, erro: 'O campo id_produto e obrigatorio' }
  }
  if (!TIPOS.includes(tipo)) {
    throw { status: 422, erro: 'O campo tipo deve ser ENTRADA ou SAIDA' }
  }
  if (!Number.isInteger(Number(quantidade)) || Number(quantidade) <= 0) {
    throw { status: 422, erro: 'O campo quantidade deve ser um numero inteiro maior que zero' }
  }

  const resultado = await movimentacaoRepository.registrar({
    idProduto: Number(id_produto),
    tipo,
    quantidade: Number(quantidade),
    idUsuario
  })

  if (resultado.situacao === 'PRODUTO_NAO_ENCONTRADO') {
    throw { status: 404, erro: 'Produto nao encontrado' }
  }
  if (resultado.situacao === 'SALDO_INSUFICIENTE') {
    throw {
      status: 422,
      erro: `Saída não permitida: estoque insuficiente. Disponível: ${resultado.saldo}. Solicitado: ${Number(quantidade)}.`
    }
  }

  return resultado
}
```

### controller

```js
import * as movimentacaoService from '../services/movimentacao.service.js'

export async function registrar(request, reply) {
  try {
    const resultado = await movimentacaoService.registrar(request.body, request.user.id)
    const texto = request.body.tipo === 'SAIDA' ? 'Saida registrada com sucesso' : 'Entrada registrada com sucesso'

    return reply.status(201).send({
      mensagem: texto,
      id_movimentacao: resultado.id_movimentacao,
      data_hora: resultado.data_hora,
      responsavel: request.user.nome,
      quantidade_atual: resultado.quantidade_atual
    })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}
```

### rotas

```js
servidor.post('/movimentar_produto', { preHandler: todos }, movimentacaoController.registrar)
servidor.get('/listar_movimentacoes', { preHandler: todos }, movimentacaoController.listar)
```

A mesma rota serve para entrada e saída; o que muda é o `tipo` no body.
Se preferir uma rota só para a saída (`POST /saida_produto`), o service é o mesmo, com o tipo fixo em `SAIDA`.

## Testando no REST Client

Mouse optico (id 2) começa com saldo 25 no `bd.sql`. Confira antes com `GET /listar_produto/2`.

```http
### Saída maior que o saldo: 422 com a mensagem do caderno
POST {{url}}/movimentar_produto
Authorization: Bearer {{token}}
Content-Type: application/json

{ "id_produto": 2, "tipo": "SAIDA", "quantidade": 30 }

### Saída menor que o saldo: 201, saldo cai
POST {{url}}/movimentar_produto
Authorization: Bearer {{token}}
Content-Type: application/json

{ "id_produto": 2, "tipo": "SAIDA", "quantidade": 5 }

### Movimentações com data/hora e responsável
GET {{url}}/listar_movimentacoes
Authorization: Bearer {{token}}
```

Resposta esperada do bloqueio:

```json
{ "erro": "Saída não permitida: estoque insuficiente. Disponível: 20. Solicitado: 30." }
```

(Disponível 20 se a saída de 5 já tiver sido feita antes; o número sempre é o saldo do momento.)

Depois de cada teste, confira o saldo no `GET /listar_produto/2` e no pgAdmin (`SELECT * FROM produto WHERE id_produto = 2;`):
na saída bloqueada ele **não** pode mudar.

## Alternativa: regra dentro do banco

A mesma regra pode ficar no PostgreSQL com uma function + trigger que, antes do `INSERT` na movimentação,
confere o saldo e lança erro com `RAISE EXCEPTION`. Funciona, mas a mensagem de erro chega na API como erro
do banco e precisa ser tratada no service para virar o `422` com o texto do caderno.
Com a regra no service (como acima), o comportamento fica todo visível no código JavaScript.

Documentação oficial: README do `pg` (node-postgres) > Transactions e Pooling;
PostgreSQL > Tutorial > Transactions; SQL Commands > ALTER TABLE, SELECT (FOR UPDATE).
