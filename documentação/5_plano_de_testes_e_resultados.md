# Plano de testes, evidências e resultados

Testar é conferir, de forma organizada, se o sistema faz o que a regra pede.
São três produtos diferentes:

| Arquivo | Onde fica | O que é |
| --- | --- | --- |
| `plano_testes.docx` | `docs/` | O que vai ser testado e o que se espera (escrito **antes** de testar) |
| `cenario1.png`, `cenario2.png`... | `docs/testes/` | A prova de que o teste foi executado |
| `resultados.docx` | raiz do projeto | O que aconteceu de verdade, comparado com o esperado |

```txt
projeto/
  docs/
    plano_testes.docx
    testes/
      cenario1.png
      cenario2.png
      cenario3.png
  resultados.docx
```

Os nomes e as pastas são exatamente esses. Arquivo certo na pasta errada conta como arquivo que não existe.

## Cenário de teste

Cada cenário testa **uma** situação e tem:

- **Pré-condições**: como o sistema precisa estar antes (API rodando, usuário logado, produto com saldo X...).
- **Dados de entrada**: o que é enviado (o JSON, o token, a URL).
- **Passos de execução**: o que fazer, em ordem, para alguém repetir o teste sem você ao lado.
- **Resultado esperado**: o status HTTP e a resposta que a regra exige.

Os cenários saem dos **critérios de aceite** do caderno. Cada critério vira pelo menos um cenário:
o caso que deve ser bloqueado, o caso no limite e o caso normal. Valores no limite (exatamente igual ao saldo,
por exemplo) são onde os erros de `>` no lugar de `>=` aparecem.

## Modelo do plano de testes

Uma tabela por cenário. Exemplo preenchido:

**Cenário 1 – Saída com quantidade maior que o saldo**

| Campo | Conteúdo |
| --- | --- |
| Funcionalidade | Saída de produtos |
| Pré-condições | API rodando em `http://localhost:3000`; usuário OPERADOR logado (token válido); produto id 2 (Mouse optico) com saldo 25 |
| Dados de entrada | `POST /movimentar_produto` com `{ "id_produto": 2, "tipo": "SAIDA", "quantidade": 30 }` e `Authorization: Bearer <token>` |
| Passos de execução | 1. Consultar `GET /listar_produto/2` e anotar o saldo. 2. Enviar a requisição de saída. 3. Consultar `GET /listar_produto/2` de novo. |
| Resultado esperado | Status `422` com `Saída não permitida: estoque insuficiente. Disponível: 25. Solicitado: 30.`; saldo continua 25; nenhuma movimentação nova em `/listar_movimentacoes` |

Repita a mesma tabela para os outros cenários, mudando os dados e o resultado esperado
(saída exatamente igual ao saldo, saída menor que o saldo, conferência de data/hora e responsável...).

## Evidências

Evidência é o registro de que o teste foi executado: print da tela, arquivo de log, resposta salva.

- **Print**: `Windows + Shift + S` seleciona uma área da tela e copia. Cole no Paint (`Ctrl + V`) e salve como
  `docs/testes/cenario1.png`. No print deve aparecer a requisição **e** a resposta (no REST Client, as duas
  ficam lado a lado).
- **Resposta salva**: no painel de resposta do REST Client há um ícone para salvar a resposta em arquivo.
  Salve como `docs/testes/cenario1.txt` ou `.json`.

O padrão do nome é `cenarioX.extensão`: o X é o número do cenário no plano. `cenario1.png`, `cenario2.png`,
`cenario3.json`. Sem espaço, sem acento, tudo minúsculo.

## Modelo do documento de resultados

Para cada cenário executado:

**Cenário 1 – Saída com quantidade maior que o saldo**

| Campo | Conteúdo |
| --- | --- |
| Pré-condições | (as do plano, e como estavam de fato: saldo era 25) |
| Dados utilizados | `{ "id_produto": 2, "tipo": "SAIDA", "quantidade": 30 }`, usuário Otavio Operador |
| Passos executados | (o que foi feito de verdade) |
| Resultado esperado | Status `422`, mensagem `Saída não permitida: estoque insuficiente. Disponível: 25. Solicitado: 30.`, saldo 25 |
| Resultado obtido | (copie o que a API respondeu: status e corpo) |
| Comparação | (o obtido é igual ao esperado? em quê é diferente?) |
| Conclusão | **Aprovado** ou **Reprovado** |
| Evidência | `docs/testes/cenario1.png` |

Um teste **reprovado** não é um erro no documento: é o teste cumprindo o papel dele. Registre a diferença
honestamente. Se corrigir o código, execute de novo e registre a nova execução.

## Salvando em .docx

No Word: **Arquivo > Salvar como > Documento do Word (.docx)**.
No LibreOffice Writer: **Arquivo > Salvar como**, tipo **Word 2007-365 (.docx)**, e confirme **Usar formato Word**.

Tabelas: Word em **Inserir > Tabela** (2 colunas); LibreOffice em **Tabela > Inserir tabela**.

## Plano antes, resultado depois

O plano é escrito olhando a regra, não o sistema. As evidências e os resultados vêm da execução.
Por isso o `plano_testes.docx` existe antes de qualquer print, e o `resultados.docx` só depois deles.

Documentação oficial: REST Client (extensão do VS Code) > README; ajuda do Word/LibreOffice Writer.
