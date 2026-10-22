# Usuários, senha com bcrypt, login com JWT e perfis

## Perfis

O sistema tem dois tipos de usuário, cada um com permissões diferentes:

| Ação | OPERADOR | ADMIN |
| --- | --- | --- |
| Consultar (GET) | sim | sim |
| Inserir (POST) | sim | sim |
| Atualizar (PUT) | sim | sim |
| Deletar (DELETE) | **não** | sim |

Isso pode ser controlado em dois lugares, e um não exclui o outro:

- **no back-end**: o token (JWT) guarda o perfil e cada rota confere se o perfil pode passar;
- **no banco**: usuários do PostgreSQL com `GRANT` só do que podem fazer (no fim deste arquivo).

## Tabela de usuários

Alterações no banco ficam num script próprio, por exemplo `infra/alteracoes.sql`, para quem receber o projeto
conseguir recriar tudo (`bd.sql` primeiro, depois `alteracoes.sql`).

```sql
CREATE TABLE usuario (
  id_usuario SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  perfil VARCHAR(10) NOT NULL DEFAULT 'OPERADOR',
  CONSTRAINT chk_perfil_usuario CHECK (perfil IN ('OPERADOR', 'ADMIN'))
);
```

- `UNIQUE` no e-mail: dois usuários não podem ter o mesmo login.
- `senha VARCHAR(255)`: o hash do bcrypt tem 60 caracteres.
- `CHECK`: o banco recusa qualquer perfil diferente de `OPERADOR` e `ADMIN`.

## bcrypt: a senha nunca fica em texto puro

Hash é uma transformação que **não volta**: de `senha123` sai algo como `$2b$10$Q3x9...`, e desse texto
não existe como recuperar `senha123`. O bcrypt ainda mistura um texto aleatório (salt), então duas pessoas
com a mesma senha ficam com hashes diferentes.

```js
import bcrypt from 'bcrypt'

const hash = await bcrypt.hash('senha123', 10)              // no cadastro: gera o hash (10 = custo)
const confere = await bcrypt.compare('senha123', hash)      // no login: true ou false
```

O `compare` aplica o mesmo processo na senha digitada e compara com o hash do banco.

## JWT: o crachá com validade

No login certo, o servidor devolve um **token**. Nas requisições seguintes o cliente envia esse token no
cabeçalho `Authorization: Bearer <token>` e o servidor sabe quem é a pessoa sem perguntar a senha de novo.

O token tem três partes separadas por ponto: `cabeçalho.dados.assinatura`.

- **dados (payload)**: o que você guarda dentro: id, nome, **perfil**. Nunca a senha.
- **assinatura**: feita com uma chave secreta. Se alguém alterar o perfil dentro do token, a assinatura não bate e o token é recusado.
- **exp**: quando o token vence.

### Configurar o @fastify/jwt

A biblioteca já está no `package.json`. No `server.js`, registre antes das rotas:

```js
import jwt from '@fastify/jwt'

servidor.register(jwt, {
  secret: process.env.JWT_SECRET || 'troque_esta_chave',
  sign: { expiresIn: '1h' }
})
```

E no `.env` (e no `.env.example`, com um valor de exemplo):

```env
JWT_SECRET=uma_chave_bem_grande_e_dificil
```

## Camadas do usuário

### repository

`src/repositories/usuario.repository.js`

```js
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
```

O `RETURNING` devolve o usuário criado **sem** a coluna senha.

### service

`src/services/usuario.service.js`

```js
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

  // mesma mensagem para e-mail inexistente e senha errada:
  // assim ninguém descobre quais e-mails existem no sistema
  if (!usuario) {
    throw { status: 401, erro: 'Email ou senha invalidos' }
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha)
  if (!senhaValida) {
    throw { status: 401, erro: 'Email ou senha invalidos' }
  }

  return { id: usuario.id_usuario, nome: usuario.nome, perfil: usuario.perfil }
}
```

### controller

O token é gerado no controller porque quem tem o `jwt` registrado é o Fastify (`reply.jwtSign`).

`src/controllers/usuario.controller.js`

```js
import * as usuarioService from '../services/usuario.service.js'

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
    const token = await reply.jwtSign(usuario)   // { id, nome, perfil } vão dentro do token
    return reply.status(200).send({ mensagem: 'Login realizado com sucesso', token, usuario })
  } catch (erro) {
    return responderErro(reply, erro)
  }
}
```

(`responderErro` é a mesma função de `1_organizacao_em_camadas.md`.)

## Rotas privadas: autenticar e permitir

### autenticar: tem token válido?

`src/middlewares/autenticar.js`

```js
export async function autenticar(request, reply) {
  try {
    await request.jwtVerify()   // confere assinatura e validade; coloca os dados em request.user
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
```

- `request.jwtVerify()` lê o `Authorization: Bearer ...`. Se passar, `request.user` vira `{ id, nome, perfil, iat, exp }`.
- `permitir('ADMIN')` cria uma função que só deixa passar quem tem um dos perfis informados.
- **401** = não sei quem você é (sem token / token inválido). **403** = sei quem você é, mas você não pode.

### Usando nas rotas

O `preHandler` aceita uma lista. As funções rodam na ordem: primeiro autentica, depois confere o perfil.

```js
import * as produtoController from '../controllers/produto.controller.js'
import { autenticar, permitir } from '../middlewares/autenticar.js'

const todos = [autenticar, permitir('OPERADOR', 'ADMIN')]
const somenteAdmin = [autenticar, permitir('ADMIN')]

export default async function produtoRoutes(servidor) {
  servidor.get('/listar_produtos', { preHandler: todos }, produtoController.listar)
  servidor.post('/add_produto', { preHandler: todos }, produtoController.cadastrar)
  servidor.put('/atualizar_produto/:id', { preHandler: todos }, produtoController.atualizar)
  servidor.delete('/deletar_produto', { preHandler: somenteAdmin }, produtoController.remover)
}
```

As rotas de usuário:

```js
import * as usuarioController from '../controllers/usuario.controller.js'

export default async function usuarioRoutes(servidor) {
  servidor.post('/usuarios', usuarioController.cadastrar)
  servidor.post('/login', usuarioController.login)
}
```

`/login` nunca leva `autenticar` (ninguém tem token antes de logar).
Para o cadastro, decida e deixe escrito no README: aberto, ou protegido com `somenteAdmin`
(nesse caso o primeiro ADMIN entra pelo script SQL ou é cadastrado antes de proteger a rota).

### Registro no server.js

O `jwt` precisa ser registrado **antes** dos arquivos de rotas:

```js
servidor.register(jwt, { secret: process.env.JWT_SECRET || 'troque_esta_chave', sign: { expiresIn: '1h' } })

servidor.register(usuarioRoutes)
servidor.register(produtoRoutes)
servidor.register(movimentacaoRoutes)
```

## Testando no REST Client

```http
@url = http://localhost:3000

### Cadastrar um ADMIN
POST {{url}}/usuarios
Content-Type: application/json

{ "nome": "Ana Admin", "email": "ana@empresa.com", "senha": "admin123", "perfil": "ADMIN" }

### Cadastrar um OPERADOR
POST {{url}}/usuarios
Content-Type: application/json

{ "nome": "Otavio Operador", "email": "otavio@empresa.com", "senha": "oper123", "perfil": "OPERADOR" }

### Login (copie o token da resposta)
POST {{url}}/login
Content-Type: application/json

{ "email": "otavio@empresa.com", "senha": "oper123" }

###
@token = COLE_O_TOKEN_AQUI

### Sem token: 401
GET {{url}}/listar_produtos

### Com token: 200
GET {{url}}/listar_produtos
Authorization: Bearer {{token}}

### OPERADOR tentando deletar: 403
DELETE {{url}}/deletar_produto
Authorization: Bearer {{token}}
Content-Type: application/json

{ "id_produto": 1 }
```

No pgAdmin, `SELECT * FROM usuario;` deve mostrar a senha como `$2b$10$...`, nunca o texto digitado.

Atalho do REST Client para não copiar o token na mão: dê um nome para a requisição de login e
use a resposta dela.

```http
# @name login
POST {{url}}/login
Content-Type: application/json

{ "email": "otavio@empresa.com", "senha": "oper123" }

###
GET {{url}}/listar_produtos
Authorization: Bearer {{login.response.body.$.token}}
```

## Permissões direto no banco (GRANT)

O PostgreSQL também tem usuários próprios (roles). Dá para criar um para cada perfil e conceder
só os privilégios permitidos. Isso protege os dados mesmo de quem acessar o banco por fora da API.

```sql
-- OPERADOR: consulta, insere e atualiza
CREATE ROLE operador_almox LOGIN PASSWORD 'operador123';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO operador_almox;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO operador_almox;

-- ADMIN: tudo do operador e também deleta
CREATE ROLE admin_almox LOGIN PASSWORD 'admin123';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admin_almox;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_almox;
```

- `ON ALL TABLES` vale para as tabelas que **já existem**. Rode o `GRANT` depois de criar todas as tabelas
  (ou repita para tabelas novas).
- O `GRANT ... ON ALL SEQUENCES` é necessário por causa do `SERIAL`: sem ele o `INSERT` falha ao gerar o id.
- Para conferir: conecte no pgAdmin com `operador_almox` e tente `DELETE FROM produto WHERE id_produto = 1;`.
  O resultado esperado é `permissão negada para tabela produto` (`permission denied for table produto` no PostgreSQL em inglês).
- Para remover um privilégio: `REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM operador_almox;`
- Se precisar rodar o script de novo: `DROP OWNED BY operador_almox; DROP ROLE operador_almox;`

### Ligando o perfil ao usuário do banco

A API pode ter uma conexão para cada role e escolher pelo perfil do token:

`src/config/db.js`

```js
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

const sql = criarPool(process.env.DB_USER, process.env.DB_PASSWORD)   // login e cadastro de usuário
const sqlOperador = criarPool(process.env.DB_USER_OPERADOR, process.env.DB_PASSWORD_OPERADOR)
const sqlAdmin = criarPool(process.env.DB_USER_ADMIN, process.env.DB_PASSWORD_ADMIN)

export function conexaoDoPerfil(perfil) {
  return perfil === 'ADMIN' ? sqlAdmin : sqlOperador
}

export default sql
```

As variáveis `DB_USER_OPERADOR`, `DB_PASSWORD_OPERADOR`, `DB_USER_ADMIN` e `DB_PASSWORD_ADMIN` vão no `.env`
(e no `.env.example`) com os nomes e senhas das roles criadas acima.

Nesse caso o repository recebe a conexão como parâmetro (`buscarPorId(conexao, id)`) e o controller passa
`conexaoDoPerfil(request.user.perfil)`. É um nível a mais de segurança; a checagem com `permitir(...)`
nas rotas continua necessária para responder `403` com uma mensagem clara.

Documentação oficial: README do `bcrypt` e do `@fastify/jwt` (pasta `node_modules/<biblioteca>/README.md`);
Fastify > Reference > Hooks (preHandler); PostgreSQL > SQL Commands > CREATE ROLE, GRANT, REVOKE.
