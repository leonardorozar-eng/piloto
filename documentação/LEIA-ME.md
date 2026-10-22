# Documentação de consulta

Material de apoio sobre as ferramentas usadas neste projeto (Node.js, Fastify, PostgreSQL),
com exemplos no mesmo domínio do sistema de estoque.

| Arquivo | Assunto |
| --- | --- |
| [0_git_branch_e_pull_request.md](0_git_branch_e_pull_request.md) | Clone, branch, commit, push e pull request |
| [1_organizacao_em_camadas.md](1_organizacao_em_camadas.md) | Separar rotas, controllers, services e repositories |
| [2_usuarios_bcrypt_jwt_e_perfis.md](2_usuarios_bcrypt_jwt_e_perfis.md) | Cadastro e login, senha com bcrypt, JWT, perfis OPERADOR/ADMIN e GRANT no PostgreSQL |
| [3_paginacao_e_filtros.md](3_paginacao_e_filtros.md) | LIMIT/OFFSET, filtro por nome (ILIKE) e por data |
| [4_movimentacoes_data_usuario_e_saida.md](4_movimentacoes_data_usuario_e_saida.md) | Data/hora e responsável na movimentação, saída com validação de saldo, transação |
| [5_plano_de_testes_e_resultados.md](5_plano_de_testes_e_resultados.md) | Cenários de teste, evidências e documento de resultados |

No VS Code, abra qualquer `.md` e use `Ctrl + Shift + V` para ver formatado.

Para testar as requisições, use a extensão **REST Client** com o arquivo `referencias.http` da raiz do projeto.
