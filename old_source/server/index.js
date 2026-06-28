import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'senai-secret-key-2024';

// Helper for unique class code
const generateUniqueCode = async () => {
    let code;
    let exists = true;
    while (exists) {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const check = await prisma.turma.findUnique({ where: { codigo: code } });
        if (!check) exists = false;
    }
    return code;
};

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Serve public directory statically
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, '../dist')));

// --- MIDDLEWARES ---

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Token inválido ou expirado' });
    }
};

const authorize = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Acesso negado: permissão insuficiente' });
    }
    next();
};

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// --- INITIALIZATION ---

async function initAdmin() {
    const adminEmail = 'johnny.oliveira@sp.senai.br';
    const existing = await prisma.administrador.findUnique({ where: { email: adminEmail } });
    if (!existing) {
        const hashedPass = await bcrypt.hash('46431194', 10);
        await prisma.administrador.create({
            data: {
                nome: 'Johnny Oliveira',
                email: adminEmail,
                senha_hash: hashedPass
            }
        });
        console.log('Super Admin created!');
    }
}

async function normalizeDatabaseEmails() {
    try {
        console.log('Iniciando normalização de e-mails no banco de dados...');
        
        // 1. Admins
        const admins = await prisma.administrador.findMany();
        for (const admin of admins) {
            const normalized = admin.email.trim().toLowerCase();
            if (admin.email !== normalized) {
                try {
                    await prisma.administrador.update({
                        where: { id: admin.id },
                        data: { email: normalized }
                    });
                    console.log(`Email do admin ${admin.nome} normalizado para ${normalized}`);
                } catch (e) {
                    console.error(`Falha ao normalizar email do admin ${admin.id}:`, e.message);
                }
            }
        }

        // 2. Professors
        const professors = await prisma.professor.findMany();
        for (const prof of professors) {
            const normalized = prof.email.trim().toLowerCase();
            if (prof.email !== normalized) {
                try {
                    await prisma.professor.update({
                        where: { id: prof.id },
                        data: { email: normalized }
                    });
                    console.log(`Email do professor ${prof.nome} normalizado para ${normalized}`);
                } catch (e) {
                    console.error(`Falha ao normalizar email do professor ${prof.id}:`, e.message);
                }
            }
        }

        // 3. Alunos
        const alunos = await prisma.aluno.findMany();
        for (const aluno of alunos) {
            if (aluno.email) {
                const normalized = aluno.email.trim().toLowerCase();
                if (aluno.email !== normalized) {
                    try {
                        await prisma.aluno.update({
                            where: { id: aluno.id },
                            data: { email: normalized }
                        });
                        console.log(`Email do aluno ${aluno.nome} normalizado para ${normalized}`);
                    } catch (e) {
                        console.error(`Falha ao normalizar email do aluno ${aluno.id}:`, e.message);
                    }
                }
            }
        }
        console.log('Normalização de e-mails concluída!');
    } catch (err) {
        console.error('Erro ao normalizar banco de dados:', err);
    }
}

async function autoMigrate() {
    try {
        console.log('[Migration] Verificando colunas novas na tabela Turma...');
        // Adiciona colunas de encerramento se ainda não existirem (idempotente)
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "Turma"
            ADD COLUMN IF NOT EXISTS "data_encerramento" TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "ranking_encerrado" BOOLEAN NOT NULL DEFAULT FALSE;
        `);
        console.log('[Migration] Colunas de encerramento OK.');
    } catch (e) {
        // Alguns engines PostgreSQL não suportam múltiplos ADD COLUMN em um único ALTER — tenta um por vez
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Turma" ADD COLUMN IF NOT EXISTS "data_encerramento" TIMESTAMP;`);
        } catch (_) {}
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Turma" ADD COLUMN IF NOT EXISTS "ranking_encerrado" BOOLEAN NOT NULL DEFAULT FALSE;`);
        } catch (_) {}
        console.log('[Migration] Colunas de encerramento verificadas (fallback individual).');
    }
}

initAdmin()
    .then(() => normalizeDatabaseEmails())
    .then(() => autoMigrate())
    .catch(console.error);

app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    
    // Converte o arquivo para Base64 para persistência no banco de dados sem depender do file system local
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64String = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
    
    // Remove o arquivo local após a conversão
    fs.unlinkSync(req.file.path);

    res.json({ url: base64String });
});

// --- AUTH ROUTES ---

app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
        return res.status(400).json({ error: 'E-mail é obrigatório' });
    }

    // 1. Admin Login
    const admin = await prisma.administrador.findFirst({
        where: {
            email: {
                equals: normalizedEmail,
                mode: 'insensitive'
            }
        }
    });
    if (admin && await bcrypt.compare(password, admin.senha_hash)) {
        const token = jwt.sign({ id: admin.id, role: 'ADMIN', name: admin.nome }, JWT_SECRET);
        return res.json({ token, user: { ...admin, role: 'ADMIN' } });
    }

    // 2. Professor Login
    const professor = await prisma.professor.findFirst({
        where: {
            email: {
                equals: normalizedEmail,
                mode: 'insensitive'
            }
        }
    });
    if (professor && await bcrypt.compare(password, professor.senha_hash)) {
        const token = jwt.sign({ id: professor.id, role: 'PROFESSOR', name: professor.nome }, JWT_SECRET);
        return res.json({ token, user: { ...professor, role: 'PROFESSOR' } });
    }

    // 3. Aluno Login
    const student = await prisma.aluno.findFirst({
        where: {
            email: {
                equals: normalizedEmail,
                mode: 'insensitive'
            }
        },
        include: { turma: true, professor: true }
    });
    if (student && student.senha_hash && await bcrypt.compare(password, student.senha_hash)) {
        const token = jwt.sign({ id: student.id, role: 'ALUNO', name: student.nome }, JWT_SECRET);
        return res.json({ token, user: { ...student, role: 'ALUNO' } });
    }

    res.status(401).json({ error: 'E-mail ou senha incorretos' });
}));

app.get('/api/auth/me', authenticate, asyncHandler(async (req, res) => {
    if (req.user.role === 'ADMIN') {
        const admin = await prisma.administrador.findUnique({ where: { id: req.user.id } });
        if (!admin) return res.status(404).json({ error: 'Usuário não encontrado' });
        return res.json({ ...admin, role: 'ADMIN' });
    }
    if (req.user.role === 'PROFESSOR') {
        const professor = await prisma.professor.findUnique({ where: { id: req.user.id } });
        if (!professor) return res.status(404).json({ error: 'Usuário não encontrado' });
        return res.json({ ...professor, role: 'PROFESSOR' });
    }
    if (req.user.role === 'ALUNO') {
        const student = await prisma.aluno.findUnique({
            where: { id: req.user.id },
            include: { turma: true, professor: true }
        });
        if (!student) return res.status(404).json({ error: 'Usuário não encontrado' });
        return res.json({ ...student, role: 'ALUNO' });
    }
    res.status(400).json({ error: 'Role inválido' });
}));

// --- ADMIN ROUTES ---

app.get('/api/admin/professores', authenticate, authorize(['ADMIN']), asyncHandler(async (req, res) => {
    const professores = await prisma.professor.findMany();
    res.json(professores);
}));

app.post('/api/admin/professores', authenticate, authorize(['ADMIN']), asyncHandler(async (req, res) => {
    const { nome, email, senha } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
        return res.status(400).json({ error: "E-mail é obrigatório" });
    }

    const existing = await prisma.professor.findFirst({
        where: {
            email: {
                equals: normalizedEmail,
                mode: 'insensitive'
            }
        }
    });
    if (existing) return res.status(400).json({ error: "E-mail já cadastrado" });

    const defaultPassword = senha || 'senaisaopaulo';
    const hashedPass = await bcrypt.hash(defaultPassword, 10);
    const codigo = await generateUniqueCode();

    const professor = await prisma.professor.create({
        data: {
            nome: nome?.trim(),
            email: normalizedEmail,
            senha_hash: hashedPass,
            codigo_turma: codigo, // Mantido apenas para compatibilidade legada se necessário
            primeiro_acesso: true
        }
    });

    // Criar a turma inicial
    await prisma.turma.create({
        data: {
            nome: `Turma Inicial - ${nome}`,
            codigo: codigo,
            professorId: professor.id,
            materia: 'Boas-vindas'
        }
    });

    res.json(professor);
}));

app.post('/api/admin/professores/:id/reset-senha', authenticate, authorize(['ADMIN']), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hashedPass = await bcrypt.hash('senaisaopaulo', 10);
    await prisma.professor.update({
        where: { id: parseInt(id) },
        data: { senha_hash: hashedPass, primeiro_acesso: true }
    });
    res.json({ message: "Senha resetada para padrão (senaisaopaulo) com sucesso" });
}));

app.post('/api/admin/alunos/:id/reset-senha', authenticate, authorize(['ADMIN', 'PROFESSOR']), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hashedPass = await bcrypt.hash('senai123', 10);
    await prisma.aluno.update({
        where: { id: parseInt(id) },
        data: { senha_hash: hashedPass }
    });
    res.json({ message: "Senha resetada para 'senai123'" });
}));

app.delete('/api/admin/professores/:id', authenticate, authorize(['ADMIN']), asyncHandler(async (req, res) => {
    const { id } = req.params;
    // O Cascade Delete no Prisma cuidará das Turmas, Alunos, Atividades, etc.
    await prisma.professor.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Professor e todos os dados vinculados excluídos com sucesso" });
}));

// --- PROFESSOR ROUTES ---

app.patch('/api/professor/change-password', authenticate, authorize(['PROFESSOR']), asyncHandler(async (req, res) => {
    const { password } = req.body;
    const hashedPass = await bcrypt.hash(password, 10);
    await prisma.professor.update({
        where: { id: req.user.id },
        data: { senha_hash: hashedPass, primeiro_acesso: false }
    });
    res.json({ message: "Senha alterada com sucesso" });
}));

app.patch('/api/professor/perfil', authenticate, authorize(['PROFESSOR']), asyncHandler(async (req, res) => {
    const { foto_url, bio, mensagem_incentivo } = req.body;
    const updated = await prisma.professor.update({
        where: { id: req.user.id },
        data: { foto_url, bio, mensagem_incentivo }
    });
    res.json(updated);
}));

app.post('/api/turmas', authenticate, authorize(['PROFESSOR']), asyncHandler(async (req, res) => {
    const { nome, materia, observacao } = req.body;
    const codigo = await generateUniqueCode();

    const turma = await prisma.turma.create({
        data: {
            nome,
            materia,
            observacao,
            codigo,
            professorId: req.user.id
        }
    });
    res.json(turma);
}));

app.get('/api/turmas', authenticate, authorize(['ADMIN', 'PROFESSOR']), asyncHandler(async (req, res) => {
    if (req.user.role === 'ADMIN') {
        return res.json(await prisma.turma.findMany({ include: { professor: true } }));
    }
    const turmas = await prisma.turma.findMany({
        where: { professorId: req.user.id }
    });
    res.json(turmas);
}));

app.delete('/api/turmas/:id', authenticate, authorize(['ADMIN', 'PROFESSOR']), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const turmaId = parseInt(id);

    const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
    if (!turma) return res.status(404).json({ error: "Turma não encontrada" });

    if (req.user.role === 'PROFESSOR' && turma.professorId !== req.user.id) {
        return res.status(403).json({ error: "Você não tem permissão para excluir esta turma" });
    }

    await prisma.turma.delete({ where: { id: turmaId } });
    res.json({ message: "Turma e todos os alunos vinculados excluídos com sucesso" });
}));

app.get('/api/alunos', authenticate, authorize(['ADMIN', 'PROFESSOR']), asyncHandler(async (req, res) => {
    const { turmaId } = req.query;
    const where = {};
    if (req.user.role === 'PROFESSOR') {
        where.professorId = req.user.id;
    }
    if (turmaId) {
        where.turmaId = parseInt(turmaId);
    }

    const alunos = await prisma.aluno.findMany({
        where,
        include: {
            turma: true,
            notas_missoes: true
        }
    });
    res.json(alunos);
}));

app.delete('/api/alunos/:id', authenticate, authorize(['ADMIN', 'PROFESSOR']), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const alunoId = parseInt(id);

    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno) return res.status(404).json({ error: "Aluno não encontrado" });

    if (req.user.role === 'PROFESSOR' && aluno.professorId !== req.user.id) {
        return res.status(403).json({ error: "Você não tem permissão para excluir este aluno" });
    }

    await prisma.aluno.delete({ where: { id: alunoId } });
    res.json({ message: "Aluno removido com sucesso" });
}));

// Aluno registration
app.post('/api/auth/register-aluno', asyncHandler(async (req, res) => {
    const { nome, email, password, codigo } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedCode = codigo?.trim().toUpperCase();

    if (!normalizedEmail) {
        return res.status(400).json({ error: "E-mail é obrigatório" });
    }

    const existing = await prisma.aluno.findFirst({
        where: {
            email: {
                equals: normalizedEmail,
                mode: 'insensitive'
            }
        }
    });
    if (existing) return res.status(400).json({ error: "E-mail já cadastrado" });

    const turma = await prisma.turma.findUnique({ where: { codigo: normalizedCode } });
    if (!turma) return res.status(404).json({ error: "Código de turma inválido" });

    const hashedPass = await bcrypt.hash(password, 10);

    const aluno = await prisma.aluno.create({
        data: {
            nome,
            email: normalizedEmail,
            senha_hash: hashedPass,
            professorId: turma.professorId,
            turmaId: turma.id
        },
        include: {
            turma: true,
            professor: true
        }
    });

    const token = jwt.sign({ id: aluno.id, role: 'ALUNO', name: aluno.nome }, JWT_SECRET);
    res.json({ token, user: { ...aluno, role: 'ALUNO' } });
}));

app.post('/api/alunos/entrar-turma', authenticate, authorize(['ALUNO']), asyncHandler(async (req, res) => {
    const { codigo } = req.body;
    const normalizedCode = codigo?.trim().toUpperCase();

    const turma = await prisma.turma.findUnique({
        where: { codigo: normalizedCode },
        include: { professor: true }
    });

    if (!turma) return res.status(404).json({ error: "Código de turma inválido" });

    const updatedAluno = await prisma.aluno.update({
        where: { id: req.user.id },
        data: {
            turmaId: turma.id,
            professorId: turma.professorId
        },
        include: {
            turma: true,
            professor: true
        }
    });

    res.json(updatedAluno);
}));

app.patch('/api/aluno/change-password', authenticate, authorize(['ALUNO']), asyncHandler(async (req, res) => {
    const { password } = req.body;
    const hashedPass = await bcrypt.hash(password, 10);
    await prisma.aluno.update({
        where: { id: req.user.id },
        data: { senha_hash: hashedPass }
    });
    res.json({ message: "Senha atualizada" });
}));

// --- GAME LOGIC (Missions, Activities, Grades) ---

app.post('/api/atividades', authenticate, authorize(['PROFESSOR']), asyncHandler(async (req, res) => {
    const { titulo, descricao, nota_maxima, turmaId } = req.body;

    // Verify ownership
    const turma = await prisma.turma.findFirst({ where: { id: parseInt(turmaId), professorId: req.user.id } });
    if (!turma) return res.status(403).json({ error: "Você não tem permissão para esta turma" });

    const atividade = await prisma.atividade.create({
        data: {
            titulo,
            descricao,
            nota_maxima: parseFloat(nota_maxima) || 10,
            turmaId: parseInt(turmaId)
        }
    });
    res.json(atividade);
}));

app.get('/api/atividades', authenticate, asyncHandler(async (req, res) => {
    const { turmaId } = req.query;
    const where = {};

    if (req.user.role === 'PROFESSOR') {
        where.turma = { professorId: req.user.id };
    } else if (req.user.role === 'ALUNO') {
        const student = await prisma.aluno.findUnique({ where: { id: req.user.id } });
        where.turmaId = student.turmaId;
    }

    if (turmaId) where.turmaId = parseInt(turmaId);

    const atividades = await prisma.atividade.findMany({
        where,
        include: { notas: true }
    });
    res.json(atividades);
}));

app.get('/api/minhas-notas', authenticate, authorize(['ALUNO']), asyncHandler(async (req, res) => {
    const notas = await prisma.nota.findMany({
        where: { alunoId: req.user.id },
        include: { atividade: true }
    });
    
    // Ocultar notas avaliadas hoje se ainda não passou das 17:30 (Pregão)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isAfterPregão = currentHour > 17 || (currentHour === 17 && currentMinute >= 30);
    
    const visibleNotas = notas.filter(n => {
        if (!n.data_avaliacao) return true;
        const evalDate = new Date(n.data_avaliacao);
        if (evalDate.toDateString() === now.toDateString() && !isAfterPregão) {
            return false;
        }
        return true;
    });
    
    res.json(visibleNotas);
}));

app.get('/api/mensagens', authenticate, asyncHandler(async (req, res) => {
    const where = {};
    if (req.user.role === 'ALUNO') {
        const student = await prisma.aluno.findUnique({ where: { id: req.user.id } });

        // CORREÇÃO: Aluno só vê mensagens direcionadas especificamente para ele,
        // mensagens para SUA turma, ou decretos supremos globais
        where.OR = [
            // 1. Mensagens individuais para este aluno
            { alunoId: req.user.id },
            // 2. Mensagens para a turma deste aluno (SEM alunoId específico)
            { turmaId: student.turmaId, alunoId: null },
            // 3. Decretos supremos globais (sem aluno nem turma específicos)
            { tipo: 'decreto_supremo', alunoId: null, turmaId: null }
        ];
    } else if (req.user.role === 'PROFESSOR') {
        where.professorId = req.user.id;
    } else if (req.user.role === 'ADMIN') {
        where.adminId = req.user.id;
    }

    const mensagens = await prisma.mensagem.findMany({
        where,
        orderBy: { data_criacao: 'desc' },
        include: {
            professor: { select: { nome: true } },
            administrador: { select: { nome: true } },
            aluno: { select: { nome: true } },
            turma: { select: { nome: true } }
        }
    });
    res.json(mensagens);
}));

app.post('/api/mensagens', authenticate, authorize(['PROFESSOR', 'ADMIN']), asyncHandler(async (req, res) => {
    const { conteudo, alunoId, turmaId, tipo } = req.body;

    // DECRETO SUPREMO - Apenas ADMIN
    if (tipo === 'decreto_supremo') {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: "Apenas administradores podem enviar decretos supremos" });
        }

        const mensagem = await prisma.mensagem.create({
            data: {
                conteudo,
                tipo: 'decreto_supremo',
                adminId: req.user.id,
                // Sem alunoId/turmaId = mensagem global
                alunoId: alunoId ? parseInt(alunoId) : null,
                turmaId: turmaId ? parseInt(turmaId) : null
            }
        });
        return res.json(mensagem);
    }

    // MENSAGEM NORMAL - PROFESSOR
    if (req.user.role === 'PROFESSOR') {
        // Validar alunoId - só pode enviar para alunos de suas turmas
        if (alunoId) {
            const aluno = await prisma.aluno.findUnique({
                where: { id: parseInt(alunoId) }
            });
            if (!aluno || aluno.professorId !== req.user.id) {
                return res.status(403).json({
                    error: "Você só pode enviar mensagens para alunos de suas turmas"
                });
            }
        }

        // Validar turmaId - só pode enviar para suas turmas
        if (turmaId) {
            const turma = await prisma.turma.findUnique({
                where: { id: parseInt(turmaId) }
            });
            if (!turma || turma.professorId !== req.user.id) {
                return res.status(403).json({
                    error: "Você só pode enviar mensagens para suas turmas"
                });
            }
        }
    }

    // ADMIN pode enviar para qualquer aluno/turma (sem validação)

    const mensagem = await prisma.mensagem.create({
        data: {
            conteudo,
            tipo: tipo || 'normal',
            professorId: req.user.role === 'PROFESSOR' ? req.user.id : null,
            adminId: req.user.role === 'ADMIN' ? req.user.id : null,
            alunoId: alunoId ? parseInt(alunoId) : null,
            turmaId: turmaId ? parseInt(turmaId) : null
        }
    });
    res.json(mensagem);
}));

// Marcar mensagem como lida
app.patch('/api/mensagens/:id/lida', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verificar se a mensagem existe e pertence ao aluno
    const mensagem = await prisma.mensagem.findUnique({ where: { id: parseInt(id) } });
    if (!mensagem) {
        return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    // Marcar como lida
    const mensagemAtualizada = await prisma.mensagem.update({
        where: { id: parseInt(id) },
        data: { lida: true }
    });

    res.json(mensagemAtualizada);
}));


app.post('/api/notas', authenticate, authorize(['PROFESSOR']), asyncHandler(async (req, res) => {
    const { alunoId, atividadeId, valor } = req.body;

    // Get info about the student and class to update ranks
    const studentInfo = await prisma.aluno.findUnique({ where: { id: parseInt(alunoId) } });
    if (!studentInfo) return res.status(404).json({ error: "Aluno não encontrado" });

    // 1. Snapshot current ranking for the whole class before the change
    const classAlunos = await prisma.aluno.findMany({
        where: { turmaId: studentInfo.turmaId },
        include: {
            notas: true,
            notas_missoes: true // Incluir notas de missões
        }
    });

    const currentRanking = classAlunos.map(a => {
        const xpAtividades = a.notas.reduce((acc, n) => acc + (n.valor * 10), 0);
        const xpMissoes = a.notas_missoes.reduce((acc, n) => acc + (n.valor * 3), 0);
        const totalXP = xpAtividades + xpMissoes + (a.pontos_portal || 0);
        return { id: a.id, xp: totalXP };
    }).sort((a, b) => b.xp - a.xp);

    // Save current positions as posicao_anterior
    for (let i = 0; i < currentRanking.length; i++) {
        await prisma.aluno.update({
            where: { id: currentRanking[i].id },
            data: { posicao_anterior: i + 1 }
        });
    }

    // 2. Now update/create the grade
    const atividade = await prisma.atividade.findUnique({ where: { id: parseInt(atividadeId) } });

    const grade = await prisma.nota.upsert({
        where: { alunoId_atividadeId: { alunoId: parseInt(alunoId), atividadeId: parseInt(atividadeId) } },
        update: { valor: parseFloat(valor) },
        create: {
            alunoId: parseInt(alunoId),
            atividadeId: parseInt(atividadeId),
            valor: parseFloat(valor)
        }
    });

    // Create automatic notification (Mensagem)
    await prisma.mensagem.create({
        data: {
            conteudo: `Sua atividade "${atividade.titulo}" foi avaliada! Nota: ${valor}/${atividade.nota_maxima}. (+${parseFloat(valor) * 10} XP)`,
            professorId: req.user.id,
            alunoId: parseInt(alunoId)
        }
    });

    res.json(grade);
}));

// Aluno envia reação emoji para uma atividade
app.patch('/api/notas/reacao', authenticate, authorize(['ALUNO']), asyncHandler(async (req, res) => {
    const { atividadeId, reacao_emoji } = req.body;

    const nota = await prisma.nota.findUnique({
        where: { alunoId_atividadeId: { alunoId: req.user.id, atividadeId: parseInt(atividadeId) } }
    });

    if (!nota) return res.status(404).json({ error: 'Você ainda não tem nota nesta atividade' });

    const updated = await prisma.nota.update({
        where: { id: nota.id },
        data: { reacao_emoji }
    });

    res.json(updated);
}));

// --- MISSIONS ROUTES ---

app.post('/api/missoes', authenticate, authorize(['PROFESSOR']), asyncHandler(async (req, res) => {
    const { titulo, descricao, recompensa, prazo, turmaId } = req.body;

    // Verify ownership of the class
    const turma = await prisma.turma.findFirst({
        where: { id: parseInt(turmaId), professorId: req.user.id }
    });
    if (!turma) return res.status(403).json({ error: "Você não tem permissão para esta turma" });

    // Robust date parsing to guarantee a valid Date object or null
    let parsedPrazo = null;
    if (prazo && typeof prazo === 'string' && prazo.trim() !== '') {
        const d = new Date(prazo);
        if (!isNaN(d.getTime())) {
            parsedPrazo = d;
        } else {
            console.warn(`[API] Aviso: Data de prazo inválida fornecida: "${prazo}". Tratando como nula.`);
        }
    }

    try {
        const missao = await prisma.missao.create({
            data: {
                titulo,
                descricao,
                recompensa: parseInt(recompensa) || 0,
                prazo: parsedPrazo,
                turmaId: parseInt(turmaId),
                professorId: req.user.id
            }
        });
        res.json(missao);
    } catch (dbError) {
        console.error("[API] Erro detalhado no prisma.missao.create:", dbError);
        return res.status(400).json({
            error: `Erro no banco de dados (${dbError.code || 'sem código'}): ${dbError.message}`
        });
    }
}));

app.post('/api/missoes/:id/avaliar', authenticate, authorize(['PROFESSOR']), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { alunoId, valor } = req.body;
    const missaoId = parseInt(id);

    // Verify ownership
    const missao = await prisma.missao.findUnique({
        where: { id: missaoId },
        include: { turma: true }
    });

    if (!missao) return res.status(404).json({ error: "Missão não encontrada" });
    if (missao.professorId !== req.user.id && missao.turma.professorId !== req.user.id) {
        return res.status(403).json({ error: "Você não tem permissão para avaliar esta missão" });
    }

    // 1. Snapshot current ranking
    const classAlunos = await prisma.aluno.findMany({
        where: { turmaId: missao.turmaId },
        include: {
            notas: true,
            notas_missoes: true
        }
    });

    const currentRanking = classAlunos.map(a => {
        const xpAtividades = a.notas.reduce((acc, n) => acc + (n.valor * 10), 0);
        const xpMissoes = a.notas_missoes.reduce((acc, n) => acc + (n.valor * 3), 0);
        const totalXP = xpAtividades + xpMissoes + (a.pontos_portal || 0);
        return { id: a.id, xp: totalXP };
    }).sort((a, b) => b.xp - a.xp);

    // Save current positions
    for (let i = 0; i < currentRanking.length; i++) {
        await prisma.aluno.update({
            where: { id: currentRanking[i].id },
            data: { posicao_anterior: i + 1 }
        });
    }

    // 2. Create/Update NotaMissao
    const notaMissao = await prisma.notaMissao.upsert({
        where: {
            alunoId_missaoId: {
                alunoId: parseInt(alunoId),
                missaoId: missaoId
            }
        },
        update: { valor: parseFloat(valor) },
        create: {
            alunoId: parseInt(alunoId),
            missaoId: missaoId,
            valor: parseFloat(valor)
        }
    });

    // 3. Create Notification
    const xpGanho = parseFloat(valor) * 3;
    await prisma.mensagem.create({
        data: {
            conteudo: `Sua missão "${missao.titulo}" foi avaliada! Nota: ${valor}. (+${xpGanho} XP)`,
            professorId: req.user.id,
            alunoId: parseInt(alunoId),
            turmaId: missao.turmaId // Opcional, mas ajuda no contexto
        }
    });

    res.json(notaMissao);
}));

app.get('/api/missoes', authenticate, asyncHandler(async (req, res) => {
    const { turmaId } = req.query;
    const where = {};

    if (req.user.role === 'PROFESSOR') {
        where.turma = { professorId: req.user.id };
    } else if (req.user.role === 'ALUNO') {
        const student = await prisma.aluno.findUnique({ where: { id: req.user.id } });
        if (student?.turmaId) where.turmaId = student.turmaId;
    }

    if (turmaId) where.turmaId = parseInt(turmaId);

    const include = {
        professor: { select: { nome: true } },
        turma: { select: { nome: true } }
    };

    if (req.user.role === 'ALUNO') {
        include.notas = {
            where: { alunoId: req.user.id }
        };
    }

    const missoes = await prisma.missao.findMany({
        where,
        include,
        orderBy: { data_criacao: 'desc' }
    });

    // Ocultar notas de missões avaliadas hoje para alunos antes de 17:30
    if (req.user.role === 'ALUNO') {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const isAfterPregão = currentHour > 17 || (currentHour === 17 && currentMinute >= 30);
        
        missoes.forEach(m => {
            if (m.notas) {
                m.notas = m.notas.filter(n => {
                    if (!n.data_avaliacao) return true;
                    const evalDate = new Date(n.data_avaliacao);
                    if (evalDate.toDateString() === now.toDateString() && !isAfterPregão) {
                        return false;
                    }
                    return true;
                });
            }
        });
    }

    res.json(missoes);
}));

app.delete('/api/missoes/:id', authenticate, authorize(['PROFESSOR']), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const missaoId = parseInt(id);

    const missao = await prisma.missao.findUnique({
        where: { id: missaoId },
        include: { turma: true }
    });

    if (!missao) return res.status(404).json({ error: "Missão não encontrada" });

    // Check if user is the creator OR the owner of the class
    const canDelete = missao.professorId === req.user.id ||
        missao.turma.professorId === req.user.id;

    if (!canDelete) {
        return res.status(403).json({ error: "Você não tem permissão para excluir esta missão" });
    }

    await prisma.missao.delete({ where: { id: missaoId } });
    res.json({ message: "Missão excluída com sucesso" });
}));


app.get('/api/ranking', asyncHandler(async (req, res) => {
    const { turmaId } = req.query;

    const where = {};
    if (turmaId) where.turmaId = parseInt(turmaId);

    const alunos = await prisma.aluno.findMany({
        where,
        include: {
            notas: true,
            notas_missoes: true, // Incluir notas de missões
            professor: { select: { nome: true } },
            turma: { select: { nome: true } }
        }
    });

    // Determinar se a requisição veio de um aluno
    let isStudentView = true;
    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.role === 'PROFESSOR' || decoded.role === 'ADMIN') {
                isStudentView = false;
            }
        } catch (e) {}
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isAfterPregão = currentHour > 17 || (currentHour === 17 && currentMinute >= 30);

    const ranking = alunos.map(a => {
        // Filtrar notas de atividades se for visão de Aluno e antes das 17:30
        const visibleNotas = a.notas.filter(n => {
            if (!isStudentView) return true;
            if (!n.data_avaliacao) return true;
            const evalDate = new Date(n.data_avaliacao);
            if (evalDate.toDateString() === now.toDateString() && !isAfterPregão) {
                return false;
            }
            return true;
        });

        // Filtrar notas de missões
        const visibleNotasMissoes = a.notas_missoes.filter(n => {
            if (!isStudentView) return true;
            if (!n.data_avaliacao) return true;
            const evalDate = new Date(n.data_avaliacao);
            if (evalDate.toDateString() === now.toDateString() && !isAfterPregão) {
                return false;
            }
            return true;
        });

        const xpAtividades = visibleNotas.reduce((acc, n) => acc + (n.valor * 10), 0);
        const xpMissoes = visibleNotasMissoes.reduce((acc, n) => acc + (n.valor * 3), 0);
        const totalXP = xpAtividades + xpMissoes + (a.pontos_portal || 0);

        return {
            id: a.id,
            nome: a.nome,
            foto_url: a.foto_url,
            info: a.info,
            xp: totalXP,
            level: Math.floor(Math.sqrt(totalXP / 100)) + 1,
            professorNome: a.professor?.nome || 'Nenhum',
            turmaNome: a.turma?.nome || 'Nenhuma',
            professorId: a.professorId,
            turmaId: a.turmaId,
            posicao_anterior: a.posicao_anterior,
            estado_humor: a.estado_humor
        };
    }).sort((a, b) => b.xp - a.xp);

    res.json(ranking);
}));

app.patch('/api/aluno/perfil', authenticate, authorize(['ALUNO']), asyncHandler(async (req, res) => {
    const { foto_url, info, nome, estado_humor } = req.body;
    const updated = await prisma.aluno.update({
        where: { id: req.user.id },
        data: { foto_url, info, nome, estado_humor }
    });
    res.json(updated);
}));

// GET /api/aluno/status-desafio
app.get('/api/aluno/status-desafio', authenticate, authorize(['ALUNO']), asyncHandler(async (req, res) => {
    const student = await prisma.aluno.findUnique({
        where: { id: req.user.id }
    });
    if (!student) return res.status(404).json({ error: "Aluno não encontrado" });

    const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const lastStr = student.data_ultimo_desafio ? new Date(student.data_ultimo_desafio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;
    const completado = todayStr === lastStr;

    res.json({
        completado,
        pontos_portal: student.pontos_portal
    });
}));

// POST /api/aluno/completar-desafio
app.post('/api/aluno/completar-desafio', authenticate, authorize(['ALUNO']), asyncHandler(async (req, res) => {
    const { score } = req.body;
    const points = Math.min(5, Math.max(0, parseInt(score) || 0));

    const student = await prisma.aluno.findUnique({
        where: { id: req.user.id }
    });
    if (!student) return res.status(404).json({ error: "Aluno não encontrado" });

    const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const lastStr = student.data_ultimo_desafio ? new Date(student.data_ultimo_desafio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;
    if (todayStr === lastStr) {
        return res.status(400).json({ error: "Você já realizou sua tentativa diária de hoje!" });
    }

    const updatedStudent = await prisma.aluno.update({
        where: { id: req.user.id },
        data: {
            data_ultimo_desafio: new Date(),
            pontos_portal: student.pontos_portal + points
        }
    });

    // Create automatic notification message to student
    await prisma.mensagem.create({
        data: {
            conteudo: `Parabéns! Você concluiu o portal diário e conquistou +${points} pontos para o seu ranking diário!`,
            alunoId: req.user.id,
            turmaId: student.turmaId
        }
    });

    res.json({
        success: true,
        pontos_portal: updatedStudent.pontos_portal
    });
}));

// --- QUIZ DIÁRIO COM IA (GROQ API) ---

// In-memory store for quiz answers (keyed by alunoId, with TTL)
const quizAnswersStore = new Map();
const QUIZ_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup expired quiz entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of quizAnswersStore.entries()) {
        if (now - entry.createdAt > QUIZ_TTL_MS) {
            quizAnswersStore.delete(key);
        }
    }
}, 60 * 1000); // Check every minute

// Static fallback question bank (IT/Computing fundamentals)
const FALLBACK_QUESTIONS = [
    {
        pergunta: "O que é o protocolo HTTP?",
        alternativas: ["A) Um tipo de hardware de rede", "B) Um protocolo de comunicação usado para transferir dados na web", "C) Um sistema operacional", "D) Um banco de dados relacional"],
        correta: 1
    },
    {
        pergunta: "Qual é a diferença entre hardware e software?",
        alternativas: ["A) Hardware são programas, software são componentes físicos", "B) Hardware e software são sinônimos", "C) Hardware são os componentes físicos do computador, software são os programas", "D) Hardware é apenas o processador, software é apenas o sistema operacional"],
        correta: 2
    },
    {
        pergunta: "O que significa a sigla CPU?",
        alternativas: ["A) Central Processing Unit (Unidade Central de Processamento)", "B) Computer Power Unit (Unidade de Energia do Computador)", "C) Central Program Utility (Utilitário Central de Programas)", "D) Computer Processing Utility (Utilitário de Processamento do Computador)"],
        correta: 0
    },
    {
        pergunta: "Qual protocolo é usado para enviar e-mails?",
        alternativas: ["A) HTTP", "B) FTP", "C) SMTP", "D) SSH"],
        correta: 2
    },
    {
        pergunta: "O que é RAM?",
        alternativas: ["A) Read Access Memory (Memória de Acesso de Leitura)", "B) Random Access Memory (Memória de Acesso Aleatório)", "C) Remote Access Module (Módulo de Acesso Remoto)", "D) Rapid Action Memory (Memória de Ação Rápida)"],
        correta: 1
    },
    {
        pergunta: "Qual é a função de um sistema operacional?",
        alternativas: ["A) Apenas reproduzir arquivos de mídia", "B) Gerenciar os recursos do hardware e fornecer serviços para os programas", "C) Conectar o computador à internet", "D) Armazenar arquivos permanentemente"],
        correta: 1
    },
    {
        pergunta: "O que é um endereço IP?",
        alternativas: ["A) Um tipo de processador", "B) Um identificador numérico único atribuído a dispositivos em uma rede", "C) Um protocolo de segurança", "D) Um tipo de memória RAM"],
        correta: 1
    },
    {
        pergunta: "Qual é a diferença entre HTTP e HTTPS?",
        alternativas: ["A) HTTPS é mais rápido que HTTP", "B) HTTP é mais seguro que HTTPS", "C) HTTPS usa criptografia SSL/TLS para proteger a comunicação", "D) Não há diferença, são iguais"],
        correta: 2
    },
    {
        pergunta: "O que é um banco de dados relacional?",
        alternativas: ["A) Um banco que armazena apenas imagens", "B) Um sistema que organiza dados em tabelas com relações entre elas", "C) Um tipo de rede de computadores", "D) Um software para editar textos"],
        correta: 1
    },
    {
        pergunta: "O que significa a sigla LAN?",
        alternativas: ["A) Local Area Network (Rede de Área Local)", "B) Large Access Node (Nó de Grande Acesso)", "C) Linked Application Network (Rede de Aplicativos Vinculados)", "D) Low Allocation Network (Rede de Baixa Alocação)"],
        correta: 0
    },
    {
        pergunta: "Qual componente de hardware é responsável pelo processamento gráfico?",
        alternativas: ["A) CPU", "B) RAM", "C) SSD", "D) GPU"],
        correta: 3
    },
    {
        pergunta: "O que é um algoritmo?",
        alternativas: ["A) Um tipo de computador", "B) Uma sequência lógica de passos para resolver um problema", "C) Um protocolo de rede", "D) Um dispositivo de armazenamento"],
        correta: 1
    },
    {
        pergunta: "Qual a porta padrão do protocolo HTTP?",
        alternativas: ["A) 21", "B) 25", "C) 80", "D) 443"],
        correta: 2
    },
    {
        pergunta: "O que é um SSD?",
        alternativas: ["A) Secure Socket Device (Dispositivo de Soquete Seguro)", "B) Sistema de Software Dinâmico", "C) Solid State Drive (Unidade de Estado Sólido)", "D) Server Side Data (Dados do Lado do Servidor)"],
        correta: 2
    },
    {
        pergunta: "O que é uma linguagem de programação?",
        alternativas: ["A) Um idioma humano traduzido para máquinas", "B) Uma ferramenta formal para escrever instruções que um computador pode executar", "C) Um tipo de hardware", "D) Um sistema operacional"],
        correta: 1
    },
    {
        pergunta: "O que significa DNS?",
        alternativas: ["A) Digital Network System (Sistema de Rede Digital)", "B) Domain Name System (Sistema de Nomes de Domínio)", "C) Data Network Security (Segurança de Dados de Rede)", "D) Dynamic Node Service (Serviço de Nó Dinâmico)"],
        correta: 1
    },
    {
        pergunta: "Qual é a função da memória ROM?",
        alternativas: ["A) Armazenar dados temporários durante o uso", "B) Armazenar dados permanentes que não são apagados ao desligar o computador", "C) Processar dados em alta velocidade", "D) Conectar dispositivos externos"],
        correta: 1
    },
    {
        pergunta: "O que é virtualização?",
        alternativas: ["A) Criar cópias de segurança de arquivos", "B) Transformar imagens em 3D", "C) Emular recursos de hardware para executar múltiplos sistemas operacionais em um único servidor", "D) Comprimir arquivos para economizar espaço"],
        correta: 2
    },
    {
        pergunta: "O que é uma API?",
        alternativas: ["A) Advanced Programming Interface — um tipo de processador", "B) Application Programming Interface — conjunto de regras para integração entre softwares", "C) Automated Process Installer — instalador de programas", "D) Application Protocol Instruction — protocolo de rede"],
        correta: 1
    },
    {
        pergunta: "Qual método HTTP é usado para enviar dados ao servidor (ex.: formulários)?",
        alternativas: ["A) GET", "B) DELETE", "C) PUT", "D) POST"],
        correta: 3
    }
];

function getShuffledFallbackQuestions(count = 10) {
    const shuffled = [...FALLBACK_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// POST /api/quiz/gerar — Generate 10 quiz questions using Groq AI
app.post('/api/quiz/gerar', authenticate, authorize(['ALUNO']), asyncHandler(async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    // Check if student already completed today's challenge
    const student = await prisma.aluno.findUnique({
        where: { id: req.user.id },
        include: { turma: true }
    });
    if (!student) return res.status(404).json({ error: "Aluno não encontrado" });

    const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const lastStr = student.data_ultimo_desafio
        ? new Date(student.data_ultimo_desafio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : null;
    if (todayStr === lastStr) {
        return res.status(400).json({ error: "Você já realizou o quiz diário de hoje!" });
    }

    // Fetch missions and activities from the student's class
    const turmaId = student.turmaId;
    let contextoPedagogico = "Curso técnico de Informática e Tecnologia do SENAI.";

    if (turmaId) {
        const [missoes, atividades, turma] = await Promise.all([
            prisma.missao.findMany({ where: { turmaId }, select: { titulo: true, descricao: true } }),
            prisma.atividade.findMany({ where: { turmaId }, select: { titulo: true, descricao: true } }),
            prisma.turma.findUnique({ where: { id: turmaId }, select: { nome: true, materia: true, observacao: true } })
        ]);

        const trechosMissoes = missoes.map(m => `- Missão: "${m.titulo}"${m.descricao ? `: ${m.descricao}` : ''}`).join('\n');
        const trechosAtividades = atividades.map(a => `- Atividade: "${a.titulo}"${a.descricao ? `: ${a.descricao}` : ''}`).join('\n');

        contextoPedagogico = `Turma: "${turma?.nome || 'Sem nome'}"
Matéria: "${turma?.materia || 'Informática'}"
${turma?.observacao ? `Observação da turma: ${turma.observacao}` : ''}

Missões do curso:
${trechosMissoes || '- Nenhuma missão cadastrada'}

Atividades do curso:
${trechosAtividades || '- Nenhuma atividade cadastrada'}`;
    }

    const systemPrompt = `Você é um gerador de quiz educacional do SENAI para cursos de Tecnologia da Informação e Informática. Sua ÚNICA função é criar perguntas de múltipla escolha sobre o conteúdo do curso.

REGRAS ABSOLUTAS:
1. Gere EXATAMENTE 10 perguntas de múltipla escolha com 4 alternativas cada.
2. Apenas UMA alternativa deve ser a correta.
3. OBRIGATÓRIO: As perguntas devem cobrir temas fundamentais de TI e Informática, como:
   - O que é HTTP, HTTPS, FTP, DNS, TCP/IP e outros protocolos de rede
   - O que é hardware (CPU, RAM, ROM, SSD, HDD, GPU, placa-mãe)
   - O que é software, sistema operacional, linguagens de programação
   - Conceitos de redes de computadores (LAN, WAN, IP, roteador, switch)
   - Banco de dados, SQL, conceitos de programação, algoritmos
   - Segurança da informação (criptografia, firewall, antivírus)
   - Lógica de programação, estruturas de dados
   - Cloud computing, virtualização, APIs
4. Se houver missões/atividades cadastradas, baseie as perguntas também nelas.
5. Se a matéria indicar outra área (ex: Logística, Matemática), priorize essa área, mas mantenha pelo menos 5 perguntas de TI básica.
6. Varie a dificuldade: 3 fáceis, 4 médias e 3 difíceis.
7. As perguntas devem ser em português brasileiro, claras e objetivas.
8. Retorne APENAS um JSON válido, sem texto adicional, markdown ou blocos de código.

CONTEXTO DO CURSO:
${contextoPedagogico}

FORMATO DE RESPOSTA OBRIGATÓRIO (array JSON puro):
[
  {
    "pergunta": "O que é o protocolo HTTP?",
    "alternativas": ["A) Um tipo de hardware", "B) Um protocolo de comunicação web", "C) Um banco de dados", "D) Um sistema operacional"],
    "correta": 1
  }
]

Onde "correta" é o índice 0-3 da alternativa correta. Gere as 10 perguntas agora.`;

    let questions = null;

    try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: 'Gere as 10 perguntas do quiz sobre o curso. Retorne apenas o array JSON, sem texto adicional.' }
                ],
                temperature: 0.75,
                max_tokens: 4000,
                response_format: { type: 'json_object' }
            })
        });

        if (groqResponse.ok) {
            const groqData = await groqResponse.json();
            const content = groqData.choices?.[0]?.message?.content;

            if (content) {
                try {
                    const parsed = JSON.parse(content);
                    const parsedQuestions = Array.isArray(parsed)
                        ? parsed
                        : (parsed.questions || parsed.perguntas || parsed.quiz || parsed.perguntas_quiz || Object.values(parsed).find(v => Array.isArray(v)) || []);

                    if (Array.isArray(parsedQuestions) && parsedQuestions.length >= 5) {
                        questions = parsedQuestions.slice(0, 10);
                        console.log(`[QUIZ] AI generated ${questions.length} questions successfully`);
                    } else {
                        console.warn('[QUIZ] AI returned insufficient questions, using fallback');
                    }
                } catch (parseErr) {
                    console.error('[QUIZ] JSON parse error, using fallback:', parseErr.message);
                }
            }
        } else {
            const errBody = await groqResponse.text();
            console.error('[QUIZ] Groq API error:', groqResponse.status, errBody);
        }
    } catch (fetchErr) {
        console.error('[QUIZ] Fetch error, using fallback:', fetchErr.message);
    }

    // Use fallback questions if AI failed
    if (!questions) {
        console.log('[QUIZ] Using static fallback question bank');
        questions = getShuffledFallbackQuestions(10);
    }

    // Store correct answers server-side
    const correctAnswers = questions.map(q => q.correta);
    quizAnswersStore.set(req.user.id, {
        answers: correctAnswers,
        questions: questions,
        createdAt: Date.now()
    });

    // Send questions to client WITHOUT correct answers
    const clientQuestions = questions.map(q => ({
        pergunta: q.pergunta,
        alternativas: q.alternativas
    }));

    res.json({ questions: clientQuestions });
}));

// POST /api/quiz/responder — Validate quiz answers and award points
app.post('/api/quiz/responder', authenticate, authorize(['ALUNO']), asyncHandler(async (req, res) => {
    const { respostas } = req.body; // Array of answer indices [0-3]

    if (!Array.isArray(respostas)) {
        return res.status(400).json({ error: "Formato de respostas inválido." });
    }

    // Check if student already completed today
    const student = await prisma.aluno.findUnique({ where: { id: req.user.id } });
    if (!student) return res.status(404).json({ error: "Aluno não encontrado" });

    const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const lastStr = student.data_ultimo_desafio
        ? new Date(student.data_ultimo_desafio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : null;
    if (todayStr === lastStr) {
        return res.status(400).json({ error: "Você já realizou o quiz diário de hoje!" });
    }

    // Retrieve stored answers
    const storedData = quizAnswersStore.get(req.user.id);
    if (!storedData) {
        return res.status(400).json({ error: "Quiz expirado ou não encontrado. Gere um novo quiz." });
    }

    const { answers: correctAnswers, questions: fullQuestions } = storedData;

    // Calculate score
    let acertos = 0;
    const detalhes = [];

    for (let i = 0; i < correctAnswers.length; i++) {
        const respostaAluno = respostas[i] !== undefined && respostas[i] !== null ? respostas[i] : -1;
        const correto = respostaAluno === correctAnswers[i];
        if (correto) acertos++;

        detalhes.push({
            pergunta: fullQuestions[i]?.pergunta || `Questão ${i + 1}`,
            alternativas: fullQuestions[i]?.alternativas || [],
            respostaAluno,
            respostaCorreta: correctAnswers[i],
            correto
        });
    }

    // Score formula: acertos/2, max 5
    const points = Math.min(5, Math.floor(acertos / 2));

    // Update student's portal points and last challenge date
    const updatedStudent = await prisma.aluno.update({
        where: { id: req.user.id },
        data: {
            data_ultimo_desafio: new Date(),
            pontos_portal: student.pontos_portal + points
        }
    });

    // Create notification
    await prisma.mensagem.create({
        data: {
            conteudo: `🧠 Quiz Diário concluído! Você acertou ${acertos}/10 questões e ganhou +${points} pontos para o ranking!`,
            alunoId: req.user.id,
            turmaId: student.turmaId
        }
    });

    // Clean up stored quiz data
    quizAnswersStore.delete(req.user.id);

    res.json({
        success: true,
        acertos,
        total: correctAnswers.length,
        points,
        pontos_portal: updatedStudent.pontos_portal,
        detalhes
    });
}));

// GET /api/aluno/:id/boletim — Returns full academic record (professor or self)
app.get('/api/aluno/:id/boletim', authenticate, authorize(['PROFESSOR', 'ADMIN', 'ALUNO']), asyncHandler(async (req, res) => {
    const alunoId = parseInt(req.params.id);

    // Students can only view their own boletim
    if (req.user.role === 'ALUNO' && req.user.id !== alunoId) {
        return res.status(403).json({ error: 'Acesso negado.' });
    }

    const aluno = await prisma.aluno.findUnique({
        where: { id: alunoId },
        include: {
            turma: { include: { professor: true } },
            professor: true,
            notas: {
                include: { atividade: true },
                orderBy: { data_avaliacao: 'asc' }
            },
            notas_missoes: {
                include: { missao: true },
                orderBy: { data_avaliacao: 'asc' }
            }
        }
    });

    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

    // Professor can only view students from their own classes
    if (req.user.role === 'PROFESSOR') {
        const myClasses = await prisma.turma.findMany({ where: { professorId: req.user.id }, select: { id: true } });
        const myClassIds = myClasses.map(c => c.id);
        if (aluno.turmaId && !myClassIds.includes(aluno.turmaId)) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
    }

    // Compute XP and rank
    const classRanking = aluno.turmaId ? await prisma.aluno.findMany({
        where: { turmaId: aluno.turmaId },
        include: { notas: true, notas_missoes: true }
    }) : [];

    const rankedList = classRanking.map(a => {
        const xpAtiv = a.notas.reduce((acc, n) => acc + (n.valor * 10), 0);
        const xpMis = a.notas_missoes.reduce((acc, n) => acc + (n.valor * 3), 0);
        return { id: a.id, xp: xpAtiv + xpMis + (a.pontos_portal || 0) };
    }).sort((a, b) => b.xp - a.xp);

    const myXpAtiv = aluno.notas.reduce((acc, n) => acc + (n.valor * 10), 0);
    const myXpMis = aluno.notas_missoes.reduce((acc, n) => acc + (n.valor * 3), 0);
    const totalXP = myXpAtiv + myXpMis + (aluno.pontos_portal || 0);
    const rankPos = rankedList.findIndex(r => r.id === alunoId) + 1;

    // All activities in the class (even if not graded)
    const allActivities = aluno.turmaId ? await prisma.atividade.findMany({
        where: { turmaId: aluno.turmaId },
        orderBy: { data_criacao: 'asc' }
    }) : [];

    const allMissions = aluno.turmaId ? await prisma.missao.findMany({
        where: { turmaId: aluno.turmaId },
        orderBy: { data_criacao: 'asc' }
    }) : [];

    res.json({
        aluno: {
            id: aluno.id,
            nome: aluno.nome,
            email: aluno.email,
            foto_url: aluno.foto_url,
            info: aluno.info,
            estado_humor: aluno.estado_humor,
            data_criacao: aluno.data_criacao,
            pontos_portal: aluno.pontos_portal || 0,
        },
        turma: aluno.turma ? {
            id: aluno.turma.id,
            nome: aluno.turma.nome,
            materia: aluno.turma.materia,
            observacao: aluno.turma.observacao,
            codigo: aluno.turma.codigo,
        } : null,
        professor: aluno.turma?.professor ? {
            id: aluno.turma.professor.id,
            nome: aluno.turma.professor.nome,
            email: aluno.turma.professor.email,
            foto_url: aluno.turma.professor.foto_url,
            bio: aluno.turma.professor.bio,
            mensagem_incentivo: aluno.turma.professor.mensagem_incentivo,
        } : null,
        stats: {
            totalXP,
            xpAtividades: myXpAtiv,
            xpMissoes: myXpMis,
            xpPortal: aluno.pontos_portal || 0,
            rankPosition: rankPos,
            totalStudents: classRanking.length,
            nivel: Math.floor(1 + Math.sqrt(totalXP / 100)),
        },
        atividades: allActivities.map(a => {
            const nota = aluno.notas.find(n => n.atividadeId === a.id);
            return {
                id: a.id,
                titulo: a.titulo,
                descricao: a.descricao,
                nota_maxima: a.nota_maxima,
                data_criacao: a.data_criacao,
                nota: nota ? { valor: nota.valor, data_avaliacao: nota.data_avaliacao, reacao_emoji: nota.reacao_emoji } : null,
            };
        }),
        missoes: allMissions.map(m => {
            const nota = aluno.notas_missoes.find(n => n.missaoId === m.id);
            return {
                id: m.id,
                titulo: m.titulo,
                descricao: m.descricao,
                recompensa: m.recompensa,
                prazo: m.prazo,
                data_criacao: m.data_criacao,
                nota: nota ? { valor: nota.valor, data_avaliacao: nota.data_avaliacao } : null,
            };
        }),
        gerado_em: new Date().toISOString(),
    });
}));

// --- ENCERRAMENTO DE TURMA (Férias / Fim de Semestre) ---

// PATCH /api/turmas/:id/encerramento — Professor define data de encerramento e envia mensagens
app.patch('/api/turmas/:id/encerramento', authenticate, authorize(['PROFESSOR', 'ADMIN']), asyncHandler(async (req, res) => {
    const turmaId = parseInt(req.params.id);
    const { data_encerramento, ranking_encerrado, enviar_mensagens } = req.body;

    // Verificar ownership
    const turma = await prisma.turma.findUnique({
        where: { id: turmaId },
        include: { professor: { select: { nome: true } } }
    });
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
    if (req.user.role === 'PROFESSOR' && turma.professorId !== req.user.id) {
        return res.status(403).json({ error: 'Você não tem permissão para esta turma' });
    }

    let parsedData = null;
    if (data_encerramento) {
        const d = new Date(data_encerramento);
        if (!isNaN(d.getTime())) parsedData = d;
    }

    // Atualizar turma
    const updatedTurma = await prisma.turma.update({
        where: { id: turmaId },
        data: {
            data_encerramento: parsedData,
            ranking_encerrado: ranking_encerrado !== undefined ? ranking_encerrado : (parsedData ? true : false)
        }
    });

    // Enviar mensagens personalizadas para cada aluno se solicitado
    let mensagensEnviadas = 0;
    if (enviar_mensagens) {
        // Calcular ranking final da turma
        const alunos = await prisma.aluno.findMany({
            where: { turmaId },
            include: { notas: true, notas_missoes: true }
        });

        const rankingFinal = alunos.map(a => {
            const xpAtiv = a.notas.reduce((acc, n) => acc + (n.valor * 10), 0);
            const xpMis = a.notas_missoes.reduce((acc, n) => acc + (n.valor * 3), 0);
            const totalXP = xpAtiv + xpMis + (a.pontos_portal || 0);
            return { ...a, xp: totalXP };
        }).sort((a, b) => b.xp - a.xp);

        const total = rankingFinal.length;

        const elogiosPorPosicao = (pos, xp, total) => {
            if (pos === 1) return `🥇 CAMPEÃO DA TURMA! Você foi o número 1 do semestre com ${xp} XP! Sua dedicação, esforço e comprometimento foram absolutamente excepcionais. Você é um exemplo para todos!`;
            if (pos === 2) return `🥈 VICE-CAMPEÃO! Incrível, você ficou em 2º lugar com ${xp} XP! Sua performance foi extraordinária e sua evolução ao longo do semestre foi notável. Continue nessa trilha vitoriosa!`;
            if (pos === 3) return `🥉 PÓDIO! Parabéns pelo 3º lugar com ${xp} XP! Você mostrou consistência e determinação que poucos demonstram. Esse resultado é fruto do seu esforço real!`;
            if (pos <= Math.ceil(total * 0.25)) return `⭐ TOP ${Math.ceil(total * 0.25)}! Você ficou em ${pos}º lugar com ${xp} XP — um resultado fantástico! Você está entre os melhores da turma e seu empenho fez toda a diferença neste semestre.`;
            if (pos <= Math.ceil(total * 0.5)) return `💪 Você ficou em ${pos}º lugar com ${xp} XP. Muito bom! Você se manteve na metade superior da turma, demonstrando compromisso com o aprendizado. Cada missão completada valeu muito!`;
            if (pos <= Math.ceil(total * 0.75)) return `🌱 Você ficou em ${pos}º lugar com ${xp} XP. O semestre foi um aprendizado valioso! As bases que você construiu aqui vão te preparar para ir ainda mais longe no próximo. Não desista!`;
            return `🔥 Você ficou em ${pos}º lugar com ${xp} XP. Cada passo conta! O próximo semestre é uma nova oportunidade para mostrar seu potencial. Acredite em você — sua jornada está apenas começando!`;
        };

        const motivacoes = [
            'O próximo semestre reserva grandes desafios e ainda maiores conquistas para você!',
            'Use as férias para recarregar as energias — o próximo nível espera por você!',
            'Cada linha de código aprendida te aproximou do profissional incrível que você está se tornando.',
            'Seu esforço aqui foi real e vai refletir na sua carreira. Continue evoluindo!',
            'Tecnologia é a profissão do futuro, e você já está construindo esse futuro. Até o próximo semestre!',
            'As habilidades que você desenvolveu aqui são o seu maior ativo. Honre-as no próximo semestre!'
        ];

        for (let i = 0; i < rankingFinal.length; i++) {
            const aluno = rankingFinal[i];
            const pos = i + 1;
            const motivacao = motivacoes[i % motivacoes.length];
            const elogio = elogiosPorPosicao(pos, aluno.xp, total);

            const conteudo = `🎓 FIM DE SEMESTRE — MENSAGEM DO SEU PROFESSOR\n\n` +
                `Olá, ${aluno.nome}! O semestre chegou ao fim e é hora de celebrar sua jornada.\n\n` +
                `📊 SEU RESULTADO FINAL:\n` +
                `• Posição no Ranking: ${pos}º de ${total} aventureiros\n` +
                `• XP Total conquistado: ${aluno.xp} pontos\n\n` +
                `${elogio}\n\n` +
                `✨ ${motivacao}\n\n` +
                `Boas férias e até o próximo semestre! Com carinho,\n` +
                `Prof. ${turma.professor?.nome || 'Seu Professor'} 🏫`;

            await prisma.mensagem.create({
                data: {
                    conteudo,
                    tipo: 'decreto_supremo',
                    professorId: req.user.role === 'PROFESSOR' ? req.user.id : null,
                    adminId: req.user.role === 'ADMIN' ? req.user.id : null,
                    alunoId: aluno.id,
                    turmaId
                }
            });
            mensagensEnviadas++;
        }
    }

    res.json({
        turma: updatedTurma,
        mensagensEnviadas,
        message: enviar_mensagens
            ? `Ranking encerrado e ${mensagensEnviadas} mensagens enviadas com sucesso!`
            : 'Configuração de encerramento salva com sucesso!'
    });
}));

// GET /api/turmas/:id — Retorna dados completos de uma turma (incluindo encerramento)
app.get('/api/turmas/:id', authenticate, authorize(['ADMIN', 'PROFESSOR']), asyncHandler(async (req, res) => {
    const turmaId = parseInt(req.params.id);
    const turma = await prisma.turma.findUnique({
        where: { id: turmaId },
        include: { professor: { select: { nome: true } } }
    });
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
    res.json(turma);
}));

// --- APP SETUP ---

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Erro interno do servidor" });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
