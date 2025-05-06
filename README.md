# 📈 Coding Statistics

**Coding Statistics** é uma extensão para o Visual Studio Code que coleta e envia estatísticas da sua atividade de codificação para uma API personalizada. Ideal para desenvolvedores que desejam monitorar produtividade, tempo de uso do editor, criação de arquivos e mais.

## ⚙️ Funcionalidades

- 📄 Contagem de **linhas escritas**
- ⌨️ Contagem de **letras digitadas**
- 🗃️ Contador de **arquivos criados**
- ⏱️ Registro do **tempo total de uso** do editor
- ☁️ **Envio automático** das estatísticas ao fechar o VS Code
- 📧 Armazenamento do **e-mail do usuário** para vincular os dados

## 🔧 Configuração

Antes de usar a extensão, é necessário configurar a URL da API:

1. Abra as configurações do VS Code (`Ctrl + ,` ou `Cmd + ,`).
2. Pesquise por `codingstatistics.apiUrl`.
3. Insira a URL da sua API de estatísticas.

> ⚠️ Se a URL não estiver configurada corretamente, a extensão exibirá uma mensagem de erro e não será ativada.

## 🛠️ Opções de Configuração

Esta extensão oferece a seguinte opção:

- `codingstatistics.apiUrl`: Define a URL da API que receberá os dados.

## 🐞 Problemas Conhecidos

- A extensão **não funcionará sem uma URL válida** configurada.
- A captura do e-mail pode falhar se não estiver configurado no Git (`user.email`).

## 📦 Notas de Versão

### 0.0.1

- Lançamento inicial com suporte a:
  - Registro de linhas e letras
  - Contador de arquivos
  - Tempo total de codificação
  - Envio automático para a API

### 0.0.2 e 0.0.3

- Ajustes na forma como **letras e linhas** são contabilizadas

### 1.0.0 e 1.0.1

- Exibição das estatísticas na **barra de status** do VS Code
- Alterações no comportamento do contador de **arquivos criados**

