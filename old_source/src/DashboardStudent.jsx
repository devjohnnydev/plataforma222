import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from './DataContext';
import { Trophy, Star, MessageSquare, User as UserIcon, LogOut, Award, RefreshCw, Quote, Info, Settings, Camera, Save, BookOpen, CheckCircle, Bell, Lock, Upload, Image as ImageIcon, TrendingUp, TrendingDown, Minus, FileText, Zap, CalendarOff } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import BoletimAluno from './BoletimAluno';
import StudentQuiz from './StudentQuiz';

const TechParticles = () => {
    const particles = useMemo(() => {
        const symbols = ['0', '1', '</>', 'code', 'const', 'let', 'JSON', 'git', 'fn()', 'class', 'SENAI', 'TI'];
        return Array.from({ length: 25 }).map((_, idx) => ({
            id: idx,
            symbol: symbols[Math.floor(Math.random() * symbols.length)],
            left: `${Math.random() * 95}%`,
            delay: `${Math.random() * 8}s`,
            duration: `${6 + Math.random() * 8}s`,
            fontSize: `${0.7 + Math.random() * 0.9}rem`,
        }));
    }, []);

    return (
        <div className="projector-particles-container">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="projector-particle"
                    style={{
                        left: p.left,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        fontSize: p.fontSize,
                    }}
                >
                    {p.symbol}
                </div>
            ))}
        </div>
    );
};

const moods = [
    { emoji: '😀', label: 'Feliz' },
    { emoji: '🔥', label: 'Focado' },
    { emoji: '🤔', label: 'Pensativo' },
    { emoji: '😴', label: 'Com sono' },
    { emoji: '😢', label: 'Triste' },
    { emoji: '😟', label: 'Preocupado' },
    { emoji: '🤮', label: 'Doente' },
    { emoji: '❤️', label: 'Motivado' }
];

const DashboardStudent = () => {
    const {
    user, token, logout, ranking, loading, refreshAll, updateStudentProfile, updateStudentPassword, uploadFile, activities, grades, messages, joinClass, markMessageAsRead, missions, sendEmojiReaction, compressImage
    } = useData();

    const [tab, setTab] = useState('ranking');
    const [showProfileEdit, setShowProfileEdit] = useState(false);

    // Contador de mensagens não lidas
    const unreadCount = useMemo(() => {
        return messages.filter(m => !m.lida).length;
    }, [messages]);

    const [profileData, setProfileData] = useState({
        nome: user?.nome || '',
        foto_url: user?.foto_url || '',
        info: user?.info || ''
    });

    const [newPassword, setNewPassword] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [showMoodSelector, setShowMoodSelector] = useState(false);
    const [showBoletim, setShowBoletim] = useState(false);
    const fileInputRef = useRef(null);

    // Helper to get full image URL
    const getFullImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        
        let baseUrl = '';
        const envApiUrl = import.meta.env.VITE_API_URL;
        if (envApiUrl && envApiUrl.startsWith('http')) {
            baseUrl = envApiUrl.replace(/\/api\/?$/, '');
        } else {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            baseUrl = isLocal ? 'http://localhost:3001' : window.location.origin;
        }
        return `${baseUrl}${url}`;
    };

    useEffect(() => {
        if (user) {
            setProfileData({
                nome: user.nome || '',
                foto_url: user.foto_url || '',
                info: user.info || ''
            });
            setPreviewUrl(getFullImageUrl(user.foto_url));
        }
    }, [user]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            let finalFotoUrl = profileData.foto_url;

            if (selectedFile) {
                // Compress the image client-side to prevent localStorage/DB quota issues
                try {
                    finalFotoUrl = await compressImage(selectedFile);
                } catch (err) {
                    console.error("Erro ao comprimir imagem:", err);
                    // fallback to FileReader
                    const base64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = (e) => reject(e);
                        reader.readAsDataURL(selectedFile);
                    });
                    finalFotoUrl = base64;
                }
            }

            await updateStudentProfile({ ...profileData, foto_url: finalFotoUrl });

            if (newPassword) {
                await updateStudentPassword(newPassword);
                setNewPassword('');
            }

            setShowProfileEdit(false);
            setSelectedFile(null);
            alert('Perfil atualizado com sucesso!');
            refreshAll();
        } catch (err) {
            alert('Falha ao atualizar perfil: ' + err.message);
        }
    };

    const handleJoinClass = async (e) => {
        e.preventDefault();
        try {
            await joinClass(joinCode);
            setJoinCode('');
            alert('Você entrou na guilda com sucesso!');
        } catch (err) {
            alert('Falha ao entrar na guilda: ' + err.message);
        }
    };

    const myStats = useMemo(() => {
        if (!user || !ranking) return { xp: 0, level: 1 };
        return ranking.find(r => r.id === user.id) || { xp: 0, level: 1, nome: user.nome };
    }, [ranking, user?.id, user?.nome]);

    const xp = myStats.xp || 0;
    const level = myStats.level || 1;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const currentLevelBaseXP = Math.pow(level - 1, 2) * 100;
    const progressPercent = Math.max(0, Math.min(((xp - currentLevelBaseXP) / (nextLevelXP - currentLevelBaseXP)) * 100, 100)) || 0;

    const professor = user?.professor;
    const turma = user?.turma;

    // Filter ranking to show only classmates
    const filteredRanking = useMemo(() => {
        if (!user?.turmaId) return [];
        return ranking.filter(r => r.turmaId === user.turmaId);
    }, [ranking, user?.turmaId]);

    // Show only Top 5 + current user
    const visibleRanking = useMemo(() => {
        if (!filteredRanking.length) return [];
        const top5 = filteredRanking.slice(0, 5);
        const isUserInTop5 = top5.some(r => r.id === user?.id);
        
        if (!isUserInTop5 && user?.id) {
            const userRankData = filteredRanking.find(r => r.id === user.id);
            if (userRankData) {
                return [...top5, userRankData];
            }
        }
        return top5;
    }, [filteredRanking, user?.id]);

    const rankingTrend = useMemo(() => {
        if (!user || !filteredRanking.length) return null;
        const currentRank = filteredRanking.findIndex(r => r.id === user.id) + 1;
        const myData = filteredRanking.find(r => r.id === user.id);
        if (!myData || currentRank === 0) return null;

        // If no previous position, assume it's the same
        const prevRank = myData.posicao_anterior || currentRank;
        const diff = prevRank - currentRank;
        return { diff, currentRank, prevRank };
    }, [filteredRanking, user]);

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div
                        onClick={() => setShowProfileEdit(true)}
                        style={{ position: 'relative', cursor: 'pointer' }}
                    >
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--primary)', background: 'rgba(255,255,255,0.05)' }}>
                            {user?.foto_url ? <img src={getFullImageUrl(user.foto_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={40} style={{ margin: '20px', color: 'var(--text-muted)' }} />}
                        </div>
                        <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: 'var(--primary)', color: 'black', padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            LVL {level}
                        </div>
                        <div style={{ position: 'absolute', top: '0', right: '0', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '4px' }}>
                            <Settings size={14} color="white" />
                        </div>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.2rem', color: 'var(--primary)' }}>
                            PlayGame
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Aventureiro: {user?.nome}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mestre: {myStats.professorNome || professor?.nome || 'Carregando...'}</p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Como você está hoje?</span>
                            <button 
                                onClick={() => setShowMoodSelector(!showMoodSelector)} 
                                style={{ 
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '20px', 
                                    padding: '2px 8px', 
                                    color: 'white', 
                                    fontSize: '0.8rem', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                {user?.estado_humor || '❓'} {showMoodSelector ? '▲' : '▼'}
                            </button>
                        </div>
                        
                        {showMoodSelector && (
                            <div style={{ 
                                display: 'flex', 
                                gap: '0.3rem', 
                                marginTop: '0.5rem', 
                                flexWrap: 'wrap', 
                                background: 'rgba(0,0,0,0.3)', 
                                padding: '8px', 
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {moods.map(m => (
                                    <button 
                                        key={m.emoji}
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                await updateStudentProfile({ estado_humor: m.emoji });
                                                setShowMoodSelector(false);
                                                refreshAll();
                                            } catch (err) {
                                                alert("Falha ao atualizar humor: " + err.message);
                                            }
                                        }}
                                        title={m.label}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            fontSize: '1.2rem', 
                                            cursor: 'pointer',
                                            padding: '4px',
                                            borderRadius: '4px',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        {m.emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={refreshAll} className="btn glass-card" disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    </button>
                    <button onClick={logout} className="btn btn-logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {showProfileEdit && (
                <div className="glass-card" style={{ padding: '2rem', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Camera size={20} /> Configurações de Aventureiro
                    </h3>
                    <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '1.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--primary)', cursor: 'pointer', position: 'relative' }}
                            >
                                {previewUrl ? <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={60} style={{ margin: '30px', color: 'var(--text-muted)' }} />}
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                                    <Upload color="white" size={30} />
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.4rem', display: 'block' }}>Nome</label>
                                <input className="input-field" placeholder="Seu Nome" value={profileData.nome} onChange={e => setProfileData({ ...profileData, nome: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.4rem', display: 'block' }}>E-mail (Login)</label>
                                <input className="input-field" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.4rem', display: 'block' }}>URL da Foto (opcional se fez upload)</label>
                            <input className="input-field" placeholder="https://..." value={profileData.foto_url} onChange={e => {
                                setProfileData({ ...profileData, foto_url: e.target.value });
                                if (e.target.value) setPreviewUrl(e.target.value);
                            }} />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.4rem', display: 'block' }}>Sobre Você</label>
                            <textarea className="input-field" placeholder="Conte sua história..." value={profileData.info} onChange={e => setProfileData({ ...profileData, info: e.target.value })} style={{ minHeight: '80px' }} />
                        </div>

                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={16} color="var(--primary)" /> Alterar Senha de Acesso</h4>
                            <input
                                className="input-field"
                                type="password"
                                placeholder="Nova senha (deixe em branco para não alterar)"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}><Save size={18} /> SALVAR ALTERAÇÕES</button>
                            <button type="button" onClick={() => setShowProfileEdit(false)} className="btn glass-card" style={{ flex: 1 }}>CANCELAR</button>
                        </div>
                    </form>
                </div>
            )}

            {!showProfileEdit && user?.info && (
                <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '3rem', background: 'rgba(255,255,255,0.02)' }}>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Minha Jornada</h4>
                    <p style={{ lineHeight: '1.6' }}>{user.info}</p>
                </div>
            )}

            {professor && (
                <div className="glass-card" style={{ padding: '2rem', marginBottom: '3rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--secondary)', flexShrink: 0 }}>
                        {professor.foto_url ? <img src={getFullImageUrl(professor.foto_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={60} style={{ margin: '30px', color: 'var(--text-muted)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h3 style={{ color: 'var(--secondary)', marginBottom: '0.5rem' }}>Mestre {professor.nome}</h3>
                        {professor.mensagem_incentivo && (
                            <div style={{ fontStyle: 'italic', color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <Quote size={20} /> {professor.mensagem_incentivo}
                            </div>
                        )}
                        {professor.bio && <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.5' }}>{professor.bio}</p>}
                    </div>
                </div>
            )}

            {turma?.observacao && (
                <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '3rem', background: 'rgba(99, 102, 241, 0.1)', borderLeft: '4px solid var(--primary)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Info size={18} /> Nota da Turma</h4>
                    <p style={{ fontSize: '0.95rem' }}>{turma.observacao}</p>
                </div>
            )}

            {/* BANNER DE FÉRIAS / RANKING ENCERRADO */}
            {turma?.ranking_encerrado && (
                <div style={{
                    padding: '2rem',
                    marginBottom: '3rem',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
                    border: '2px solid rgba(139,92,246,0.4)',
                    borderRadius: '20px',
                    textAlign: 'center',
                    boxShadow: '0 0 30px rgba(139,92,246,0.15)'
                }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🏖️</div>
                    <h3 style={{ fontSize: '1.6rem', color: '#a78bfa', fontWeight: '900', marginBottom: '0.5rem' }}>
                        PERÍODO DE FÉRIAS
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', lineHeight: '1.7', maxWidth: '500px', margin: '0 auto 1rem auto' }}>
                        O ranking da turma está temporariamente <strong style={{ color: '#a78bfa' }}>encerrado</strong> para o
                        período de férias escolares. Descanse, recarregue as energias e volte mais forte no próximo semestre! 🚀
                    </p>
                    {turma.data_encerramento && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '20px', padding: '0.5rem 1rem', marginTop: '0.5rem' }}>
                            <CalendarOff size={16} style={{ color: '#a78bfa' }} />
                            <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 'bold' }}>
                                Retorno previsto: {new Date(turma.data_encerramento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    )}
                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem 1.2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>📚</div>
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Continue estudando</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem 1.2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>⚡</div>
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Cheque suas mensagens!</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem 1.2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>🏆</div>
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Veja seu resultado</p>
                        </div>
                    </div>
                </div>
            )}

            {!user?.turmaId && (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginBottom: '3rem', background: 'rgba(255, 232, 31, 0.05)', border: '2px dashed var(--primary)' }}>
                    <h3 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '1rem' }}>Sua Jornada Começa Aqui</h3>
                    <p style={{ marginBottom: '2rem', opacity: 0.8 }}>Você ainda não pertence a nenhuma Guilda (Turma). Peça o Código de Acesso ao seu Professor para começar a ganhar XP e subir no Ranking!</p>
                    <form onSubmit={handleJoinClass} style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px', margin: '0 auto' }}>
                        <input
                            className="input-field"
                            placeholder="CÓDIGO DA GUILDA"
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            required
                            style={{ marginBottom: 0 }}
                        />
                        <button type="button" onClick={() => setShowQRScanner(true)} className="btn" style={{ background: 'rgba(255,255,255,0.1)', padding: '0 1rem' }}>
                            <Camera size={18} />
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }}>ENTRAR</button>
                    </form>
                </div>
            )}

            <nav style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => setTab('ranking')} className={`btn ${tab === 'ranking' ? 'btn-active' : 'btn-secondary-outline'}`} style={{ flex: 1 }}><Award size={18} /> Ranking da Guilda</button>
                <button onClick={() => setTab('quiz')} className={`btn ${tab === 'quiz' ? 'btn-active' : 'btn-warning-outline'}`} style={{ flex: 1 }}><Zap size={18} /> Quiz Diário</button>
                <button onClick={() => setTab('atividades')} className={`btn ${tab === 'atividades' ? 'btn-active' : 'btn-secondary-outline'}`} style={{ flex: 1 }}><BookOpen size={18} /> Minhas Notas</button>
                <button onClick={() => setTab('mensagens')} className={`btn ${tab === 'mensagens' ? 'btn-active' : 'btn-secondary-outline'}`} style={{ flex: 1, position: 'relative' }}>
                    <Bell size={18} /> {unreadCount > 0 && <span style={{ position: 'absolute', top: '-5px', right: '5px', background: 'var(--danger)', color: 'white', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '10px' }}>{unreadCount}</span>} Recados
                </button>
                <button onClick={() => setTab('missoes')} className={`btn ${tab === 'missoes' ? 'btn-active' : 'btn-secondary-outline'}`} style={{ flex: 1 }}><Star size={18} /> Missões</button>
                <button onClick={() => setTab('status')} className={`btn ${tab === 'status' ? 'btn-active' : 'btn-secondary-outline'}`} style={{ flex: 1 }}><Trophy size={18} /> Status</button>
                <button onClick={() => setShowBoletim(true)} className="btn btn-indigo-outline" style={{ flex: 1 }}><FileText size={18} /> Meu Boletim</button>
            </nav>

            <main className="glass-card" style={{ padding: '2.5rem' }}>
                {rankingTrend && (
                    <div className="glass-card" style={{
                        padding: '1.5rem',
                        marginBottom: '2rem',
                        background: rankingTrend.diff > 0 ? 'rgba(34, 197, 94, 0.1)' : rankingTrend.diff < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 232, 31, 0.05)',
                        borderLeft: `6px solid ${rankingTrend.diff > 0 ? 'var(--success)' : rankingTrend.diff < 0 ? 'var(--danger)' : 'var(--primary)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        flexWrap: 'wrap',
                        animation: 'slideIn 0.5s ease-out'
                    }}>
                        <div style={{
                            background: rankingTrend.diff > 0 ? 'var(--success)' : rankingTrend.diff < 0 ? 'var(--danger)' : 'var(--primary)',
                            padding: '12px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'black'
                        }}>
                            {rankingTrend.diff > 0 ? <TrendingUp size={24} strokeWidth={3} /> : rankingTrend.diff < 0 ? <TrendingDown size={24} strokeWidth={3} /> : <Minus size={24} strokeWidth={3} />}
                        </div>
                        <div>
                            <p style={{ margin: 0, fontWeight: '900', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {rankingTrend.diff > 0
                                    ? `UAU! VOCÊ SUBIU ${rankingTrend.diff} ${rankingTrend.diff === 1 ? 'POSIÇÃO' : 'POSIÇÕES'}!`
                                    : rankingTrend.diff < 0
                                        ? `ATENÇÃO! VOCÊ CAIU ${Math.abs(rankingTrend.diff)} ${Math.abs(rankingTrend.diff) === 1 ? 'POSIÇÃO' : 'POSIÇÕES'}`
                                        : `VOCÊ MANTEVE SEU RANK!`}
                            </p>
                            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.95rem', opacity: 0.9, fontWeight: '500' }}>
                                {rankingTrend.diff > 0
                                    ? "O topo está cada vez mais perto! Continue com esse ritmo épico!"
                                    : rankingTrend.diff < 0
                                        ? "Não baixe a guarda! A jornada de um herói é feita de superação. Vamos recuperar?"
                                        : "Estabilidade é sinal de foco. Que tal uma missão extra para escalar o Hall da Fama?"}
                            </p>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.6 }}>
                                Posição Atual: <strong style={{ color: 'white' }}>{rankingTrend.currentRank}º</strong> | Anterior: <strong style={{ color: 'white' }}>{rankingTrend.prevRank}º</strong>
                            </p>
                        </div>
                    </div>
                )}

                {tab === 'quiz' && (
                    <StudentQuiz 
                        token={token} 
                        API_URL={import.meta.env.VITE_API_URL || '/api'} 
                        onQuizCompleted={() => refreshAll()}
                    />
                )}

                {tab === 'status' && (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="status-ring" style={{ width: '150px', height: '150px', fontSize: '3.5rem', fontWeight: '900' }}>
                            {level}
                        </div>
                        <h3 style={{ marginTop: '2rem', fontSize: '1.8rem' }}>{xp.toLocaleString()} XP</h3>
                        <div style={{ width: '100%', maxWidth: '400px', marginTop: '1.5rem' }}>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                                Faltam {Math.max(0, nextLevelXP - xp).toLocaleString()} XP para o próximo nível
                            </p>
                        </div>
                    </div>
                )}

                {tab === 'atividades' && (
                    <div>
                        <h3 style={{ marginBottom: '2rem' }}>Minhas Atividades e Avaliações</h3>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {activities.map(activity => {
                                const myGrade = grades.find(g => g.atividadeId === activity.id);
                                const EMOJIS = [
                                    { emoji: '🔥', label: 'Arrasou!' },
                                    { emoji: '😊', label: 'Gostei' },
                                    { emoji: '🤔', label: 'Interessante' },
                                    { emoji: '😕', label: 'Difícil' },
                                    { emoji: '😭', label: 'Muito difícil' },
                                    { emoji: '💪', label: 'Desafio aceito!' },
                                ];
                                return (
                                    <div key={activity.id} className="glass-card" style={{
                                        padding: '1.5rem',
                                        background: myGrade ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                                        borderLeft: myGrade ? '4px solid var(--success)' : '4px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{activity.titulo}</h4>
                                                <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0 }}>{activity.descricao || 'Sem descrição.'}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                {myGrade ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                                                        <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#4ade80' }}>{myGrade.valor} / {activity.nota_maxima}</span>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 'bold' }}>+ {myGrade.valor * 10} XP GANHOS</span>
                                                    </div>
                                                ) : (
                                                    <div style={{ opacity: 0.4, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <RefreshCw size={16} />
                                                        <span>Aguardando Avaliação</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {myGrade && (
                                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                                                <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.6rem' }}>Como você se sentiu nesta atividade?</p>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {EMOJIS.map(({ emoji, label }) => (
                                                        <button
                                                            key={emoji}
                                                            title={label}
                                                            onClick={async () => {
                                                                try { await sendEmojiReaction(activity.id, emoji); }
                                                                catch (e) { alert(e.message); }
                                                            }}
                                                            style={{
                                                                fontSize: '1.4rem',
                                                                background: myGrade.reacao_emoji === emoji ? 'rgba(255,232,31,0.2)' : 'rgba(255,255,255,0.05)',
                                                                border: myGrade.reacao_emoji === emoji ? '2px solid var(--primary)' : '2px solid transparent',
                                                                borderRadius: '10px',
                                                                padding: '0.3rem 0.6rem',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                transform: myGrade.reacao_emoji === emoji ? 'scale(1.2)' : 'scale(1)'
                                                            }}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {activities.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                                    <BookOpen size={40} style={{ marginBottom: '1rem' }} />
                                    <p>Nenhuma atividade encontrada.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'missoes' && (
                    <div>
                        <h3 style={{ marginBottom: '2rem' }}>Missões e Desafios</h3>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {missions?.map(m => (
                                <div key={m.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{m.titulo}</h4>
                                        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>{m.descricao}</p>
                                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', opacity: 0.6 }}>
                                            <span>🎁 Recompensa: {m.recompensa} XP</span>
                                            {m.prazo && <span>⏰ Prazo: {new Date(m.prazo).toLocaleString()}</span>}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {m.notas && m.notas.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                                                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--secondary)' }}>{m.notas[0].valor} / 10</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 'bold' }}>+ {Math.round(m.notas[0].valor * 3)} XP GANHOS</span>
                                            </div>
                                        ) : (
                                            <div style={{ opacity: 0.4, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <RefreshCw size={16} />
                                                <span>Aguardando Avaliação</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(!missions || missions.length === 0) && (
                                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                                    <Star size={40} style={{ marginBottom: '1rem' }} />
                                    <p>Nenhuma missão disponível no momento.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'mensagens' && (
                    <div>
                        <h3 style={{ marginBottom: '2rem' }}>Mural de Avisos da Guilda</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            {messages.map(m => (
                                <div
                                    key={m.id}
                                    className="glass-card"
                                    onClick={() => !m.lida && markMessageAsRead(m.id)}
                                    style={{
                                        cursor: m.lida ? 'default' : 'pointer',
                                        opacity: m.lida ? 0.7 : 1,
                                        padding: '1.5rem',
                                        background: m.tipo === 'decreto_supremo'
                                            ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.05))'
                                            : m.alunoId ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 232, 31, 0.05)',
                                        borderLeft: m.tipo === 'decreto_supremo'
                                            ? '6px solid gold'
                                            : m.alunoId ? '4px solid var(--secondary)' : '4px solid var(--primary)',
                                        boxShadow: m.tipo === 'decreto_supremo'
                                            ? '0 0 20px rgba(255, 215, 0, 0.3)'
                                            : 'none'
                                    }}>
                                    {m.tipo === 'decreto_supremo' && (
                                        <div style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            color: 'gold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginBottom: '0.8rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px'
                                        }}>
                                            ⚡ DECRETO SUPREMO ⚡
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: m.tipo === 'decreto_supremo' ? 'gold' : m.alunoId ? 'var(--secondary)' : 'var(--primary)' }}>
                                            {m.tipo === 'decreto_supremo' ? '👑 ADMINISTRAÇÃO SUPERIOR' : m.alunoId ? '👤 MENSAGEM INDIVIDUAL' : '📣 AVISO GERAL'}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(m.data_criacao).toLocaleString()}</span>
                                    </div>
                                    <p style={{ lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>{m.conteudo}</p>
                                    <div style={{ marginTop: '0.8rem', textAlign: 'right', fontSize: '0.75rem', opacity: 0.6 }}>
                                        — {m.administrador?.nome || m.professor?.nome || 'Seu Mestre'}
                                    </div>
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                                    <MessageSquare size={40} style={{ marginBottom: '1rem' }} />
                                    <p>Nenhum recado no mural ainda.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'ranking' && (
                    <div className="stock-market-board" style={{ marginTop: 0 }}>
                        <TechParticles />
                        <h3 style={{ marginBottom: '2rem', color: 'var(--primary)', fontFamily: "'Poller One', sans-serif", position: 'relative', zIndex: 2 }}>
                            Hall da Fama (Membros da Guilda)
                        </h3>
                        <div style={{ overflowX: 'auto', position: 'relative', zIndex: 2 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                                        <th style={{ padding: '1rem' }}>RANK</th>
                                        <th style={{ padding: '1rem' }}>AVENTUREIRO</th>
                                        <th style={{ padding: '1rem' }}>XP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleRanking.map((r, i) => {
                                        const actualRank = filteredRanking.findIndex(fr => fr.id === r.id) + 1;
                                        const isOutsideTop5 = i === 5 && r.id === user?.id;

                                        return (
                                            <React.Fragment key={r.id}>
                                                {isOutsideTop5 && (
                                                    <tr>
                                                        <td colSpan="3" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                                                            ...
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr style={{
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                    background: r.id === user?.id ? 'rgba(255, 232, 31, 0.05)' : 'transparent',
                                                    borderLeft: r.id === user?.id ? '4px solid var(--primary)' : '4px solid transparent'
                                                }}>
                                                    <td style={{ padding: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {actualRank}º
                                                        {r.posicao_anterior && (
                                                            <>
                                                                {actualRank < r.posicao_anterior ? (
                                                                    <TrendingUp size={16} color="var(--success)" title={`Subiu ${r.posicao_anterior - actualRank} posições`} />
                                                                ) : actualRank > r.posicao_anterior ? (
                                                                    <TrendingDown size={16} color="var(--danger)" title={`Caiu ${actualRank - r.posicao_anterior} posições`} />
                                                                ) : (
                                                                    <Minus size={16} color="var(--text-muted)" opacity={0.3} />
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)' }}>
                                                            {r.foto_url ? <img src={getFullImageUrl(r.foto_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={14} style={{ margin: '8px' }} />}
                                                        </div>
                                                        <span style={{ fontWeight: r.id === user?.id ? '900' : 'normal', color: r.id === user?.id ? 'var(--primary)' : 'inherit' }}>
                                                            {r.estado_humor && <span style={{ marginRight: '6px' }} title="Humor do dia">{r.estado_humor}</span>}
                                                            {r.nome} {r.id === user?.id && '(VOCÊ)'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: r.id === user?.id ? 'var(--primary)' : 'inherit' }}>{r.xp} XP</td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                    {filteredRanking.length === 0 && (
                                        <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Nenhum aventureiro encontrado na sua guilda ainda.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main >

            <footer style={{ marginTop: '3rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                <p>Desenvolvido pelo Professor Johnny Oliveira</p>
            </footer>

            {/* Modal do Scanner */}
            {showQRScanner && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
                }} onClick={() => setShowQRScanner(false)}>
                    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px', width: '100%', background: 'var(--bg-dark)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Escanear Código</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Aponte a câmera para o QR Code da sala.</p>
                        
                        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem', border: '2px solid var(--primary)' }}>
                            <Scanner 
                                onScan={(result) => {
                                    if (result && result.length > 0) {
                                        setJoinCode(result[0].rawValue.toUpperCase());
                                        setShowQRScanner(false);
                                    }
                                }}
                                onError={(error) => console.log(error)}
                            />
                        </div>

                        <button type="button" onClick={() => setShowQRScanner(false)} className="btn" style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.1)' }}>
                            CANCELAR
                        </button>
                    </div>
                </div>
            )}

            {showBoletim && user && (
                <BoletimAluno
                    alunoId={user.id}
                    token={token}
                    onClose={() => setShowBoletim(false)}
                />
            )}
        </div >
    );
};

export default DashboardStudent;
