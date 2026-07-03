# Johnny Corporate Training LMS

Bem-vindo ao repositório oficial da **Johnny Corporate Training**, uma plataforma corporativa completa de Learning Management System (LMS) inspirada no Google Classroom, desenvolvida em **Django 5+**.

## 🚀 Tecnologias Utilizadas
- **Backend:** Python 3.13, Django 6.x
- **Banco de Dados:** PostgreSQL (via `dj-database-url`) / SQLite (desenvolvimento local)
- **Frontend:** HTML5, CSS3, Bootstrap 5, HTMX, Alpine.js
- **Servidor Web (Produção):** Gunicorn, WhiteNoise (para arquivos estáticos)
- **Inteligência Artificial:** Groq API (Assistente "Mister")

## 🏗️ Estrutura do Projeto
A plataforma é modular, seguindo as melhores práticas do Django:
- `accounts`: Gerenciamento de usuários e controle de acesso baseado em papéis (RBAC - Admin, Professor, Aluno).
- `courses`: Cursos, Módulos, Lições, Materiais de Apoio e Certificados.
- `classes`: Turmas (códigos de acesso únicos), Mural (Stream) e Calendário.
- `assignments`: Atividades, Submissões de Alunos e Notas.
- `core`: Dashboards, templates base e a página de destino (Landing Page), além do chat IA.

## 🛠️ Como rodar o projeto localmente

### 1. Requisitos
- Python 3.10 ou superior
- Git

### 2. Passos para Instalação
1. Clone o repositório:
   ```bash
   git clone https://github.com/devjohnnydev/plataforma222.git
   cd plataforma222
   ```

2. Crie um ambiente virtual e ative-o:
   ```bash
   python -m venv venv
   # No Windows:
   .\venv\Scripts\activate
   # No Linux/Mac:
   source venv/bin/activate
   ```

3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure as Variáveis de Ambiente:
   Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:
   ```ini
   GROQ_API_KEY=sua_chave_api_aqui
   ```

5. Execute as Migrações do Banco de Dados:
   ```bash
   python manage.py migrate
   ```

6. Crie um Superusuário (Administrador):
   ```bash
   python manage.py createsuperuser
   ```

7. Inicie o Servidor Local:
   ```bash
   python manage.py runserver
   ```
   Acesse a plataforma em `http://localhost:8000`. 
   **O login de administrador é feito na URL: `http://localhost:8000/admin/`**

## 🌐 Como configurar o Deploy no Railway
O projeto já está configurado para deploy automático no [Railway.app](https://railway.app).

1. Crie um projeto no Railway.
2. Adicione um **Banco de Dados PostgreSQL**.
3. Adicione o seu **Repositório GitHub** como um serviço Web.
4. Vá em **Variables** no serviço Web e adicione:
   - `DATABASE_URL` = `${{ Postgres.DATABASE_URL }}` (Para conectar ao banco do Railway).
   - `GROQ_API_KEY` = `gsk_suachave...` (Para ativar o chat IA Mister).
5. **Preservação de Imagens e Arquivos Enviados (Persistência de Mídia):**
   * Como os containers do Railway são efêmeros (reiniciam e apagam arquivos locais nas atualizações), você deve criar um **Volume** no Railway para salvar arquivos enviados permanentemente.
   * No painel do seu projeto no Railway, clique em **+ Add** -> **Volume**.
   * Conecte o Volume ao seu serviço Web e configure o ponto de montagem (Mount Path) como:
     `/app/media`
   * Dessa forma, todas as imagens de banners de turmas, fotos de perfil, avatares e arquivos anexos de lições ficarão salvos e nunca serão apagados nas atualizações do sistema.
6. O Railway usará o `Procfile` e o `requirements.txt` automaticamente para rodar as migrações e subir o projeto via `gunicorn`.

---

*Desenvolvido para Professor Johnny Braga Treinamentos*
