# 📖 Manual do Usuário
# Sistema de Cadeia de Custódia de Evidências Digitais

**Versão:** 1.3.0  
**Classificação:** Uso Interno  
**Público-alvo:** Agentes de campo, peritos, analistas e gestores de operações

---

## Sumário

1. [Introdução](#1-introdução)
2. [Acesso ao Sistema](#2-acesso-ao-sistema)
3. [Painel Principal (Dashboard)](#3-painel-principal-dashboard)
4. [Gerenciamento de Operações](#4-gerenciamento-de-operações)
5. [Equipes de Deflagração](#5-equipes-de-deflagração)
6. [Alvos](#6-alvos)
7. [Dispositivos Eletrônicos](#7-dispositivos-eletrônicos)
8. [Cadeia de Custódia](#8-cadeia-de-custódia)
9. [Fotografias de Evidências](#9-fotografias-de-evidências)
10. [Documentos](#10-documentos)
11. [Hashes de Integridade](#11-hashes-de-integridade)
12. [Laudos Periciais](#12-laudos-periciais)
13. [Relatórios Estatísticos](#13-relatórios-estatísticos)
14. [Log de Auditoria](#14-log-de-auditoria)
15. [Gerenciamento de Usuários](#15-gerenciamento-de-usuários)
16. [App Mobile — Coleta Guiada em Campo](#16-app-mobile--coleta-guiada-em-campo)
17. [Fluxo Completo de uma Operação](#17-fluxo-completo-de-uma-operação)
18. [Papéis e Permissões](#18-papéis-e-permissões)
19. [Perguntas Frequentes (FAQ)](#19-perguntas-frequentes-faq)

---

## 1. Introdução

O **Sistema de Cadeia de Custódia de Evidências Digitais** é uma plataforma institucional desenvolvida para garantir a rastreabilidade, integridade e documentação de evidências eletrônicas apreendidas durante operações policiais e investigativas.

O sistema opera em duas frentes complementares:

- **Plataforma Web** — para gestão completa de operações, alvos, dispositivos, custódia, documentos e geração de laudos.
- **Aplicativo Mobile Android** — para coleta guiada e padronizada de fotografias forenses diretamente no campo, com suporte offline.

### 1.1 Princípios Fundamentais

| Princípio | Descrição |
|-----------|-----------|
| **Rastreabilidade** | Toda ação é registrada com usuário, data/hora e IP |
| **Integridade** | Hashes SHA-256 verificam que evidências não foram adulteradas |
| **Imutabilidade** | Registros de custódia e auditoria não podem ser alterados ou excluídos |
| **Padronização** | Coleta fotográfica seguindo 8 etapas forenses obrigatórias |
| **Cadeia documental** | Toda a cadeia de posse da evidência é documentada e auditável |

---

## 2. Acesso ao Sistema

### 2.1 Login na Plataforma Web

1. Acesse o endereço do sistema fornecido pelo administrador (padrão: `http://localhost:5173`).
2. Na tela de login, informe seu **Usuário** e **Senha**.
3. Clique em **Entrar**.

> Caso não possua cadastro, solicite ao Administrador do sistema.

### 2.2 Esqueci minha senha

Contate o administrador do sistema para redefinição de senha. Não há recuperação automática por e-mail nesta versão.

### 2.3 Credencial padrão (primeiro acesso)

| Campo | Valor |
|-------|-------|
| Usuário | `admin` |
| Senha | `Admin@123!` |

> ⚠️ **Altere a senha no primeiro acesso antes de qualquer uso operacional.**

### 2.4 Segurança da Sessão

- A sessão expira automaticamente após período de inatividade.
- O sistema renova o token em segundo plano enquanto você está trabalhando.
- Ao fechar o navegador, faça logout para encerrar a sessão com segurança.

---

## 3. Painel Principal (Dashboard)

Após o login, você é direcionado ao **Dashboard**, que exibe:

- **Total de Operações** ativas no sistema
- **Total de Alvos** cadastrados
- **Total de Dispositivos** apreendidos
- **Movimentações recentes** de custódia
- **Acesso rápido** às operações mais recentes

O dashboard é atualizado em tempo real e reflete apenas os dados às quais o usuário tem acesso, conforme seu papel no sistema.

---

## 4. Gerenciamento de Operações

A **Operação** é o registro central do sistema. Toda evidência está vinculada a uma operação.

### 4.1 Listar Operações

- No menu lateral, clique em **Operações**.
- Utilize os filtros de **status**, **ano** e o campo de **busca** por nome ou número do procedimento.

### 4.2 Criar uma Nova Operação

1. Clique no botão **Nova Operação** (canto superior direito).
2. Preencha os campos:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome da Operação** | ✅ | Nome oficial da operação (ex: "Operação Alvorada") |
| **Número do Procedimento** | ✅ | Número do inquérito ou procedimento correspondente |
| **Descrição** | ❌ | Descrição adicional e contexto da operação |
| **Status** | ✅ | `Planejamento`, `Em andamento`, `Encerrada`, `Arquivada` |
| **Data de Início** | ❌ | Data de início das atividades |
| **Data de Encerramento** | ❌ | Data de encerramento |
| **Unidade Responsável** | ❌ | Delegacia, setor ou unidade executora |
| **Responsável** | ❌ | Nome do delegado ou responsável pela operação |

3. Clique em **Salvar**.

### 4.3 Dashboard da Operação

Ao clicar em uma operação, você acessa o seu **painel interno** com:

- **Contadores** — total de alvos, dispositivos, movimentações de custódia e documentos
- **Membros** — usuários com acesso à operação
- **Alvos** — lista de alvos vinculados
- **Equipes de Deflagração** — equipes criadas para a operação
- **Documentos** — arquivos técnicos vinculados à operação

### 4.4 Adicionar Membros à Operação

1. Dentro da operação, acesse a aba **Membros**.
2. Clique em **Adicionar Membro**.
3. Selecione o usuário e defina se ele será **Administrador da Operação**.

> O Administrador da Operação pode gerenciar equipes, alvos e dispositivos, mesmo sem ser Admin global.

### 4.5 Status das Operações

| Status | Descrição |
|--------|-----------|
| `Planejamento` | Operação em fase de preparação, não iniciada |
| `Em andamento` | Operação ativa, em execução |
| `Encerrada` | Operação concluída, registros em consulta |
| `Arquivada` | Operação arquivada, acesso restrito |

---

## 5. Equipes de Deflagração

As **Equipes de Deflagração** organizam os agentes que participarão do cumprimento de mandado ou abordagem operacional.

### 5.1 Criar uma Equipe

1. Dentro da operação, acesse **Equipes**.
2. Clique em **Nova Equipe**.
3. Preencha:

| Campo | Descrição |
|-------|-----------|
| **Nome da Equipe** | Identificador da equipe (ex: "Equipe Alpha") |
| **Líder** | Usuário responsável pela equipe |
| **Observações** | Informações adicionais |

### 5.2 Adicionar Membros à Equipe

1. Dentro da equipe, clique em **Adicionar Membro**.
2. Selecione o usuário e defina a **função** dentro da equipe.
3. Indique se o membro está **ativo**.

### 5.3 Vincular Alvos à Equipe

Cada equipe pode ser responsável por um ou mais alvos. Na aba **Alvos da Equipe**:

1. Clique em **Vincular Alvo**.
2. Selecione o alvo previamente cadastrado na operação.

---

## 6. Alvos

Os **Alvos** são as pessoas físicas ou jurídicas investigadas na operação.

### 6.1 Cadastrar um Alvo

1. Dentro da operação, acesse **Alvos**.
2. Clique em **Novo Alvo**.
3. Preencha os campos:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome Completo** | ✅ | Nome civil completo |
| **Nome Social** | ❌ | Nome social, se aplicável |
| **Apelido** | ❌ | Nome pelo qual é conhecido |
| **Tipo de Pessoa** | ✅ | `Pessoa Física` ou `Pessoa Jurídica` |
| **CPF / CNPJ** | ❌ | Documento de identificação |
| **RG** | ❌ | Registro Geral |
| **Data de Nascimento** | ❌ | Data de nascimento |
| **Endereço** | ❌ | Endereço completo |
| **Observações** | ❌ | Informações adicionais relevantes |

4. Clique em **Salvar**.

### 6.2 Detalhe do Alvo

Na página de detalhe do alvo você encontra:

- **Informações pessoais** completas
- **Fotos do alvo** — para identificação visual
- **Dispositivos vinculados** — todos os dispositivos apreendidos com este alvo
- **Equipes** — equipes que têm este alvo como responsabilidade

### 6.3 Adicionar Fotos do Alvo

1. Na aba **Fotos**, clique em **Adicionar Foto**.
2. Selecione o arquivo de imagem.
3. A foto é armazenada com segurança e associada ao alvo.

---

## 7. Dispositivos Eletrônicos

Os **Dispositivos** são as evidências eletrônicas apreendidas. Cada dispositivo possui um registro único com QR Code.

### 7.1 Cadastrar um Dispositivo

1. Na página do alvo ou da operação, clique em **Novo Dispositivo**.
2. Preencha os campos gerais:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Número da Evidência** | ✅ | Código único de identificação (ex: "EV-2026-001") |
| **Tipo de Dispositivo** | ✅ | Veja tabela de tipos abaixo |
| **Número do Lacre** | ❌ | Número do lacre da sacola de evidência |
| **Marca** | ❌ | Fabricante do dispositivo |
| **Modelo** | ❌ | Modelo específico |
| **Cor** | ❌ | Cor predominante |
| **Número de Série** | ❌ | Serial number do dispositivo |
| **Data de Apreensão** | ❌ | Data em que foi apreendido |
| **Local de Apreensão** | ❌ | Endereço ou descrição do local |
| **Observações** | ❌ | Informações adicionais |
| **Status** | ✅ | Status atual na cadeia de custódia |
| **Alvo** | ❌ | Alvo ao qual o dispositivo pertence |

### 7.2 Tipos de Dispositivo

| Tipo | Código |
|------|--------|
| Smartphone | `smartphone` |
| Tablet | `tablet` |
| Notebook | `notebook` |
| Desktop | `desktop` |
| Servidor | `server` |
| HD Externo | `hd` |
| SSD | `ssd` |
| Pendrive | `pendrive` |
| Cartão de Memória | `memory_card` |
| DVR / NVR | `dvr` |
| Equipamento de Rede | `network_equipment` |
| Outros | `other` |

### 7.3 Dados Extras por Tipo

O campo **Dados Extras** (JSONB) armazena informações específicas por tipo:

- **Smartphone**: IMEI 1, IMEI 2, operadora, sistema operacional, versão do Android/iOS
- **Notebook**: Processador, RAM, capacidade de armazenamento, sistema operacional
- **DVR**: Canais, resolução, capacidade do HD interno

### 7.4 Status do Dispositivo

| Status | Descrição |
|--------|-----------|
| `Apreendido` | Recém coletado, ainda na cena |
| `Em custódia` | Armazenado no depósito de evidências |
| `Em análise` | Em poder do perito para análise |
| `Finalizado` | Análise concluída |
| `Devolvido` | Devolvido ao proprietário (por decisão judicial) |

### 7.5 QR Code do Dispositivo

Cada dispositivo recebe automaticamente um **QR Code** único gerado no momento do cadastro. Esse QR Code:

- Aponta diretamente para o registro digital do dispositivo
- Pode ser impresso e colado na sacola de evidência
- Permite acesso rápido ao histórico de custódia via leitura do código

Para visualizar ou imprimir o QR Code, acesse o detalhe do dispositivo e clique no ícone de QR Code.

---

## 8. Cadeia de Custódia

A **Cadeia de Custódia** registra todo o histórico de posse e movimentação de cada dispositivo. É o coração do sistema — um registro imutável que não pode ser alterado ou excluído.

### 8.1 Registrar uma Movimentação

1. No detalhe do dispositivo, acesse a aba **Custódia**.
2. Clique em **Nova Movimentação**.
3. Preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Tipo de Movimentação** | ✅ | Veja tabela de tipos abaixo |
| **Responsável** | ✅ | Quem está realizando a movimentação |
| **Local de Origem** | ❌ | De onde o dispositivo sai |
| **Local de Destino** | ❌ | Para onde o dispositivo vai |
| **Observações** | ❌ | Justificativas, número de protocolo, etc. |

### 8.2 Tipos de Movimentação de Custódia

| Tipo | Descrição |
|------|-----------|
| `Apreensão` | Captura inicial na cena de crime |
| `Recebimento` | Recebimento no setor de custódia |
| `Transferência` | Transferência entre setores ou responsáveis |
| `Encaminhamento para Análise` | Envio ao laboratório forense |
| `Retorno da Análise` | Retorno do laboratório |
| `Devolução` | Entrega ao proprietário |
| `Descarte` | Destruição autorizada |

### 8.3 Timeline de Custódia

Na aba **Timeline**, é exibida uma linha do tempo visual com todas as movimentações, mostrando:

- Data e hora de cada evento
- Responsável pela movimentação
- Locais de origem e destino
- Observações registradas

### 8.4 Imprimir Histórico de Custódia

Para gerar um documento PDF com o histórico completo:

1. Acesse a aba **Custódia** do dispositivo.
2. Clique no botão **Imprimir** (ícone de impressora).
3. O documento PDF é gerado com cabeçalho institucional e toda a cadeia de movimentações.

> O PDF pode ser usado como documento oficial em processos e relatórios.

---

## 9. Fotografias de Evidências

As fotografias são registros visuais das evidências para documentação forense.

### 9.1 Upload de Fotografias (via Web)

1. No detalhe do dispositivo, acesse a aba **Fotos**.
2. Clique em **Adicionar Foto**.
3. Selecione o arquivo (JPEG, PNG, HEIC).
4. Escolha a **categoria** da foto:

| Categoria | Descrição |
|-----------|-----------|
| `Frente` | Parte frontal do dispositivo |
| `Traseira` | Parte traseira |
| `Lacre` | Dispositivo lacrado na sacola |
| `Número de Série` | Etiqueta com serial number |
| `IMEI` | Etiqueta com IMEI |
| `Estado da Evidência` | Danos físicos ou estado geral |
| `Outros` | Demais registros fotográficos |

5. Adicione uma **legenda** opcional.
6. Clique em **Salvar**.

### 9.2 Coleta Guiada via App Mobile

Para coleta padronizada em campo, utilize o **Aplicativo Mobile** (descrito na seção 16). As fotos coletadas via app incluem automaticamente:

- Hash SHA-256 de integridade
- Coordenadas GPS
- Timestamp exato da captura
- IMEI/Serial extraídos por OCR (quando aplicável)

---

## 10. Documentos

A aba **Documentos** (anteriormente "Laudos Periciais") centraliza os arquivos técnicos vinculados a operações ou dispositivos.

### 10.1 Adicionar um Documento

1. Acesse a operação ou o dispositivo.
2. Clique na aba **Documentos**.
3. Clique em **Novo Documento**.
4. Preencha:

| Campo | Descrição |
|-------|-----------|
| **Título** | Nome descritivo do documento |
| **Arquivo** | PDF, DOCX, XLSX ou outro formato aceito |
| **Tipo** | Laudo Pericial, Relatório Técnico, Auto de Apreensão, etc. |
| **Observações** | Anotações adicionais |

5. Clique em **Salvar**.

### 10.2 Controle de Exclusão

> ⚠️ **Importante:** Apenas o **autor** do documento ou um **Administrador** pode removê-lo. Esta restrição existe para preservar a integridade documental.

### 10.3 Download de Documentos

Clique no nome do documento para fazer o download. Os arquivos são armazenados com segurança no MinIO (compatível com S3).

---

## 11. Hashes de Integridade

Os **Hashes de Integridade** são impressões digitais criptográficas que garantem que uma evidência digital não foi alterada desde sua coleta.

### 11.1 Registrar um Hash

1. No detalhe do dispositivo, acesse a aba **Integridade**.
2. Clique em **Novo Hash**.
3. Preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Arquivo / Item** | ✅ | Identificação do arquivo ou mídia analisada |
| **SHA-256** | ✅ | Hash SHA-256 (hexadecimal de 64 chars) |
| **SHA-1** | ❌ | Hash SHA-1 (40 chars) |
| **MD5** | ❌ | Hash MD5 (32 chars) |
| **Ferramenta Utilizada** | ❌ | Software usado para calcular (ex: FTK, HashCheck) |
| **Observações** | ❌ | Condições da coleta, versão do software, etc. |

4. Clique em **Salvar**.

### 11.2 Como Calcular Hashes

**Windows (PowerShell):**
```powershell
Get-FileHash -Algorithm SHA256 -Path "C:\evidencia.dd"
```

**Linux / macOS:**
```bash
sha256sum evidencia.dd
```

**Ferramentas forenses:** FTK Imager, AccessData FTK, Autopsy, HashCalc.

### 11.3 Verificar Integridade

Para verificar que um arquivo não foi alterado, recalcule o hash e compare com o registrado no sistema. Hashes idênticos confirmam a integridade.

---

## 12. Laudos Periciais

O sistema permite a **geração automática de laudos periciais em PDF** a partir de templates configuráveis.

### 12.1 Templates de Laudo

Os templates são criados pelo Administrador e definem a estrutura e o conteúdo do laudo. Acesse **Configurações → Templates de Laudo** para gerenciá-los.

### 12.2 Gerar um Laudo

1. No detalhe do dispositivo ou da operação, acesse **Gerar Laudo**.
2. Selecione o **template** desejado.
3. Preencha os campos variáveis solicitados pelo template.
4. Clique em **Gerar PDF**.
5. O laudo é salvo automaticamente e pode ser baixado na aba **Documentos Gerados**.

### 12.3 Laudos Gerados

Todos os laudos gerados ficam registrados com:
- Data e hora de geração
- Usuário que gerou
- Template utilizado
- Arquivo PDF disponível para download

---

## 13. Relatórios Estatísticos

Os relatórios estatísticos fornecem uma visão quantitativa do sistema para gestão e prestação de contas.

### 13.1 Relatório Estatístico Geral

1. No menu lateral, clique em **Estatísticas**.
2. Selecione a opção **Relatório Geral do Sistema**.
3. Escolha o filtro:
   - **Todos os Anos** — consolida todos os dados históricos
   - **Ano específico** — filtra apenas o período selecionado
4. O relatório exibe:

| Indicador | Descrição |
|-----------|-----------|
| Total de Operações | Por status (planejamento, ativas, encerradas) |
| Total de Alvos | Distribuição por tipo (PF/PJ) |
| Total de Dispositivos | Por tipo (smartphone, HD, etc.) |
| Movimentações de Custódia | Total e por tipo |
| Documentos e Laudos | Total gerado |
| Hashes Registrados | Por algoritmo |

### 13.2 Relatório por Operação

1. Dentro de uma operação, acesse **Relatório Estatístico**.
2. O relatório apresenta os dados específicos daquela operação:
   - Número de alvos e dispositivos
   - Distribuição de dispositivos por tipo
   - Status dos dispositivos
   - Total de movimentações de custódia
   - Total de documentos e hashes

### 13.3 Exportar Relatório

Clique em **Exportar PDF** para gerar um documento imprimível do relatório estatístico.

---

## 14. Log de Auditoria

O **Log de Auditoria** registra todas as ações realizadas no sistema. Este registro é **imutável** — nenhuma entrada pode ser alterada ou excluída.

### 14.1 Acessar o Log

1. No menu lateral, clique em **Auditoria**.
2. Utilize os filtros disponíveis:

| Filtro | Descrição |
|--------|-----------|
| **Usuário** | Filtrar por usuário específico |
| **Ação** | Tipo de ação (CREATE, UPDATE, DELETE, etc.) |
| **Recurso** | Tipo de entidade afetada (device, target, operation, etc.) |
| **Data Início / Fim** | Intervalo de datas |

### 14.2 Informações de Cada Registro

| Campo | Descrição |
|-------|-----------|
| **Data/Hora** | Timestamp preciso da ação (com timezone) |
| **Usuário** | Quem realizou a ação |
| **Ação** | O que foi feito |
| **Recurso** | Tipo de registro afetado |
| **ID do Recurso** | Identificador único do registro |
| **Detalhes** | Dados adicionais da operação |
| **IP** | Endereço IP da requisição |

### 14.3 Quem pode ver o Log

- **Administradores** — acesso total ao log de todas as operações
- **Auditores** — acesso total ao log (somente leitura)
- **Outros papéis** — acesso restrito ao log de suas próprias ações

---

## 15. Gerenciamento de Usuários

Esta seção é exclusiva para **Administradores**.

### 15.1 Criar um Novo Usuário

1. No menu lateral, clique em **Usuários**.
2. Clique em **Novo Usuário**.
3. Preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome Completo** | ✅ | Nome civil do usuário |
| **Usuário (login)** | ✅ | Nome de usuário único para login |
| **E-mail** | ✅ | E-mail institucional |
| **Senha** | ✅ | Senha inicial (mínimo 8 caracteres) |
| **Papel** | ✅ | Papel no sistema (ver seção 18) |
| **Matrícula** | ❌ | Número funcional |
| **Unidade** | ❌ | Setor ou delegacia |
| **Ativo** | ✅ | Se o usuário pode fazer login |

4. Clique em **Salvar**.

### 15.2 Alterar Dados de um Usuário

1. Clique no usuário desejado.
2. Clique em **Editar**.
3. Faça as alterações necessárias.
4. Clique em **Salvar**.

### 15.3 Desativar um Usuário

Para impedir o acesso de um usuário sem excluir seus registros:

1. Acesse o usuário.
2. Desmarque a opção **Usuário Ativo**.
3. Salve.

> Os registros criados pelo usuário permanecem preservados no sistema.

### 15.4 Alterar Senha

Os usuários podem alterar sua própria senha no menu de perfil. Administradores podem redefinir a senha de qualquer usuário.

---

## 16. App Mobile — Coleta Guiada em Campo

O **Aplicativo Mobile** é destinado a agentes de campo para registro padronizado de fotografias durante apreensões.

> O app funciona **offline** — você pode coletar fotografias sem conexão com a internet e sincronizar quando retornar à cobertura de rede.

### 16.1 Instalação

O APK deve ser fornecido pela administração do sistema. Para instalar:

1. Habilite **Fontes Desconhecidas** no Android: *Configurações → Segurança → Instalar apps desconhecidos*.
2. Transfira o APK para o dispositivo.
3. Toque no arquivo para instalar.

### 16.2 Primeiro Acesso

1. Abra o aplicativo **Cadeia de Custódia — Campo**.
2. Na tela de login, informe as mesmas credenciais do sistema web.
3. Toque em **Entrar**.

### 16.3 Iniciando uma Sessão de Coleta

Antes de iniciar a coleta fotográfica, você deve selecionar:

**Passo 1 — Selecionar Operação**
- Toque em uma operação ativa da lista.

**Passo 2 — Selecionar Equipe**
- Toque na equipe de deflagração responsável.

**Passo 3 — Selecionar Alvo**
- Toque no alvo que será abordado.
- Uma **sessão de coleta** é criada automaticamente.

### 16.4 Cadastrar um Dispositivo

Para cada dispositivo apreendido:

1. Na tela de dispositivos da sessão, toque em **Novo Dispositivo**.
2. Selecione o **tipo** de dispositivo.
3. Informe (opcionalmente): marca, modelo, cor, local de apreensão.
4. Toque em **Iniciar Fotografias** — o assistente é aberto automaticamente.

### 16.5 Assistente Fotográfico — 8 Etapas

O assistente guia o agente por **8 etapas padronizadas** de fotografia:

---

#### Etapa 1 — Contexto
> **Fotografe o dispositivo exatamente como foi encontrado.**

Registre a posição original da evidência (sobre mesa, em gaveta, em bolso, em veículo, etc.). Esta é a primeira fotografia forense — preserve o estado original.

**Obrigatória:** ✅ | Mínimo: 1 foto | Máximo: 5 fotos

---

#### Etapa 2 — Ambiente Amplo
> **Fotografe o ambiente completo do local.**

Documente o contexto espacial: a sala, o veículo, o local de apreensão. Garanta que o ambiente é identificável.

**Obrigatória:** ✅ | Mínimo: 1 foto | Máximo: 5 fotos

---

#### Etapa 3 — Frente do Dispositivo
> **Fotografe a parte frontal.**

Capte a tela e o frontal do dispositivo com clareza. Se a tela estiver ligada, registre o que está exibido.

**Obrigatória:** ✅ | Mínimo: 1 foto | Máximo: 3 fotos

---

#### Etapa 4 — Traseira do Dispositivo
> **Fotografe a parte traseira.**

Capture o verso, onde geralmente estão câmeras, lacres de garantia e etiquetas do fabricante.

**Obrigatória:** ✅ | Mínimo: 1 foto | Máximo: 3 fotos

---

#### Etapa 5 — Laterais
> **Fotografe as laterais do dispositivo.**

Registre botões, entradas (USB, SIM), possíveis danos físicos nas bordas.

**Obrigatória:** ❌ | Máximo: 4 fotos

---

#### Etapa 6 — Número de Série / IMEI *(com OCR automático)*
> **Fotografe a etiqueta com serial e/ou IMEI.**

O sistema tentará extrair automaticamente o IMEI e o número de série da foto usando **OCR**. O resultado do reconhecimento é exibido na tela para conferência.

> Aponte a câmera diretamente para a etiqueta com boa iluminação. O OCR funciona offline.

**Obrigatória:** ✅ | Mínimo: 1 foto | Máximo: 3 fotos

---

#### Etapa 7 — Dispositivo Lacrado
> **Fotografe o dispositivo já acondicionado e lacrado.**

Após acondicionar o dispositivo na sacola de evidência e aplicar o lacre, fotografe-o. Esta é a documentação do momento do lacramento.

**Obrigatória:** ✅ | Mínimo: 1 foto | Máximo: 2 fotos

---

#### Etapa 8 — Fotos Adicionais
> **Fotografias complementares.**

Danos físicos, cabos conectados, tela ligada com aplicativos, mensagens exibidas, notificações visíveis, ou qualquer outra evidência relevante.

**Obrigatória:** ❌ | Sem limite de fotos

---

### 16.6 Metadados Forenses Automáticos

Cada fotografia capturada pelo app registra automaticamente:

| Metadado | Origem |
|----------|--------|
| **Hash SHA-256** | Calculado do arquivo da foto |
| **Latitude / Longitude** | GPS do dispositivo |
| **Data/Hora da Captura** | Relógio do dispositivo |
| **Modelo do celular** | Informação do dispositivo Android |
| **IMEI detectado** (etapa 6) | OCR — Google ML Kit |
| **Serial detectado** (etapa 6) | OCR — Google ML Kit |

### 16.7 Sincronizar com o Servidor

Quando terminar a coleta (ou ao retornar com cobertura de rede):

1. Na tela de dispositivos da sessão, toque em **Sincronizar** (ícone de nuvem).
2. Toque em **Iniciar Sincronização**.
3. O app enviará todas as fotos e metadados para o servidor.
4. Um resumo exibirá: dispositivos sincronizados, fotos enviadas e eventuais erros.

> Se houver erros parciais, toque em **Tentar Novamente** para reenviar apenas os itens pendentes.

### 16.8 Operação Offline

O app armazena localmente:
- Metadados da sessão (operação, equipe, alvo)
- Dados de cada dispositivo
- Metadados de cada foto (hash, GPS, timestamp)
- Os arquivos das fotos (no armazenamento interno do celular)

A sincronização pode ser feita horas ou dias depois sem perda de dados.

---

## 17. Fluxo Completo de uma Operação

Este é o fluxo recomendado do início ao fim de uma operação:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRÉ-OPERAÇÃO (Sistema Web)                   │
│                                                                   │
│  1. Admin cria a Operação                                        │
│  2. Admin/Op. Admin cadastra os Alvos                            │
│  3. Admin cria as Equipes de Deflagração                         │
│  4. Admin adiciona Membros às Equipes                            │
│  5. Admin vincula Alvos às Equipes                               │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DEFLAGRAÇÃO (App Mobile)                     │
│                                                                   │
│  6.  Agente faz login no App Mobile                              │
│  7.  Seleciona Operação → Equipe → Alvo                          │
│  8.  Para cada dispositivo encontrado:                           │
│      a. Cadastra o dispositivo no app                            │
│      b. Percorre as 8 etapas fotográficas                        │
│      c. OCR captura IMEI/Serial automaticamente                  │
│  9.  Ao retornar: sincroniza com o servidor                      │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PÓS-DEFLAGRAÇÃO (Sistema Web)               │
│                                                                   │
│  10. Perito/Analista cadastra Dispositivos definitivos            │
│  11. Registra movimentações de Custódia                          │
│  12. Registra Hashes de Integridade (SHA-256)                    │
│  13. Faz upload de Documentos técnicos                           │
│  14. Gera Laudos Periciais automáticos                           │
│  15. Emite Relatório Estatístico da Operação                     │
│  16. Admin encerra a Operação                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 18. Papéis e Permissões

| Papel | Código | Permissões Resumidas |
|-------|--------|---------------------|
| **Administrador** | `admin` | Acesso total: usuários, operações, dispositivos, documentos, auditoria |
| **Custódia** | `custody` | Registrar e visualizar movimentações de custódia; ver dispositivos |
| **Perito** | `expert` | Criar documentos, laudos e hashes; ver todas as evidências |
| **Analista** | `analyst` | Leitura completa; registrar hashes; usar o app mobile |
| **Auditor** | `auditor` | Somente log de auditoria (leitura) |

### Matriz Detalhada de Permissões

| Funcionalidade | Admin | Custódia | Perito | Analista | Auditor |
|----------------|:-----:|:--------:|:------:|:--------:|:-------:|
| Criar Operação | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar Operação | ✅ | ❌ | ❌ | ❌ | ❌ |
| Criar Alvo | ✅ | ❌ | ✅ | ✅ | ❌ |
| Criar Dispositivo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Registrar Custódia | ✅ | ✅ | ✅ | ✅ | ❌ |
| Upload de Fotos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Upload de Documentos | ✅ | ❌ | ✅ | ✅ | ❌ |
| Excluir Documento (próprio) | ✅ | ❌ | ✅ | ✅ | ❌ |
| Excluir Documento (qualquer) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerar Laudo | ✅ | ❌ | ✅ | ✅ | ❌ |
| Registrar Hash | ✅ | ❌ | ✅ | ✅ | ❌ |
| Relatórios Estatísticos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Log de Auditoria | ✅ | ❌ | ❌ | ❌ | ✅ |
| Gerenciar Usuários | ✅ | ❌ | ❌ | ❌ | ❌ |
| Usar App Mobile | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 19. Perguntas Frequentes (FAQ)

**P: Posso excluir um dispositivo cadastrado por engano?**  
R: Dispositivos são removidos com exclusão lógica (soft delete) — o registro permanece no banco para fins de rastreabilidade, mas fica oculto nas listagens. Somente administradores podem realizar esta operação.

---

**P: Posso editar um registro de custódia já feito?**  
R: Não. A cadeia de custódia é imutável por design. Se um registro incorreto foi feito, adicione uma nova movimentação com a correção e documente nas observações.

---

**P: O app mobile funciona sem internet?**  
R: Sim. Todas as fotografias e metadados são armazenados localmente no dispositivo. A sincronização com o servidor pode ser feita depois, quando houver conectividade.

---

**P: O que acontece se o celular descarregar durante a coleta?**  
R: Os dados já coletados são salvos automaticamente no banco de dados local do dispositivo (SQLite). Ao recarregar e abrir o app novamente, a sessão estará disponível para continuar.

---

**P: Como verifico se uma foto forense não foi adulterada?**  
R: Cada foto coletada pelo app mobile possui um hash SHA-256 registrado. Recalcule o hash do arquivo e compare com o registrado no sistema — se forem idênticos, a foto não foi alterada.

---

**P: Posso ter mais de um alvo em uma sessão de coleta no app?**  
R: Cada sessão é criada para um alvo específico. Para coletar dispositivos de alvos diferentes, inicie uma nova sessão para cada alvo.

---

**P: Posso gerar laudos sem usar um template?**  
R: Não. Os laudos são gerados a partir de templates configurados pelo administrador. Se precisar de um novo tipo de laudo, solicite ao admin a criação do template correspondente.

---

**P: Quantas operações posso ter simultaneamente?**  
R: Não há limite técnico. O sistema suporta múltiplas operações ativas simultaneamente.

---

**P: Como faço backup do sistema?**  
R: O backup é responsabilidade da infraestrutura. Os dados estão no PostgreSQL e os arquivos no MinIO. Consulte o administrador de sistemas para configurar backups periódicos dos volumes Docker.

---

**P: O auditor pode ver os dados das operações?**  
R: O auditor tem acesso apenas ao log de auditoria, não ao conteúdo das operações, dispositivos ou documentos. O log registra *o que foi feito*, não *o que está armazenado*.

---

*Fim do Manual do Usuário — Versão 1.3.0*

> Para suporte técnico, entre em contato com a administração do sistema.
