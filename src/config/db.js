import { Pool } from 'pg'
import 'dotenv/config'

function criarPool(user, password) {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'empresa',
    user,
    password
  })
}

const sql = criarPool(process.env.DB_USER || 'postgres', process.env.DB_PASSWORD || 'senai')
const sqlOperador = criarPool(process.env.DB_USER_OPERADOR, process.env.DB_PASSWORD_OPERADOR)
const sqlAdmin = criarPool(process.env.DB_USER_ADMIN, process.env.DB_PASSWORD_ADMIN)

export function conexaoDoPerfil(perfil) {
  return perfil === 'ADMIN' ? sqlAdmin : sqlOperador
}

export default sql
