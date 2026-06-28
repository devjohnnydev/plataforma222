import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from './DataContext';
import { ShieldAlert, Users, BookOpen, MessageSquare, Send, Award, UserPlus, LogOut, Search, Globe, RefreshCw, Key } from 'lucide-react';

const DashboardSuperAdmin = () => {
    const { user, logout, token, ranking, refreshAll } = useData();
    const [professores, setProfessores] = useState([]);
    const [turmas, setTurmas] = useState([]);
    const [tab, setTab] = useState('ranking');
    const [loading, setLoading] = useState(true);
    const [newProfessor, setNewProfessor] = useState({ nome: '', email: '', senha: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [professorFilter, setProfessorFilter] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || '/api';

    const authFetch = useCallback(async (url, options = {}) => {
        const headers = {
            ...options.headers,
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        };
        return fetch(url, { ...options, headers });
    }, [token]);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [resProfs, resTurmas] = await Promise.all([
                authFetch(`${API_URL}/admin/professores`).then(r => r.json()),
                authFetch(`${API_URL}/turmas`).then(r => r.json())
            ]);

            setProfessores(Array.isArray(resProfs) ? resProfs : []);
            setTurmas(Array.isArray(resTurmas) ? resTurmas : []);
            refreshAll(); // Refresh ranking from context
        } catch (e) {
            console.error('Fetch global data error:', e);
        } finally {
            setLoading(false);
        }
    }, [user, API_URL, authFetch, refreshAll]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddProfessor = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`${API_URL}/admin/professores`, {
                method: 'POST',
                body: JSON.stringify({
                    nome: newProfessor.nome?.trim(),
                    email: newProfessor.email?.trim().toLowerCase(),
                    senha: newProfessor.senha
                })
            });
            if (res.ok) {
                alert('Professor convocado com sucesso!');
                setNewProfessor({ nome: '', email: '', senha: '' });
                fetchData();
            } else {
                const err = await res.json();
                alert('Erro: ' + (err.error || 'Falha ao cadastrar'));
            }
        } catch (e) {
            alert('Erro de conexão ao cadastrar professor');
        }
    };

    const handleResetPassword = async (id) => {
        if (!window.confirm('Deseja resetar a senha deste professor para o padrão "senaisaopaulo"?')) return;
        try {
            const res = await authFetch(`${API_URL}/admin/professores/${id}/reset-senha`, {
                method: 'POST'
            });
            if (res.ok) {
                alert('Senha resetada com sucesso!');
                fetchData();
            }
        } catch (e) {
            alert('Erro ao resetar senha');
        }
    };

    const handleDeleteProfessor = async (id) => {
        if (!window.confirm('TEM CERTEZA? Isso excluirá o professor, TODAS as suas turmas e TODOS os seus alunos! (CASCATA OBRIGATÓRIA)')) return;
        try {
            const res = await authFetch(`${API_URL}/admin/professores/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert('Mestre banido com sucesso!');
                fetchData();
            }
        } catch (e) {
            alert('Erro ao excluir professor');
        }
    };

    const filteredRanking = useMemo(() => {
        return ranking.filter(s => {
            const matchesSearch = s.nome.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesProfessor = professorFilter === '' || s.professorNome === professorFilter;
            return matchesSearch && matchesProfessor;
        });
    }, [ranking, searchTerm, professorFilter]);

    const professorNames = useMemo(() => {
        const names = new Set();
        professores.forEach(p => names.add(p.nome));
        return Array.from(names).sort();
    }, [professores]);

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                    <h1 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '2.2rem' }}>
                        RANKING SENAI
                    </h1>
                    <p style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>Painel do Administrador: {user?.nome}</p>
                </div>
                <button onClick={logout} className="btn glass-card" style={{ color: '#ef4444' }}>
                    Sair <LogOut size={18} />
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--primary)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>MESTRES</p>
                    <h2 style={{ fontSize: '2.5rem' }}>{professores.length}</h2>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--secondary)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>TURMAS</p>
                    <h2 style={{ fontSize: '2.5rem' }}>{turmas.length}</h2>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--warning)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>ALUNOS GLOBAIS</p>
                    <h2 style={{ fontSize: '2.5rem' }}>{ranking.length}</h2>
                </div>
            </div>

            <nav style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button onClick={() => setTab('ranking')} className={`btn ${tab === 'ranking' ? 'btn-active' : 'btn-secondary-outline'}`}><Globe size={18} /> Hall da Fama</button>
                <button onClick={() => setTab('professores')} className={`btn ${tab === 'professores' ? 'btn-active' : 'btn-secondary-outline'}`}><Users size={18} /> Professores</button>
            </nav>

            <main className="glass-card" style={{ padding: '2rem' }}>
                {tab === 'ranking' && (
                    <div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                            <input
                                className="input-field"
                                placeholder="Buscar aluno..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <select
                                className="input-field"
                                value={professorFilter}
                                onChange={e => setProfessorFilter(e.target.value)}
                            >
                                <option value="">Todos os Professores</option>
                                {professorNames.map(name => (
                                    <option key={name} value={name} style={{ color: 'black' }}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="table-responsive-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ padding: '1rem' }}>POS</th>
                                    <th style={{ padding: '1rem' }}>ALUNO</th>
                                    <th style={{ padding: '1rem' }}>PROFESSOR RESPONSÁVEL</th>
                                    <th style={{ padding: '1rem' }}>XP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRanking.map((s, i) => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{i + 1}º</td>
                                        <td style={{ padding: '1rem' }}>{s.nome}</td>
                                        <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}>{s.professorNome}</td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{s.xp} XP</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                )}

                {tab === 'professores' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1.5rem' }}>Novo Professor</h3>
                            <form onSubmit={handleAddProfessor} style={{ display: 'grid', gap: '1rem' }}>
                                <input className="input-field" placeholder="Nome" value={newProfessor.nome} onChange={e => setNewProfessor({ ...newProfessor, nome: e.target.value })} required />
                                <input className="input-field" placeholder="E-mail" type="email" value={newProfessor.email} onChange={e => setNewProfessor({ ...newProfessor, email: e.target.value })} required />
                                <input className="input-field" placeholder="Senha (vazio para padrão)" type="password" value={newProfessor.senha} onChange={e => setNewProfessor({ ...newProfessor, senha: e.target.value })} />
                                <button className="btn btn-primary" type="submit">CADASTRAR</button>
                            </form>
                        </div>
                        <div>
                            <h3 style={{ marginBottom: '1.5rem' }}>Célula de Mestres</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {professores.map(p => (
                                    <div key={p.id} className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <p style={{ fontWeight: 'bold' }}>{p.nome}</p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.email}</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 'bold' }}>Code: {p.codigo_turma}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => handleResetPassword(p.id)} className="btn" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)' }} title="Resetar Senha"><Key size={16} /></button>
                                            <button onClick={() => handleDeleteProfessor(p.id)} className="btn" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} title="Excluir"><ShieldAlert size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DashboardSuperAdmin;
