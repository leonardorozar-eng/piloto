const CAMPOS = 'id_produto, nome, descricao, valor_unitario, quantidade, data_cadastro'

export async function listar(conexao, { nome, dataInicio, dataFim, limite, offset }) {
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

  const total = await conexao.query('SELECT COUNT(*) AS total FROM produto' + where, valores)

  valores.push(limite)
  const posLimite = valores.length
  valores.push(offset)
  const posOffset = valores.length

  const produtos = await conexao.query(
    'SELECT ' + CAMPOS + ' FROM produto' +
    where +
    ' ORDER BY id_produto LIMIT $' + posLimite + ' OFFSET $' + posOffset,
    valores
  )

  return { total: Number(total.rows[0].total), produtos: produtos.rows }
}

export async function buscarPorId(conexao, id) {
  const resultado = await conexao.query('SELECT ' + CAMPOS + ' FROM produto WHERE id_produto = $1', [id])
  return resultado.rows[0]
}

export async function inserir(conexao, produto) {
  const resultado = await conexao.query(
    'INSERT INTO produto (nome, descricao, valor_unitario, quantidade) VALUES ($1, $2, $3, $4) RETURNING id_produto',
    [produto.nome, produto.descricao, produto.valor, produto.quantidade]
  )
  return resultado.rows[0].id_produto
}

export async function atualizar(conexao, id, produto) {
  const resultado = await conexao.query(
    'UPDATE produto SET nome = $1, descricao = $2, valor_unitario = $3, quantidade = $4 WHERE id_produto = $5',
    [produto.nome, produto.descricao, produto.valor, produto.quantidade, id]
  )
  return resultado.rowCount
}

export async function possuiMovimentacoes(conexao, id) {
  const resultado = await conexao.query('SELECT 1 FROM movimentacao WHERE id_produto = $1 LIMIT 1', [id])
  return resultado.rows.length > 0
}

export async function remover(conexao, id) {
  const resultado = await conexao.query('DELETE FROM produto WHERE id_produto = $1', [id])
  return resultado.rowCount
}
