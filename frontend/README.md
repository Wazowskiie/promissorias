# Sistema de Gestão de Promissórias
### Milton Motos e Peças

Sistema completo de gestão de promissórias desenvolvido em HTML, CSS e JavaScript puro, integrado com Supabase.

---

## 🚀 Funcionalidades

✅ **Dashboard Completo**
- Total de promissórias
- Promissórias pendentes, vencidas e pagas
- Valor total em aberto
- Estatísticas do mês

✅ **Gestão de Promissórias**
- Criar nova promissória
- Editar promissória existente
- Excluir promissória
- Visualizar detalhes

✅ **Filtros e Busca**
- Buscar por nome do cliente
- Filtrar por status (pendente, vencida, paga)
- Filtrar por veículo

✅ **Exportação**
- Exportar dados para CSV

---

## 📋 Pré-requisitos

1. Conta no [Supabase](https://supabase.com) (gratuita)
2. Navegador web moderno
3. Servidor web local (opcional, para desenvolvimento)

---

## 🔧 Configuração do Supabase

### Passo 1: Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha os dados:
   - **Name**: gestao-promissorias (ou outro nome de sua preferência)
   - **Database Password**: crie uma senha forte
   - **Region**: escolha a região mais próxima
5. Clique em "Create new project" e aguarde (pode levar 1-2 minutos)

### Passo 2: Configurar Banco de Dados

1. No painel do Supabase, vá em **SQL Editor** (ícone na lateral esquerda)
2. Clique em "New query"
3. Copie todo o conteúdo do arquivo `database.sql`
4. Cole no editor SQL
5. Clique em **RUN** (ou pressione Ctrl+Enter)
6. Aguarde a confirmação "Success. No rows returned"

### Passo 3: Obter Credenciais

1. No painel do Supabase, vá em **Settings** (⚙️ no menu lateral)
2. Clique em **API**
3. Você verá duas informações importantes:
   - **Project URL**: algo como `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: uma chave longa começando com `eyJ...`
4. Copie estas informações

### Passo 4: Configurar o Sistema

1. Abra o arquivo `config.js`
2. Substitua as informações:

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co'; // Cole sua URL aqui
const SUPABASE_ANON_KEY = 'eyJhbGc...'; // Cole sua chave aqui
```

3. Salve o arquivo

---

## 🖥️ Instalação Local

### Opção 1: Usando um servidor local (recomendado)

**Com Python (se já tiver instalado):**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Com Node.js (se já tiver instalado):**
```bash
# Instalar http-server globalmente
npm install -g http-server

# Executar
http-server
```

**Com PHP (se já tiver instalado):**
```bash
php -S localhost:8000
```

Depois acesse: `http://localhost:8000`

### Opção 2: Abrir diretamente no navegador

1. Localize o arquivo `index.html` no seu computador
2. Clique duas vezes para abrir no navegador
3. **Nota**: Alguns recursos podem não funcionar corretamente sem servidor

---

## 📁 Estrutura de Arquivos

```
sistema-promissorias/
│
├── index.html          # Página principal
├── styles.css          # Estilos
├── config.js           # Configurações do Supabase (CONFIGURE AQUI!)
├── app.js              # Lógica da aplicação
├── database.sql        # Script de criação do banco
└── README.md           # Este arquivo
```

---

## 🎯 Como Usar

### Criar Nova Promissória

1. Clique no botão **"+ Nova Promissória"**
2. Preencha os campos:
   - **Cliente**: Nome do cliente (obrigatório)
   - **Veículo**: Modelo do veículo (obrigatório)
   - **Valor Total**: Valor total da promissória (obrigatório)
   - **Valor Pago**: Valor já pago (opcional, padrão: 0)
   - **Data Vencimento**: Data de vencimento (obrigatório)
   - **Status**: Pendente, Vencida ou Paga (obrigatório)
   - **Observações**: Notas adicionais (opcional)
3. Clique em **"Salvar"**

### Editar Promissória

1. Na tabela, clique no botão **"Editar"** da promissória desejada
2. Altere os campos necessários
3. Clique em **"Salvar"**

### Excluir Promissória

1. Na tabela, clique no botão **"Excluir"** da promissória desejada
2. Confirme a exclusão

### Filtrar Promissórias

- **Por Cliente**: Digite o nome na caixa de busca
- **Por Status**: Selecione o status no dropdown
- **Por Veículo**: Selecione o veículo no dropdown

### Exportar para CSV

1. Clique no botão **"Exportar CSV"**
2. O arquivo será baixado automaticamente
3. Abra no Excel, Google Sheets ou qualquer editor de planilhas

---

## 🎨 Personalização

### Alterar Cores

Edite o arquivo `styles.css` e modifique as variáveis de cores:

```css
/* Cor principal (botões) */
.btn-primary {
    background: #4361ee; /* Altere aqui */
}

/* Cores dos status */
.card-value.yellow { color: #ffa500; }
.card-value.red { color: #dc3545; }
.card-value.green { color: #10b981; }
```

### Alterar Nome da Empresa

Edite o arquivo `index.html`:

```html
<h1>Gestão de Promissórias</h1>
<p class="subtitle">Milton Motos e Peças</p> <!-- Altere aqui -->
```

---

## 🔒 Segurança

### Configuração de Políticas RLS (Row Level Security)

O script SQL já configura políticas básicas que permitem todas as operações. Para produção, você pode querer restringir o acesso:

```sql
-- Exemplo: Permitir apenas leitura e escrita para usuários autenticados
DROP POLICY IF EXISTS "Permitir todas operações" ON promissorias;

CREATE POLICY "Usuários podem ler" ON promissorias
    FOR SELECT
    USING (true);

CREATE POLICY "Usuários autenticados podem inserir" ON promissorias
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
```

---

## 📊 Estrutura do Banco de Dados

### Tabela: promissorias

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| cliente | TEXT | Nome do cliente |
| veiculo | TEXT | Modelo do veículo |
| valor_total | DECIMAL | Valor total da promissória |
| valor_pago | DECIMAL | Valor já pago |
| data_vencimento | DATE | Data de vencimento |
| data_pagamento | DATE | Data do pagamento (quando paga) |
| status | TEXT | pendente, vencida ou paga |
| observacoes | TEXT | Observações |
| criada_em | TIMESTAMP | Data de criação |
| atualizada_em | TIMESTAMP | Data da última atualização |

---

## 🐛 Solução de Problemas

### Erro: "Erro ao carregar dados"

**Causa**: Credenciais do Supabase incorretas ou não configuradas

**Solução**: 
1. Verifique se editou o arquivo `config.js`
2. Confirme que copiou corretamente a URL e a chave do Supabase
3. Verifique se o projeto do Supabase está ativo

### Promissórias não aparecem

**Causa**: Tabela não foi criada ou está vazia

**Solução**:
1. Vá no Supabase → SQL Editor
2. Execute: `SELECT * FROM promissorias;`
3. Se der erro, execute novamente o script `database.sql`

### Botões não funcionam

**Causa**: JavaScript não está carregando

**Solução**:
1. Abra o Console do navegador (F12)
2. Verifique se há erros em vermelho
3. Certifique-se de que todos os arquivos estão na mesma pasta

### Erro de CORS

**Causa**: Abrindo arquivo HTML diretamente sem servidor

**Solução**: Use um servidor local (veja "Instalação Local")

---

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- 💻 Desktop
- 📱 Tablet
- 📱 Smartphone

---

## 🔄 Atualizações Futuras

Possíveis melhorias que podem ser implementadas:

- [ ] Sistema de login e autenticação
- [ ] Múltiplos usuários
- [ ] Notificações de vencimento
- [ ] Relatórios em PDF
- [ ] Gráficos e análises
- [ ] Histórico de pagamentos
- [ ] Upload de comprovantes
- [ ] Envio de lembretes por WhatsApp/Email

---

## 📞 Suporte

Em caso de dúvidas:

1. Verifique a seção "Solução de Problemas"
2. Consulte a documentação do Supabase: https://supabase.com/docs
3. Verifique o Console do navegador (F12) para erros

---

## 📄 Licença

Este projeto é livre para uso pessoal e comercial.

---

**Desenvolvido com ❤️ para Milton Motos e Peças**