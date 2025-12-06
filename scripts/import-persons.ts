import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

/**
 * Carrega variáveis de ambiente do arquivo .env
 */
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Ignora linhas vazias e comentários
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parseia linha no formato KEY=VALUE
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        let value = trimmedLine.substring(equalIndex + 1).trim();
        
        // Remove aspas se presentes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Define a variável de ambiente se ainda não estiver definida
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

interface PersonData {
  'Carimbo de data/hora': string;
  'Nome': string;
  'Número de telefone': string;
  'Data de Nascimento': string;
  'Foto': string | null;
  'Unnamed: 5': number | null;
}

interface TransformedPerson {
  full_name: string;
  phone?: string;
  birth_date?: string;
  photo_url?: string | null;
}

/**
 * Limpa o número de telefone, removendo caracteres não numéricos
 */
function cleanPhoneNumber(phone: string): string | undefined {
  if (!phone) return undefined;
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Remove código do país se presente (55)
  const phoneWithoutCountry = cleaned.startsWith('55') && cleaned.length > 11
    ? cleaned.substring(2)
    : cleaned;
  
  // Valida se tem 10 ou 11 dígitos
  if (phoneWithoutCountry.length >= 10 && phoneWithoutCountry.length <= 11) {
    return phoneWithoutCountry;
  }
  
  return undefined;
}

/**
 * Converte data de DD/MM/YYYY para YYYY-MM-DD
 */
function convertDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  
  try {
    const [day, month, year] = dateStr.split('/');
    if (day && month && year) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch (error) {
    console.warn(`Erro ao converter data: ${dateStr}`, error);
  }
  
  return undefined;
}

/**
 * Converte URL do Google Drive para formato de link direto de imagem
 * De: https://drive.google.com/open?id=FILE_ID
 * Para: https://drive.google.com/uc?export=view&id=FILE_ID
 */
function convertGoogleDriveUrl(url: string): string {
  if (!url) return url;
  
  // Verifica se é uma URL do Google Drive
  if (url.includes('drive.google.com')) {
    // Extrai o ID do arquivo de diferentes formatos
    let fileId: string | null = null;
    
    // Formato: https://drive.google.com/open?id=FILE_ID
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) {
      fileId = openMatch[1];
    }
    
    // Formato: https://drive.google.com/file/d/FILE_ID/view
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    }
    
    // Se encontrou o ID, converte para o formato de imagem direta
    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  
  // Se não for Google Drive ou não conseguir extrair o ID, retorna a URL original
  return url;
}

/**
 * Transforma os dados do JSON para o formato do banco
 */
function transformPersonData(person: PersonData): TransformedPerson {
  const transformed: TransformedPerson = {
    full_name: person.Nome?.trim() || '',
  };

  // Processa telefone
  const phone = cleanPhoneNumber(person['Número de telefone']);
  if (phone) {
    transformed.phone = phone;
  }

  // Processa data de nascimento
  const birthDate = convertDate(person['Data de Nascimento']);
  if (birthDate) {
    transformed.birth_date = birthDate;
  }

  // Processa foto - converte URL do Google Drive para formato de imagem direta
  if (person.Foto && person.Foto !== 'null' && person.Foto.trim() !== '') {
    const photoUrl = person.Foto.trim();
    transformed.photo_url = convertGoogleDriveUrl(photoUrl);
  }

  return transformed;
}

/**
 * Deleta todos os registros da tabela persons
 */
async function clearAllPersons(supabase: any): Promise<number> {
  console.log('🗑️  Limpando tabela persons...');
  
  // Primeiro, conta quantos registros existem
  const { count, error: countError } = await supabase
    .from('persons')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    throw new Error(`Erro ao contar registros: ${countError.message}`);
  }
  
  const totalRecords = count || 0;
  
  if (totalRecords === 0) {
    console.log('✅ Tabela já está vazia');
    return 0;
  }
  
  console.log(`   Encontrados ${totalRecords} registro(s) para deletar...`);
  
  // Deleta em lotes para evitar problemas de performance e limites de query
  const batchSize = 50;
  let deletedCount = 0;
  let hasMore = true;
  
  while (hasMore) {
    // Busca um lote de IDs
    const { data: batch, error: fetchError } = await supabase
      .from('persons')
      .select('id')
      .limit(batchSize);
    
    if (fetchError) {
      throw new Error(`Erro ao buscar registros: ${fetchError.message}`);
    }
    
    if (!batch || batch.length === 0) {
      hasMore = false;
      break;
    }
    
    // Deleta o lote
    const ids = batch.map((p: any) => p.id);
    const { error: deleteError } = await supabase
      .from('persons')
      .delete()
      .in('id', ids);
    
    if (deleteError) {
      throw new Error(`Erro ao deletar lote: ${deleteError.message}`);
    }
    
    deletedCount += batch.length;
    console.log(`   Deletando... ${deletedCount}/${totalRecords}`);
    
    // Se o lote foi menor que o batchSize, não há mais registros
    if (batch.length < batchSize) {
      hasMore = false;
    }
    
    // Pequena pausa entre lotes
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  
  console.log(`✅ ${deletedCount} registro(s) deletado(s) com sucesso`);
  return deletedCount;
}

/**
 * Função principal de importação
 */
async function importPersons(clearBeforeImport: boolean = false) {
  // Carrega variáveis de ambiente do arquivo .env
  loadEnvFile();
  
  // Valida variáveis de ambiente
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const envPath = path.join(process.cwd(), '.env');
    console.error('❌ Erro: SUPABASE_URL e SUPABASE_ANON_KEY devem estar definidas');
    console.error(`   Verifique se o arquivo .env existe em: ${envPath}`);
    console.error('   O arquivo .env deve conter:');
    console.error('   SUPABASE_URL=sua_url_do_supabase');
    console.error('   SUPABASE_ANON_KEY=sua_chave_anon_do_supabase');
    process.exit(1);
  }

  // Cria cliente Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Limpa a tabela se solicitado
  if (clearBeforeImport) {
    try {
      await clearAllPersons(supabase);
      console.log(''); // Linha em branco para separar
    } catch (error: any) {
      console.error('❌ Erro ao limpar tabela:', error.message);
      console.error('   Continuando com a importação...');
    }
  }

  // Caminho do arquivo JSON (relativo à raiz do projeto)
  const jsonPath = path.join(process.cwd(), 'storage', 'person', 'resultado.json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${jsonPath}`);
    process.exit(1);
  }

  // Lê o arquivo JSON
  console.log('📖 Lendo arquivo JSON...');
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const persons: PersonData[] = JSON.parse(jsonContent);

  console.log(`✅ ${persons.length} registros encontrados no arquivo`);

  // Transforma os dados
  console.log('🔄 Transformando dados...');
  const transformedPersons = persons
    .map(transformPersonData)
    .filter((p) => p.full_name && p.full_name.length >= 3) // Filtra registros sem nome válido
    .sort((a, b) => {
      // Ordena alfabeticamente por nome (case-insensitive)
      const nameA = a.full_name.toLowerCase().trim();
      const nameB = b.full_name.toLowerCase().trim();
      return nameA.localeCompare(nameB, 'pt-BR');
    });

  console.log(`✅ ${transformedPersons.length} registros válidos após transformação (ordenados por nome)`);

  // Estatísticas
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ name: string; error: string }> = [];

  // Importa em lotes para melhor performance
  const batchSize = 10;
  console.log(`\n📤 Iniciando importação em lotes de ${batchSize}...\n`);

  for (let i = 0; i < transformedPersons.length; i += batchSize) {
    const batch = transformedPersons.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(transformedPersons.length / batchSize);

    console.log(`📦 Processando lote ${batchNumber}/${totalBatches} (${batch.length} registros)...`);

    // Insere o lote
    const { data, error } = await supabase
      .from('persons')
      .insert(batch)
      .select();

    if (error) {
      console.error(`❌ Erro no lote ${batchNumber}:`, error.message);
      errorCount += batch.length;
      
      // Adiciona erros individuais
      batch.forEach((person) => {
        errors.push({
          name: person.full_name,
          error: error.message,
        });
      });
    } else {
      successCount += data?.length || 0;
      console.log(`✅ Lote ${batchNumber} importado com sucesso (${data?.length || 0} registros)`);
    }

    // Pequena pausa entre lotes para evitar rate limiting
    if (i + batchSize < transformedPersons.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Resumo final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DA IMPORTAÇÃO');
  console.log('='.repeat(50));
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📝 Total processado: ${transformedPersons.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Erros encontrados:');
    errors.slice(0, 10).forEach((err) => {
      console.log(`  - ${err.name}: ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... e mais ${errors.length - 10} erros`);
    }
  }

  console.log('\n✨ Importação concluída!');
}

// Verifica argumentos da linha de comando
const args = process.argv.slice(2);
const clearBeforeImport = args.includes('--clear') || args.includes('--clean') || args.includes('-c');

if (clearBeforeImport) {
  console.log('⚠️  Modo de limpeza ativado: todos os registros serão deletados antes da importação\n');
}

// Executa a importação
importPersons(clearBeforeImport)
  .then(() => {
    console.log('\n🎉 Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });

