# Listagem com paginação e filtros (nome e data)

## A ideia

Em vez de devolver todos os produtos de uma vez, a API devolve uma **página** por vez,
e o cliente diz o que quer pela URL (query string, tudo depois do `?`):

```txt
GET /listar_produtos?pagina=2&limite=5&nome=mouse&data_inicio=2026-01-01&data_fim=2026-12-31
```

No Fastify esses valores chegam em `request.query`, **sempre como texto**:

```js
request.query   // { pagina: '2', limite: '5', nome: 'mouse', data_inicio: '2026-01-01', data_fim: '2026-12-31' }
```

Todos são opcionais: sem nenhum, a API devolve a página 1 com um limite padrão.

## LIMIT e OFFSET

```sql
SELECT * FROM produto ORDER BY id_produto LIMIT 5 OFFSET 10;
```

- `LIMIT 5`: no máximo 5 linhas.
- `OFFSET 10`: pula as 10 primeiras.
- A conta: `offset = (pagina - 1) * limite`. Página 1 → pula 0; página 2 → pula 5; página 3 → pula 10.
- Sempre use `ORDER BY` na paginação. Sem ordem definida, o banco pode devolver as linhas em ordem diferente
  a cada consulta e um produto aparecer em duas páginas.

## Filtro por nome: ILIKE

```sql
SELECT * FROM produto WHERE nome ILIKE '%mouse%';
```

- `%` = qualquer coisa antes/depois. `'%mouse%'` acha "Mouse optico" e "Kit teclado e mouse".
- `ILIKE` ignora maiúsculas/minúsculas (o `LIKE` diferencia).
- No `pg` o `%` vai no **valor**, não no SQL: `sql.query('... WHERE nome ILIKE $1', ['%' + nome + '%'])`.
  Nunca concatene o texto do usuário dentro do SQL (isso abre SQL injection).

## Filtro por data

A data do produto é a coluna `data_cadastro` (`TIMESTAMP`, tem data e hora).
Para filtrar só pelo dia, converta com `::date`:

```sql
SELECT * FROM produto
WHERE data_cadastro::date >= '2026-01-01'
  AND data_cadastro::date <= '2026-12-31';
```

A data na URL vai no formato `AAAA-MM-DD`, que é o formato que o PostgreSQL entende direto.

## Montando o WHERE só com os filtros enviados

Os filtros são opcionais, então o SQL é montado aos poucos: um array de condições e um array de valores.
O número do `$` é sempre o tamanho do array de valores depois do `push`.

Estas funções `listar` substituem as de `1_organizacao_em_camadas.md` no repository, no service e no controller.

`src/repositories/produto.repository.js`

```js
export async function listar({ nome, dataInicio, dataFim, limite, offset }) {
  const condicoes = []
  const valores = []

  if (nome) {
    valores.push('%' + nome + '%')
    condicoes.push('nome ILIKE $' + valores.length)
  }
  if (dataInicio) {
    valores.push(dataInicio)
    condicoes.push('data_cadastro::date >= $' + valores.length)
  }
  if (dataFim) {
    valores.push(dataFim)
    condicoes.push('data_cadastro::date <= $' + valores.length)
  }

  const where = condicoes.length > 0 ? ' WHERE ' + condicoes.join(' AND ') : ''

  const total = await sql.query('SELECT COUNT(*) AS total FROM produto' + where, valores)

  valores.push(limite)
  const posLimite = valores.length
  valores.push(offset)
  const posOffset = valores.length

  const produtos = await sql.query(
    'SELECT id_produto, nome, descricao, valor_unitario, quantidade, data_cadastro FROM produto' +
    where +
    ' ORDER BY id_produto LIMIT $' + posLimite + ' OFFSET $' + posOffset,
    valores
  )

  return { total: Number(total.rows[0].total), produtos: produtos.rows }
}
```

Exemplo do SQL gerado com `nome=mouse&data_inicio=2026-01-01`:

```sql
SELECT ... FROM produto WHERE nome ILIKE $1 AND data_cadastro::date >= $2 ORDER BY id_produto LIMIT $3 OFFSET $4
-- valores: ['%mouse%', '2026-01-01', 5, 0]
```

O `COUNT(*)` usa o mesmo `WHERE` (e os mesmos valores, antes do limite e offset) para saber quantos
produtos existem no filtro, sem considerar a página. O PostgreSQL devolve o `COUNT` como texto, por isso o `Number(...)`.

## Service: valores padrão e validação

`src/services/produto.service.js`

```js
export async function listar(query) {
  const pagina = Number(query.pagina) || 1
  const limite = Number(query.limite) || 10

  if (pagina < 1 || limite < 1) {
    throw { status: 422, erro: 'Pagina e limite devem ser maiores que zero' }
  }

  const dataValida = /^\d{4}-\d{2}-\d{2}$/
  if ((query.data_inicio && !dataValida.test(query.data_inicio)) ||
      (query.data_fim && !dataValida.test(query.data_fim))) {
    throw { status: 422, erro: 'Datas devem estar no formato AAAA-MM-DD' }
  }

  const resultado = await produtoRepository.listar({
    nome: query.nome,
    dataInicio: query.data_inicio,
    dataFim: query.data_fim,
    limite,
    offset: (pagina - 1) * limite
  })

  return {
    pagina,
    limite,
    total: resultado.total,
    total_paginas: Math.ceil(resultado.total / limite),
    dados: resultado.produtos
  }
}
```

`/^\d{4}-\d{2}-\d{2}$/` é uma expressão regular: 4 dígitos, hífen, 2 dígitos, hífen, 2 dígitos.

## Controller

```js
export async function listar(request, reply) {
  try {
    const resultado = await produtoService.listar(request.query)
    return reply.status(200).send(resultado)
  } catch (erro) {
    return responderErro(reply, erro)
  }
}
```

Resposta:

```json
{
  "pagina": 1,
  "limite": 2,
  "total": 3,
  "total_paginas": 2,
  "dados": [
    { "id_produto": 1, "nome": "Teclado ABNT2", "...": "..." },
    { "id_produto": 2, "nome": "Mouse optico", "...": "..." }
  ]
}
```

Devolver `total` e `total_paginas` deixa claro para quem usa a API até onde dá para paginar.

## Testando no REST Client

```http
### Página 1, 2 por página
GET {{url}}/listar_produtos?pagina=1&limite=2
Authorization: Bearer {{token}}

### Página 2
GET {{url}}/listar_produtos?pagina=2&limite=2
Authorization: Bearer {{token}}

### Filtro por nome
GET {{url}}/listar_produtos?nome=mouse
Authorization: Bearer {{token}}

### Filtro por período
GET {{url}}/listar_produtos?data_inicio=2026-01-01&data_fim=2026-12-31
Authorization: Bearer {{token}}

### Data inválida: 422
GET {{url}}/listar_produtos?data_inicio=01/01/2026
Authorization: Bearer {{token}}
```

Para ter produtos em datas diferentes e testar o filtro de data, altere alguns no pgAdmin:

```sql
UPDATE produto SET data_cadastro = '2025-06-15 10:00' WHERE id_produto = 1;
```

Documentação oficial: PostgreSQL > Queries > LIMIT and OFFSET; Functions > Pattern Matching (LIKE/ILIKE);
Data Types > Date/Time; Fastify > Reference > Request (query).
