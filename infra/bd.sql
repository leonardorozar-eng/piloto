-- Antes de rodar: crie o banco "empresa" no pgAdmin
-- (botao direito em Databases > Create > Database...) e abra o Query Tool nele.

DROP TABLE IF EXISTS movimentacao;
DROP TABLE IF EXISTS produto;

CREATE TABLE produto (
  id_produto SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(255) NULL,
  valor_unitario NUMERIC(10,2) NOT NULL,
  quantidade INT NOT NULL DEFAULT 0,
  data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movimentacao (
  id_movimentacao SERIAL PRIMARY KEY,
  id_produto INT NOT NULL,
  tipo VARCHAR(10) NOT NULL,
  quantidade INT NOT NULL,
  CONSTRAINT chk_tipo_movimentacao CHECK (tipo IN ('ENTRADA','SAIDA')),
  CONSTRAINT fk_movimentacao_produto FOREIGN KEY (id_produto) REFERENCES produto (id_produto)
);

INSERT INTO produto (nome, descricao, valor_unitario, quantidade) VALUES
  ('Teclado ABNT2', 'Teclado USB padrao ABNT2 com fio', 89.90, 10),
  ('Mouse optico', 'Mouse optico USB 1000 DPI', 39.90, 25),
  ('Monitor 21 polegadas', 'Monitor LED 21 polegadas Full HD', 749.00, 5);

INSERT INTO movimentacao (id_produto, tipo, quantidade) VALUES
  (1, 'ENTRADA', 10),
  (2, 'ENTRADA', 25),
  (3, 'ENTRADA', 5);
