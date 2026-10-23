-- Execute no pgAdmin 4, no banco "empresa", depois de infra/bd.sql.
-- Botao direito no banco empresa > Query Tool > abrir este arquivo > Execute.

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  perfil VARCHAR(10) NOT NULL DEFAULT 'OPERADOR',
  CONSTRAINT chk_perfil_usuario CHECK (perfil IN ('OPERADOR', 'ADMIN'))
);

ALTER TABLE movimentacao
  ADD COLUMN IF NOT EXISTS data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE movimentacao
  ADD COLUMN IF NOT EXISTS id_usuario INT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimentacao_usuario'
  ) THEN
    ALTER TABLE movimentacao
      ADD CONSTRAINT fk_movimentacao_usuario
      FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);
  END IF;
END $$;

-- Senhas gravadas com bcrypt (admin123 e oper123). Nunca ficam em texto puro.
INSERT INTO usuario (nome, email, senha, perfil)
SELECT 'Ana Admin', 'ana@empresa.com', '$2b$10$lTUuU04fiecD9Mk4/5vSAe5oZ0Yd0VNSX3CtLqqylplgwAD2zKhqy', 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'ana@empresa.com');

INSERT INTO usuario (nome, email, senha, perfil)
SELECT 'Otavio Operador', 'otavio@empresa.com', '$2b$10$ni5gpkg0gbkuIaTttSvMWePvSpxA1BorWgFW4hW9lE4HpK2Pwu85W', 'OPERADOR'
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'otavio@empresa.com');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'operador_almox') THEN
    CREATE ROLE operador_almox LOGIN PASSWORD 'operador123';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_almox') THEN
    CREATE ROLE admin_almox LOGIN PASSWORD 'admin123';
  END IF;
END $$;

GRANT CONNECT ON DATABASE empresa TO operador_almox;
GRANT CONNECT ON DATABASE empresa TO admin_almox;
GRANT USAGE ON SCHEMA public TO operador_almox;
GRANT USAGE ON SCHEMA public TO admin_almox;

-- OPERADOR: consulta, insere e atualiza. Nao deleta.
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO operador_almox;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO operador_almox;

-- ADMIN: consulta, insere, atualiza e deleta.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admin_almox;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_almox;
