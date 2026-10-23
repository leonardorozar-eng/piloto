import bcrypt from 'bcrypt'
import * as usuarioRepository from '../repositories/usuario.repository.js'

const PERFIS = ['OPERADOR', 'ADMIN']

export async function cadastrar(dados) {
  const { nome, email, senha } = dados || {}
  const perfil = (dados && dados.perfil) || 'OPERADOR'

  if (!nome || !email || !senha) {
    throw { status: 422, erro: 'Nome, email e senha sao obrigatorios' }
  }
  if (!PERFIS.includes(perfil)) {
    throw { status: 422, erro: 'Perfil deve ser OPERADOR ou ADMIN' }
  }

  const existente = await usuarioRepository.buscarPorEmail(email)
  if (existente) {
    throw { status: 409, erro: 'Email ja cadastrado' }
  }

  const senhaHash = await bcrypt.hash(senha, 10)
  return usuarioRepository.inserir({ nome, email, senha: senhaHash, perfil })
}

export async function login(dados) {
  const { email, senha } = dados || {}

  if (!email || !senha) {
    throw { status: 400, erro: 'Email e senha sao obrigatorios' }
  }

  const usuario = await usuarioRepository.buscarPorEmail(email)

  if (!usuario) {
    throw { status: 401, erro: 'Email ou senha invalidos' }
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha)
  if (!senhaValida) {
    throw { status: 401, erro: 'Email ou senha invalidos' }
  }

  return { id: usuario.id_usuario, nome: usuario.nome, perfil: usuario.perfil }
}
