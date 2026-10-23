import * as produtoService from '../services/produto.service.js'
import { responderErro } from '../utils/responderErro.js'
import { conexaoDoPerfil } from '../config/db.js'

export async function listar(request, reply) {
  try {
    const resultado = await produtoService.listar(request.query, conexaoDoPerfil(request.user.perfil))
    return reply.status(200).send(resultado)
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

export async function consultar(request, reply) {
  try {
    const produto = await produtoService.consultar(request.params.id, conexaoDoPerfil(request.user.perfil))
    return reply.status(200).send(produto)
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

export async function cadastrar(request, reply) {
  try {
    const id = await produtoService.cadastrar(request.body, conexaoDoPerfil(request.user.perfil))
    return reply.status(201).send({ mensagem: 'Produto cadastrado com sucesso', id_produto: id })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

export async function atualizar(request, reply) {
  try {
    await produtoService.atualizar(request.params.id, request.body, conexaoDoPerfil(request.user.perfil))
    return reply.status(200).send({ mensagem: 'Produto atualizado com sucesso' })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

export async function remover(request, reply) {
  try {
    const body = request.body || {}
    await produtoService.remover(body.id_produto, conexaoDoPerfil(request.user.perfil))
    return reply.status(200).send({ mensagem: 'Produto removido com sucesso' })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}
