import Fastify from 'fastify'
import 'dotenv/config'

import estoqueRoutes from './routes/estoque.routes.js'

const servidor = Fastify()

servidor.register(estoqueRoutes)

const porta = Number(process.env.PORT) || 3000

servidor.listen({ port: porta }, (erro) => {
  if (erro) {
    console.log(erro)
    process.exit(1)
  }
  console.log('Servidor rodando na porta ' + porta)
})
