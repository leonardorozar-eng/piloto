export async function autenticar(request, reply) {
  try {
    await request.jwtVerify()
  } catch (erro) {
    return reply.status(401).send({ erro: 'Token ausente, invalido ou expirado' })
  }
}

export function permitir(...perfis) {
  return async function (request, reply) {
    if (!perfis.includes(request.user.perfil)) {
      return reply.status(403).send({ erro: 'Seu perfil nao tem permissao para esta operacao' })
    }
  }
}
