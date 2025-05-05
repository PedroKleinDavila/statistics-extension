# Coding Statistics

**Coding Statistics** é uma extensão para o Visual Studio Code que coleta estatísticas da sua atividade de codificação e as envia para uma API personalizada. Ideal para desenvolvedores que desejam acompanhar métricas como produtividade, tempo de uso e criação de arquivos.

## 📊 Funcionalidades

- Contagem de **linhas escritas**.
- Contagem de **letras digitadas**.
- Contador de **arquivos criados**.
- Registro do **tempo total de uso** do editor.
- Envio automático das estatísticas ao fechar o VS Code.
- Armazena o **e-mail do usuário** para vincular as estatísticas.

## ⚙️ Requisitos

Antes de usar a extensão, é necessário configurar a URL da API nas configurações do VS Code:

1. Acesse as configurações (`Ctrl+,` ou `Cmd+,`).
2. Busque por `codingstatistics.apiUrl`.
3. Insira a URL da sua API de estatísticas.

Caso a URL não esteja configurada corretamente, a extensão exibirá uma mensagem de erro e não será ativada.

## 🔧 Configurações da Extensão

Esta extensão contribui com as seguintes configurações:

- `codingstatistics.apiUrl`: Define a URL da API que receberá os dados de estatísticas.

## 🐞 Problemas Conhecidos

- A extensão não funcionará sem uma URL válida configurada para a API.
- Em alguns casos, a captura do e-mail do usuário pode falhar se não estiver configurado no Git.

## 📦 Notas de Versão

### 1.0.0

- Lançamento inicial com suporte a:
  - Registro de linhas e letras escritas
  - Arquivos criados
  - Tempo total de codificação
  - Envio das estatísticas para uma API configurada

## 📚 Recursos Úteis

- [Guia de Extensões do VS Code](https://code.visualstudio.com/api/references/extension-guidelines)
- [Suporte a Markdown no VS Code](https://code.visualstudio.com/docs/languages/markdown)
- [Referência de Sintaxe Markdown](https://help.github.com/articles/markdown-basics/)

---

**Divirta-se rastreando suas estatísticas com Coding Statistics!**
