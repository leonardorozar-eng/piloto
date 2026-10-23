import * as usuarioService from '../services/usuario.service.js'
import { responderErro } from '../utils/responderErro.js'

export async function cadastrar(request, reply) {
  try {
    const usuario = await usuarioService.cadastrar(request.body)
    return reply.status(201).send({ mensagem: 'Usuario cadastrado com sucesso', usuario })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}

export async function login(request, reply) {
  try {
    const usuario = await usuarioService.login(request.body)
    const token = await reply.jwtSign(usuario)
    return reply.status(200).send({ mensagem: 'Login realizado com sucesso', token, usuario })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}
