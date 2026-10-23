import sql from '../config/db.js'

export async function buscarPorEmail(email) {
  const resultado = await sql.query('SELECT * FROM usuario WHERE email = $1', [email])
  return resultado.rows[0]
}

export async function inserir(usuario) {
  const resultado = await sql.query(
    'INSERT INTO usuario (nome, email, senha, perfil) VALUES ($1, $2, $3, $4) RETURNING id_usuario, nome, email, perfil',
    [usuario.nome, usuario.email, usuario.senha, usuario.perfil]
  )
  return resultado.rows[0]
}
