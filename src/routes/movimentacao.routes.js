import * as movimentacaoController from '../controllers/movimentacao.controller.js'
import { autenticar, permitir } from '../middlewares/autenticar.js'

const todos = [autenticar, permitir('OPERADOR', 'ADMIN')]

export default async function movimentacaoRoutes(servidor) {
  servidor.post('/movimentar_produto', { preHandler: todos }, movimentacaoController.registrar)
  servidor.get('/listar_movimentacoes', { preHandler: todos }, movimentacaoController.listar)
}
