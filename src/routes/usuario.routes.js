import * as usuarioController from '../controllers/usuario.controller.js'

export default async function usuarioRoutes(servidor) {
  servidor.post('/usuarios', usuarioController.cadastrar)
  servidor.post('/login', usuarioController.login)
}
