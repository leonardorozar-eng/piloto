# Git: branch, commit e pull request

## O que é cada coisa

- **Repositório**: a pasta do projeto com todo o histórico de alterações. Fica no GitHub (remoto) e no seu computador (local).
- **Clone**: copiar o repositório do GitHub para o seu computador.
- **Branch**: uma linha de trabalho separada. A `main` é a branch principal. Quando você cria a sua branch, tudo o que você altera fica nela, sem mexer na `main`.
- **Commit**: uma "foto" das alterações, com uma mensagem dizendo o que foi feito. Fica salvo só no seu computador.
- **Push**: enviar os seus commits para o GitHub.
- **Pull request (PR)**: um pedido no GitHub para juntar a sua branch na `main`. É por ele que o professor vê tudo o que você fez.

```txt
main          o-----------------------------------  (código original)
               \
joao-silva      o------o------o------o              (seus commits)
                                      \
                                       pull request para a main
```

## Colaborador do repositório

Para conseguir enviar a sua branch, você precisa ser **colaborador** do repositório.
O dono do repositório envia um convite para a sua conta do GitHub. Ele aparece:

- no seu e-mail ("invited you to collaborate"), ou
- em `https://github.com/notifications`, ou no próprio link do repositório.

Clique em **Accept invitation**. Sem aceitar, o `git push` responde `403` / `Permission denied`.

## Identificação no Git

O Git precisa saber quem está fazendo os commits. Confira:

```bash
git config --global user.name
git config --global user.email
```

Se vier vazio, configure com os seus dados (o e-mail da sua conta do GitHub):

```bash
git config --global user.name "Joao Silva"
git config --global user.email "joao.silva@email.com"
```

Sem isso o commit dá o erro `Author identity unknown`.

## Clonar o repositório

No terminal, entre na pasta onde quer o projeto (por exemplo a Área de Trabalho) e rode:

```bash
git clone https://github.com/USUARIO/REPOSITORIO.git
cd REPOSITORIO
npm install
```

O `npm install` baixa as bibliotecas do `package.json` para a pasta `node_modules`.
Ele **precisa de internet**, então rode logo depois do clone. Depois disso as bibliotecas ficam no computador.

Abra a pasta no VS Code:

```bash
code .
```

## Criar a sua branch

O nome da branch é o seu nome e sobrenome, sem acento e sem espaço:

```bash
git checkout -b joao-silva
```

O `-b` cria a branch e já entra nela. Para conferir em qual branch você está:

```bash
git branch
```

A branch atual aparece com `*`. No VS Code ela também aparece no canto inferior esquerdo.

## Commit

Commit não precisa de internet. Vale fazer um commit sempre que terminar uma parte que funciona,
assim você nunca perde o que já estava pronto.

```bash
git status
git add .
git commit -m "Reorganiza o codigo em camadas"
```

- `git status`: mostra os arquivos alterados (vermelho = ainda não adicionado, verde = adicionado).
- `git add .`: adiciona todas as alterações da pasta no próximo commit.
- `git commit -m "..."`: grava o commit com a mensagem.

Boas mensagens dizem **o que** foi feito: `Adiciona login com JWT`, `Cria paginacao na listagem de produtos`,
`Adiciona plano de testes`. Evite `ajustes`, `teste`, `aaa`.

Para ver o histórico:

```bash
git log --oneline
```

### O que não vai para o repositório

O arquivo `.gitignore` lista o que o Git ignora. Neste projeto: `node_modules/`, `.env`, `dist/` e `*.log`.
O `.env` tem senhas, por isso ele não é versionado. Quem clona o projeto copia o `.env.example` para `.env`.
Se você criar uma variável nova no `.env` (por exemplo a chave do JWT), coloque ela também no `.env.example`, com um valor de exemplo.

## Push (enviar para o GitHub)

Precisa de internet. Na primeira vez que a branch vai para o GitHub:

```bash
git push -u origin joao-silva
```

Nas próximas vezes, só:

```bash
git push
```

Na primeira vez pode abrir uma janela do navegador pedindo login no GitHub (Git Credential Manager).
Faça o login com a sua conta e autorize.

## Pull request

Depois do push, abra o repositório no GitHub:

1. Aparece uma faixa amarela com **Compare & pull request**. Clique nela.
   Se não aparecer: aba **Pull requests** > **New pull request**.
2. Confira as branches: `base: main` ← `compare: joao-silva`.
3. Título: o seu nome e o que foi entregue (ex: `Joao Silva - entrega SAEP`).
4. Na descrição, liste o que foi feito (camadas, login, perfis, paginação, saída de estoque, testes).
5. Clique em **Create pull request**.

**Não clique em "Merge pull request".** Quem decide juntar na `main` é o dono do repositório.

Se você fizer mais commits e der `git push` depois de abrir o PR, eles entram no mesmo PR automaticamente.

## Erros comuns

| Mensagem | O que significa | Como resolver |
| --- | --- | --- |
| `Author identity unknown` | Git sem nome/e-mail | `git config --global user.name` e `user.email` |
| `403` / `Permission denied` | Você não é colaborador | Aceite o convite do repositório |
| `src refspec joao-silva does not match any` | Branch sem nenhum commit ou nome errado | Faça um commit e confira com `git branch` |
| `nothing to commit, working tree clean` | Não há nada novo para gravar | Tudo já está no último commit |
| `fatal: not a git repository` | O terminal está fora da pasta do projeto | `cd` para a pasta do projeto |
| `Updates were rejected` | O remoto tem commits que você não tem | `git pull` e depois `git push` |

## Resumo dos comandos

```bash
git clone URL                     # copia o repositório
git checkout -b nome-sobrenome    # cria e entra na branch
git status                        # o que mudou
git add .                         # prepara tudo
git commit -m "mensagem"          # grava (sem internet)
git push -u origin nome-sobrenome # envia a branch (com internet)
```

Documentação oficial: Pro Git, capítulos 2 (Git Basics) e 3 (Git Branching).
