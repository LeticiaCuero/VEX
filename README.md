# VEX

Projeto VEX

VEX é uma aplicação web para a gestão de estacionamentos privados. O projeto automatiza entradas e saídas de veículos, tarifas por tipo de veículo e estadia, cálculo de cobrança, histórico e indicadores operacionais.

O sistema combina um frontend estático com uma API em Node.js/Express e dados persistidos no Supabase.

## Funcionalidades

- Cadastro e autenticação de empresas por Supabase Auth.
- Recuperação e redefinição de senha.
- Cadastro de tarifas por veículo e tipo de estadia.
- Registro de entrada e saída de veículos.
- Cálculo automático do valor da estadia.
- Consulta de veículos ativos e encerrados.
- Histórico de movimentações.
- Dashboard com faturamento, entradas, saídas e horários de maior movimento.
- Tema claro e escuro.
- Layout responsivo.

## Tecnologias

- **Frontend:** HTML, CSS e JavaScript puro.
- **Backend:** Node.js e Express.
- **Banco de dados e autenticação:** Supabase.
- **Hospedagem:** compatível com Vercel e execução local via Express.
- **Segurança:** Helmet, CORS e autenticação por token JWT do Supabase.

## Estrutura do projeto

```text
.
├── index.html                 # Página institucional inicial
├── server.js                  # Inicialização do servidor Express
├── vercel.json                # Configuração de deploy na Vercel
├── package.json               # Dependências e comandos npm
├── img/                       # Imagens e ícones da aplicação
├── style/                     # Folhas de estilo por página
├── script/                    # JavaScript do frontend
│   ├── api.js                 # Chamadas à API e gestão da sessão
│   ├── login.js               # Login e recuperação de senha
│   ├── home.js                # Cadastro e encerramento de veículos
│   ├── dashboard.js           # Indicadores e gráficos
│   ├── history.js             # Histórico de estadias
│   ├── config.js              # Configuração de tarifas
│   └── sidebar.js             # Navegação e controle de sessão
├── view/                      # Páginas internas da aplicação
│   ├── login.html
│   ├── home.html
│   ├── dashboard.html
│   ├── history.html
│   ├── config.html
│   └── reset-password.html
├── src/
│   ├── config/
│   │   └── supabase.js        # Clientes Supabase administrativo e público
│   ├── lib/
│   │   └── vex-schema.js      # Formatação, cobrança e carregamento de dados
│   ├── middleware/
│   │   └── auth.js            # Validação do token de acesso
│   └── routes/
│       ├── auth.routes.js     # Login, atualização de sessão e senha
│       ├── vehicles.routes.js # CRUD de entradas e saídas de veículos
│       ├── rates.routes.js    # Cadastro e manutenção de tarifas
│       └── dashboard.routes.js # Métricas e dados de desempenho
└── tools/
    └── check-encoding.js      # Verificação da codificação dos arquivos
```
