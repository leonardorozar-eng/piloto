import * as movimentacaoService from '../services/movimentacao.service.js'
import { responderErro } from '../utils/responderErro.js'
import { conexaoDoPerfil } from '../config/db.js'

export async function registrar(request, reply) {
  try {
    const resultado = await movimentacaoService.registrar(
      request.body,
      request.user.id,
      conexaoDoPerfil(request.user.perfil)
    )
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

export async function listar(request, reply) {
  try {
    const movimentacoes = await movimentacaoService.listar(conexaoDoPerfil(request.user.perfil))
    return reply.status(200).send(movimentacoes)
  } catch (erro) {
    return responderErro(reply, erro)
  }
}
