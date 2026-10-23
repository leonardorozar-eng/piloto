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

export async function listar(query, conexao) {
  const filtros = query || {}
  const pagina = Number(filtros.pagina) || 1
  const limite = Number(filtros.limite) || 10

  if (pagina < 1 || limite < 1) {
    throw { status: 422, erro: 'Pagina e limite devem ser maiores que zero' }
  }

  const dataValida = /^\d{4}-\d{2}-\d{2}$/
  if ((filtros.data_inicio && !dataValida.test(filtros.data_inicio)) ||
      (filtros.data_fim && !dataValida.test(filtros.data_fim))) {
    throw { status: 422, erro: 'Datas devem estar no formato AAAA-MM-DD' }
  }

  const resultado = await produtoRepository.listar(conexao, {
    nome: filtros.nome,
    dataInicio: filtros.data_inicio,
    dataFim: filtros.data_fim,
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

export async function consultar(id, conexao) {
  const produto = await produtoRepository.buscarPorId(conexao, validarId(id))
  if (!produto) {
    throw { status: 404, erro: 'Produto nao encontrado' }
  }
  return produto
}

export async function cadastrar(dados, conexao) {
  const produto = validarDados(dados)
  return produtoRepository.inserir(conexao, produto)
}

export async function atualizar(id, dados, conexao) {
  const idValido = validarId(id)
  const produto = validarDados(dados)

  const alterados = await produtoRepository.atualizar(conexao, idValido, produto)
  if (alterados === 0) {
    throw { status: 404, erro: 'Produto nao encontrado' }
  }
}

export async function remover(id, conexao) {
  const idValido = validarId(id, 'O campo id_produto e obrigatorio')

  if (await produtoRepository.possuiMovimentacoes(conexao, idValido)) {
    throw { status: 409, erro: 'O produto possui movimentacoes e nao pode ser removido' }
  }

  const removidos = await produtoRepository.remover(conexao, idValido)
  if (removidos === 0) {
    throw { status: 404, erro: 'Produto nao encontrado' }
  }
}
