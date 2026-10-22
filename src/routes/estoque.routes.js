import sql from '../config/db.js'

export default async function estoqueRoutes(servidor) {

  // ---------------------------------------------------------------------------
  // PRODUTOS
  // ---------------------------------------------------------------------------

  servidor.post('/add_produto', async (request, reply) => {
    const { nome, descricao, valor, quantidade } = request.body || {}

    if (!nome || nome.trim() === '') {
      return reply.status(422).send({ erro: 'O campo nome e obrigatorio' })
    }
    if (valor === undefined || valor === null || isNaN(Number(valor)) || Number(valor) < 0) {
      return reply.status(422).send({ erro: 'O campo valor deve ser um numero maior ou igual a zero' })
    }
    if (quantidade === undefined || quantidade === null || isNaN(Number(quantidade)) || Number(quantidade) < 0) {
      return reply.status(422).send({ erro: 'O campo quantidade deve ser um numero maior ou igual a zero' })
    }

    try {
      const resultado = await sql.query(
        'INSERT INTO produto (nome, descricao, valor_unitario, quantidade) VALUES ($1, $2, $3, $4) RETURNING id_produto',
        [nome, descricao || null, Number(valor), Number(quantidade)]
      )

      return reply.status(201).send({
        mensagem: 'Produto cadastrado com sucesso',
        id_produto: resultado.rows[0].id_produto
      })
    } catch (erro) {
      console.log(erro)
      return reply.status(500).send({ erro: 'Erro ao cadastrar produto' })
    }
  })

  servidor.get('/listar_produtos', async (request, reply) => {
    try {
      const produtos = await sql.query(
        'SELECT id_produto, nome, descricao, valor_unitario, quantidade, data_cadastro FROM produto'
      )

      return reply.status(200).send(produtos.rows)
    } catch (erro) {
      console.log(erro)
      return reply.status(500).send({ erro: 'Erro ao listar produtos' })
    }
  })

  servidor.get('/listar_produto/:id', async (request, reply) => {
    const { id } = request.params

    if (isNaN(Number(id))) {
      return reply.status(422).send({ erro: 'O id informado e invalido' })
    }

    try {
      const produtos = await sql.query(
        'SELECT id_produto, nome, descricao, valor_unitario, quantidade, data_cadastro FROM produto WHERE id_produto = $1',
        [Number(id)]
      )

      if (produtos.rows.length === 0) {
        return reply.status(404).send({ erro: 'Produto nao encontrado' })
      }

      return reply.status(200).send(produtos.rows[0])
    } catch (erro) {
      console.log(erro)
      return reply.status(500).send({ erro: 'Erro ao consultar produto' })
    }
  })

  servidor.put('/atualizar_produto/:id', async (request, reply) => {
    const { id } = request.params
    const { nome, descricao, valor, quantidade } = request.body || {}

    if (isNaN(Number(id))) {
      return reply.status(422).send({ erro: 'O id informado e invalido' })
    }
    if (!nome || nome.trim() === '') {
      return reply.status(422).send({ erro: 'O campo nome e obrigatorio' })
    }
    if (valor === undefined || valor === null || isNaN(Number(valor)) || Number(valor) < 0) {
      return reply.status(422).send({ erro: 'O campo valor deve ser um numero maior ou igual a zero' })
    }
    if (quantidade === undefined || quantidade === null || isNaN(Number(quantidade)) || Number(quantidade) < 0) {
      return reply.status(422).send({ erro: 'O campo quantidade deve ser um numero maior ou igual a zero' })
    }

    try {
      const produtos = await sql.query(
        'SELECT id_produto FROM produto WHERE id_produto = $1',
        [Number(id)]
      )

      if (produtos.rows.length === 0) {
        return reply.status(404).send({ erro: 'Produto nao encontrado' })
      }

      await sql.query(
        'UPDATE produto SET nome = $1, descricao = $2, valor_unitario = $3, quantidade = $4 WHERE id_produto = $5',
        [nome, descricao || null, Number(valor), Number(quantidade), Number(id)]
      )

      return reply.status(200).send({ mensagem: 'Produto atualizado com sucesso' })
    } catch (erro) {
      console.log(erro)
      return reply.status(500).send({ erro: 'Erro ao atualizar produto' })
    }
  })

  servidor.delete('/deletar_produto', async (request, reply) => {
    const { id_produto } = request.body || {}

    if (id_produto === undefined || id_produto === null || isNaN(Number(id_produto))) {
      return reply.status(422).send({ erro: 'O campo id_produto e obrigatorio' })
    }

    try {
      const movimentacoes = await sql.query(
        'SELECT id_movimentacao FROM movimentacao WHERE id_produto = $1',
        [Number(id_produto)]
      )

      if (movimentacoes.rows.length > 0) {
        return reply.status(409).send({ erro: 'O produto possui movimentacoes e nao pode ser removido' })
      }

      const resultado = await sql.query(
        'DELETE FROM produto WHERE id_produto = $1',
        [Number(id_produto)]
      )

      if (resultado.rowCount === 0) {
        return reply.status(404).send({ erro: 'Produto nao encontrado' })
      }

      return reply.status(200).send({ mensagem: 'Produto removido com sucesso' })
    } catch (erro) {
      console.log(erro)
      return reply.status(500).send({ erro: 'Erro ao remover produto' })
    }
  })

  // ---------------------------------------------------------------------------
  // MOVIMENTACOES
  // ---------------------------------------------------------------------------

  servidor.post('/movimentar_produto', async (request, reply) => {
    const { id_produto, tipo, quantidade } = request.body || {}

    if (id_produto === undefined || id_produto === null || isNaN(Number(id_produto))) {
      return reply.status(422).send({ erro: 'O campo id_produto e obrigatorio' })
    }
    if (tipo !== 'ENTRADA') {
      return reply.status(422).send({ erro: 'Somente movimentacoes do tipo ENTRADA estao implementadas' })
    }
    if (quantidade === undefined || quantidade === null || isNaN(Number(quantidade)) || Number(quantidade) <= 0) {
      return reply.status(422).send({ erro: 'O campo quantidade deve ser um numero maior que zero' })
    }

    try {
      const produtos = await sql.query(
        'SELECT id_produto, quantidade FROM produto WHERE id_produto = $1',
        [Number(id_produto)]
      )

      if (produtos.rows.length === 0) {
        return reply.status(404).send({ erro: 'Produto nao encontrado' })
      }

      await sql.query(
        'INSERT INTO movimentacao (id_produto, tipo, quantidade) VALUES ($1, $2, $3)',
        [Number(id_produto), tipo, Number(quantidade)]
      )

      await sql.query(
        'UPDATE produto SET quantidade = quantidade + $1 WHERE id_produto = $2',
        [Number(quantidade), Number(id_produto)]
      )

      return reply.status(201).send({
        mensagem: 'Entrada registrada com sucesso',
        quantidade_atual: produtos.rows[0].quantidade + Number(quantidade)
      })
    } catch (erro) {
      console.log(erro)
      return reply.status(500).send({ erro: 'Erro ao movimentar produto' })
    }
  })

  servidor.get('/listar_movimentacoes', async (request, reply) => {
    try {
      const movimentacoes = await sql.query(
        'SELECT m.id_movimentacao, m.id_produto, p.nome, m.tipo, m.quantidade ' +
        'FROM movimentacao m ' +
        'INNER JOIN produto p ON p.id_produto = m.id_produto ' +
        'ORDER BY m.id_movimentacao DESC'
      )

      return reply.status(200).send(movimentacoes.rows)
    } catch (erro) {
      console.log(erro)
      return reply.status(500).send({ erro: 'Erro ao listar movimentacoes' })
    }
  })
}
