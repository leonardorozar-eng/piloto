import * as produtoController from '../controllers/produto.controller.js'
import { autenticar, permitir } from '../middlewares/autenticar.js'

const todos = [autenticar, permitir('OPERADOR', 'ADMIN')]
const somenteAdmin = [autenticar, permitir('ADMIN')]

export default async function produtoRoutes(servidor) {
  servidor.get('/listar_produtos', { preHandler: todos }, produtoController.listar)
  servidor.get('/listar_produto/:id', { preHandler: todos }, produtoController.consultar)
  servidor.post('/add_produto', { preHandler: todos }, produtoController.cadastrar)
  servidor.put('/atualizar_produto/:id', { preHandler: todos }, produtoController.atualizar)
  servidor.delete('/deletar_produto', { preHandler: somenteAdmin }, produtoController.remover)
}
