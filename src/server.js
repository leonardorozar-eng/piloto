import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import 'dotenv/config'

import usuarioRoutes from './routes/usuario.routes.js'
import produtoRoutes from './routes/produto.routes.js'
import movimentacaoRoutes from './routes/movimentacao.routes.js'

const servidor = Fastify()

servidor.register(jwt, {
  secret: process.env.JWT_SECRET || 'troque_esta_chave',
  sign: { expiresIn: '1h' }
})

servidor.register(usuarioRoutes)
servidor.register(produtoRoutes)
servidor.register(movimentacaoRoutes)

const porta = Number(process.env.PORT) || 3000

servidor.listen({ port: porta, host: '127.0.0.1' }, (erro) => {
  if (erro) {
    console.log(erro)
    process.exit(1)
  }
  console.log('Servidor rodando na porta ' + porta)
})
