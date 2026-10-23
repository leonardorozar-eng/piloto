import * as movimentacaoRepository from '../repositories/movimentacao.repository.js'

const TIPOS = ['ENTRADA', 'SAIDA']

export async function registrar(dados, idUsuario, conexao) {
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

  const resultado = await movimentacaoRepository.registrar(conexao, {
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

export async function listar(conexao) {
  return movimentacaoRepository.listar(conexao)
}
