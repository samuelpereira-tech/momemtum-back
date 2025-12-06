# Scripts de Importação

## Importar Pessoas do JSON para Supabase

Este script importa dados de pessoas do arquivo `storage/person/resultado.json` para a tabela `persons` no Supabase.

### Campos Importados

- **Nome** → `full_name`
- **Número de telefone** → `phone` (limpa formatação e remove código do país se presente)
- **Data de Nascimento** → `birth_date` (converte de DD/MM/YYYY para YYYY-MM-DD)
- **Foto** → `photo_url` (converte URL do Google Drive para formato de imagem direta)

### Pré-requisitos

1. Certifique-se de que as variáveis de ambiente estão configuradas no arquivo `.env`:
   ```
   SUPABASE_URL=sua_url_do_supabase
   SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
   ```

2. O arquivo `storage/person/resultado.json` deve existir e conter os dados no formato esperado.

### Como Executar

Execute o script usando npm:

```bash
# Importação normal (adiciona aos registros existentes)
npm run import:persons

# Importação com limpeza (deleta todos os registros antes de importar)
npm run import:persons -- --clear
```

Ou diretamente com ts-node:

```bash
# Importação normal
npx ts-node -r tsconfig-paths/register scripts/import-persons.ts

# Importação com limpeza
npx ts-node -r tsconfig-paths/register scripts/import-persons.ts --clear
```

### Parâmetros

- `--clear`, `--clean` ou `-c`: Deleta todos os registros da tabela `persons` antes de fazer a importação. Útil para garantir uma importação limpa sem duplicatas.

### Funcionamento

1. Se o parâmetro `--clear` for usado, deleta todos os registros existentes na tabela `persons`
2. O script lê o arquivo JSON
3. Transforma os dados para o formato do banco:
   - Limpa números de telefone (remove caracteres não numéricos)
   - Converte datas de DD/MM/YYYY para YYYY-MM-DD
   - Valida e filtra registros sem nome válido
4. Importa os dados em lotes de 10 registros para melhor performance
5. Exibe um resumo com estatísticas de sucesso e erros

### Tratamento de Erros

- Telefones inválidos são ignorados (não inseridos)
- Datas inválidas são ignoradas (não inseridas)
- Registros sem nome válido (menos de 3 caracteres) são filtrados
- Erros de inserção são registrados e exibidos no resumo final

### Notas

- O script faz uma pausa de 500ms entre lotes para evitar rate limiting
- Fotos do Google Drive são convertidas automaticamente para o formato de link direto de imagem
- **Importante**: Para que as imagens do Google Drive funcionem, os arquivos precisam estar configurados como "Qualquer pessoa com o link pode ver" no Google Drive
- Use `--clear` para evitar duplicatas e garantir uma importação limpa
- A limpeza deleta os registros em lotes de 50 para melhor performance e segurança

