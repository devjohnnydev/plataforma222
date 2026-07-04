# Johnny Corporate Training LMS

Bem-vindo ao repositório oficial da **Johnny Corporate Training**, uma plataforma corporativa completa de Learning Management System (LMS) inspirada no Google Classroom, desenvolvida em **Django 5.x / 6.x** com foco em alta interatividade, design premium e inteligência artificial integrada.

A plataforma foi idealizada e desenvolvida inteiramente por **Johnny Braga** (SENAI) para atender de forma moderna e flexível a demandas de educação técnica e corporativa.

---

## 🚀 Tecnologias Utilizadas

O sistema adota uma arquitetura moderna e pragmática, otimizada para baixo carregamento de página e reatividade assíncrona:
* **Backend:** Python 3.13, Django (com suporte a fusos horários locais e controle transacional atômico).
* **Banco de Dados:** PostgreSQL (Produção - Railway) / SQLite (Desenvolvimento).
* **Frontend Reativo:** 
  * **Bootstrap 5:** Estrutura responsiva e componentes de estilo.
  * **HTMX:** Atualizações em tempo real e requisições assíncronas parciais (sem recarregar a tela).
  * **Alpine.js:** Manipulação leve de estado local (como modais de fotos e chats).
  * **Bootstrap Icons:** Biblioteca visual de ícones.
* **Inteligência Artificial:** Groq API (utilizando o modelo de chat para alimentar o assistente virtual **Mister AI**).
* **Produção:** Gunicorn, WhiteNoise (serviço otimizado de arquivos estáticos), Railway Cloud.

---

## 💎 Funcionalidades Principais (Recentes)

A plataforma conta com recursos interativos avançados desenvolvidos para otimizar o dia a dia de professores e alunos:

### 1. 📅 Controle de Frequência & Chamada Inteligente (Professores)
* **Visualização Diária e Estatísticas**: Uma aba exclusiva de chamada que exibe a contagem de faltas acumuladas, presenças acumuladas e porcentagem de frequência de cada aluno matriculado.
* **Interatividade via HTMX**: O professor pode marcar presença ou falta de qualquer aluno instantaneamente. O status é salvo em tempo real sem recarregar a página.
* **Observações Diárias**: Permite adicionar notas textuais individuais (ex.: "Atrasado 10m", "Saiu mais cedo"). O salvamento é automático ao desfocar o campo (blur).
* **Exportação**: Suporte para download em formato planilha Excel (`.csv`) da chamada da data selecionada, além de layout de impressão limpo otimizado para salvar relatórios em PDF.

### 2. 👥 Chamada Ativa & Check-in Pulsante (Alunos)
* **Notificação Dinâmica**: Quando o professor libera o check-in, um banner de alerta gradiente e chamativo surge pulsando no topo do painel do aluno e no seu perfil, solicitando o registro imediato de presença.

### 3. 👯‍♀️ Duplicação de Turmas (Professores)
* **Clonagem Completa**: Permite copiar a estrutura inteira de uma turma existente (aulas, módulos, títulos, conteúdos e materiais de apoio) para um novo curso.
* **Segurança de Rascunho**: Todas as aulas copiadas iniciam no estado de **Rascunho (Não publicada)** para que o professor possa editar prazos e conteúdos antes dos alunos verem.
* **Segurança Transacional**: Envolvido em transações de banco de dados (`transaction.atomic`) para garantir que falhas de rede no meio da cópia não gerem dados parciais corrompidos.

### 4. 🔑 Gerenciamento de Acesso e Senha
* **Reset de Senha**: Caso um aluno esqueça suas credenciais, o professor da turma pode redefinir a senha dele instantaneamente para a senha padrão corporativa `Braga123` a partir do painel de membros. O aluno pode alterá-la depois no perfil.

### 5. 🤖 Mister AI (Assistente de Conversação)
* **Respostas Inteligentes e Sem Limites**: O assistente virtual Mister agora é capaz de responder a dúvidas de **qualquer assunto** solicitado pelos alunos e professores (ciências, matemática, curiosidades gerais) de forma prestativa, além de orientar sobre o uso do sistema.

### 6. 📱 Responsividade e Barra Lateral Retrátil
* **Desktop**: Barra lateral retrátil que recolhe suavemente. Possui botão amarelo flutuante de controle que economiza espaço horizontal. O estado é persistido no `localStorage`.
* **Mobile**: Menu gaveta elegante com desfoque de fundo e ativador no topo, garantindo que o sistema funcione perfeitamente em qualquer dispositivo.

---

## 🛠️ Instalação e Execução Local

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/devjohnnydev/plataforma222.git
   cd plataforma222
   ```

2. **Configurar Ambiente Virtual (Virtualenv)**:
   ```bash
   python -m venv venv
   # No Windows:
   .\venv\Scripts\activate
   # No Linux/Mac:
   source venv/bin/activate
   ```

3. **Instalar Dependências**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz com as chaves necessárias (ex.: `GROQ_API_KEY`, `DEBUG=True`).

5. **Executar Migrações e Iniciar Servidor**:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```
   Acesse em `http://127.0.0.1:8000/`.
