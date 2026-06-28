import React, { useState, useEffect, useCallback } from 'react';
import { X, Printer, Trophy, Star, BookOpen, Target, Award, User, Calendar, TrendingUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const BoletimAluno = ({ alunoId, token, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBoletim = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/aluno/${alunoId}/boletim`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Falha ao carregar boletim');
            setData(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [alunoId, token]);

    useEffect(() => { fetchBoletim(); }, [fetchBoletim]);

    const handlePrint = () => window.print();

    const getGradeColor = (valor, maxima) => {
        const pct = valor / maxima;
        if (pct >= 0.8) return '#4ade80';
        if (pct >= 0.6) return '#facc15';
        return '#f87171';
    };

    const getGradeBg = (valor, maxima) => {
        const pct = valor / maxima;
        if (pct >= 0.8) return 'rgba(74,222,128,0.12)';
        if (pct >= 0.6) return 'rgba(250,204,21,0.12)';
        return 'rgba(248,113,113,0.12)';
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    const fmtXP = (n) => n?.toLocaleString('pt-BR') ?? '0';

    if (loading) return (
        <div style={overlayStyle}>
            <div style={cardStyle}>
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(255,232,31,0.3)', borderTop: '3px solid #ffe81f', borderRadius: '50%', margin: '0 auto 1rem' }} />
                    <p style={{ color: '#aaa' }}>Gerando boletim...</p>
                </div>
            </div>
        </div>
    );

    if (error) return (
        <div style={overlayStyle}>
            <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>
                <button onClick={onClose} className="btn">Fechar</button>
            </div>
        </div>
    );

    if (!data) return null;
    const { aluno, turma, professor, stats, atividades, missoes } = data;

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

    const getMediaGeral = () => {
        const gradedAtividades = atividades.filter(a => a.nota !== null);
        const gradedMissoes = missoes.filter(m => m.nota !== null);
        
        const totalItems = gradedAtividades.length + gradedMissoes.length;
        if (totalItems === 0) return '—';
        
        const sumAtividades = gradedAtividades.reduce((acc, a) => {
            const max = a.nota_maxima || 10;
            return acc + ((a.nota.valor / max) * 10);
        }, 0);
        
        const sumMissoes = gradedMissoes.reduce((acc, m) => acc + m.nota.valor, 0);
        
        const media = (sumAtividades + sumMissoes) / totalItems;
        return media.toFixed(1);
    };

    const getMediaColor = (mediaVal) => {
        if (mediaVal === '—') return '#aaa';
        const num = parseFloat(mediaVal);
        if (num >= 8.0) return '#4ade80';
        if (num >= 6.0) return '#facc15';
        return '#f87171';
    };

    const mediaGeral = getMediaGeral();

    return (
        <div className="boletim-overlay" style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={cardStyle} id="boletim-print-area">
                {/* ── HEADER ── */}
                <div style={headerStyle}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', letterSpacing: '3px', color: '#ffe81f', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                            SENAI · Sistema de Ranking de Guildas
                        </div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: 0 }}>BOLETIM ESCOLAR</h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                            Gerado em {fmtDate(data.gerado_em)} · Documento Oficial
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                        <button 
                            onClick={onClose} 
                            className="no-print"
                            style={{ 
                                background: '#ef4444', 
                                color: '#fff', 
                                border: 'none', 
                                borderRadius: '8px', 
                                padding: '0.6rem 1.2rem', 
                                fontWeight: 'bold', 
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#dc2626';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ef4444';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Fechar
                        </button>
                        <button 
                            onClick={handlePrint} 
                            className="no-print"
                            style={{ 
                                background: '#10b981', 
                                color: '#fff', 
                                border: 'none', 
                                borderRadius: '8px', 
                                padding: '0.6rem 1.2rem', 
                                fontWeight: 'bold', 
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#059669';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#10b981';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Imprimir
                        </button>
                    </div>
                </div>

                {/* ── STUDENT INFO ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {/* Student card */}
                    <div style={sectionStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '3px solid #ffe81f', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                                {aluno.foto_url
                                    ? <img src={getFullImageUrl(aluno.foto_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={aluno.nome} />
                                    : <User size={32} style={{ margin: 16, color: '#aaa' }} />}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#ffe81f', letterSpacing: '2px', textTransform: 'uppercase' }}>Aventureiro</div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', margin: '0.1rem 0' }}>{aluno.nome}</h2>
                                <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{aluno.email || '—'}</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            <InfoBadge label="Guilda" value={turma?.nome || '—'} />
                            <InfoBadge label="Matéria" value={turma?.materia || '—'} />
                            <InfoBadge label="Mestre" value={professor?.nome || '—'} />
                            <InfoBadge label="Membro desde" value={fmtDate(aluno.data_criacao)} />
                        </div>
                    </div>

                    {/* Stats card */}
                    <div style={sectionStyle}>
                        <div style={{ fontSize: '0.7rem', color: '#ffe81f', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>Performance Geral</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                            <StatBlock icon={<Trophy size={20} color="#ffe81f" />} label="XP Total" value={`${fmtXP(stats.totalXP)} XP`} color="#ffe81f" />
                            <StatBlock icon={<Award size={20} color="#a78bfa" />} label="Nível" value={`LVL ${stats.nivel}`} color="#a78bfa" />
                            <StatBlock icon={<TrendingUp size={20} color="#4ade80" />} label="Rank na Guilda" value={stats.rankPosition > 0 ? (stats.rankPosition <= 5 ? `${stats.rankPosition}º / ${stats.totalStudents}` : '—') : '—'} color="#4ade80" />
                            <StatBlock icon={<Star size={20} color="#f59e0b" />} label="Portal Diário" value={`${stats.xpPortal} pts`} color="#f59e0b" />
                            
                            <div style={{ gridColumn: 'span 2' }}>
                                <StatBlock icon={<BookOpen size={20} color={getMediaColor(mediaGeral)} />} label="Média Geral (Tarefas + Missões)" value={mediaGeral !== '—' ? `${mediaGeral} / 10` : '—'} color={getMediaColor(mediaGeral)} />
                            </div>
                        </div>
                        <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>XP Atividades: <strong style={{ color: '#4ade80' }}>{fmtXP(stats.xpAtividades)}</strong></span>
                            <span>XP Missões: <strong style={{ color: '#60a5fa' }}>{fmtXP(stats.xpMissoes)}</strong></span>
                            <span>XP Portal: <strong style={{ color: '#f59e0b' }}>{fmtXP(stats.xpPortal)}</strong></span>
                        </div>
                    </div>
                </div>

                {/* ── PROFESSOR CARD ── */}
                {professor && (
                    <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.5rem' }}>
                        <div style={{ width: 50, height: 50, borderRadius: '50%', overflow: 'hidden', border: '2px solid #6366f1', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
                            {professor.foto_url
                                ? <img src={getFullImageUrl(professor.foto_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={professor.nome} />
                                : <User size={24} style={{ margin: 13, color: '#aaa' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.65rem', color: '#6366f1', letterSpacing: '2px', textTransform: 'uppercase' }}>Professor Responsável</div>
                            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '1rem' }}>{professor.nome}</div>
                            {professor.mensagem_incentivo && (
                                <div style={{ fontStyle: 'italic', color: '#ffe81f', fontSize: '0.8rem', marginTop: '0.2rem' }}>"{professor.mensagem_incentivo}"</div>
                            )}
                        </div>
                        {turma?.codigo && (
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.65rem', color: '#aaa', letterSpacing: '1px' }}>CÓDIGO DA GUILDA</div>
                                <div style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '3px', color: '#f59e0b' }}>{turma.codigo}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── ACTIVITIES TABLE ── */}
                <div style={{ ...sectionStyle, marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                        <BookOpen size={18} color="#4ade80" />
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Atividades e Notas</h3>
                        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#aaa' }}>
                            {atividades.filter(a => a.nota).length} / {atividades.length} avaliadas
                        </span>
                    </div>
                    {atividades.length === 0
                        ? <p style={{ color: '#aaa', fontSize: '0.85rem' }}>Nenhuma atividade lançada ainda.</p>
                        : (
                            <div className="table-responsive-container">
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#aaa', textAlign: 'left' }}>
                                        <th style={{ padding: '0.6rem 0.8rem' }}>Atividade</th>
                                        <th style={{ padding: '0.6rem 0.8rem' }}>Data</th>
                                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>Nota Máx.</th>
                                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>Nota</th>
                                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>XP</th>
                                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {atividades.map(a => (
                                        <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: a.nota ? getGradeBg(a.nota.valor, a.nota_maxima) : 'transparent' }}>
                                            <td style={{ padding: '0.7rem 0.8rem', fontWeight: a.nota ? '600' : 'normal', color: '#fff' }}>
                                                {a.titulo}
                                                {a.nota?.reacao_emoji && <span style={{ marginLeft: 6 }}>{a.nota.reacao_emoji}</span>}
                                            </td>
                                            <td style={{ padding: '0.7rem 0.8rem', color: '#aaa', fontSize: '0.75rem' }}>{fmtDate(a.nota?.data_avaliacao || a.data_criacao)}</td>
                                            <td style={{ padding: '0.7rem 0.8rem', textAlign: 'center', color: '#aaa' }}>{a.nota_maxima}</td>
                                            <td style={{ padding: '0.7rem 0.8rem', textAlign: 'center', fontWeight: 'bold', color: a.nota ? getGradeColor(a.nota.valor, a.nota_maxima) : '#aaa' }}>
                                                {a.nota ? a.nota.valor : '—'}
                                            </td>
                                            <td style={{ padding: '0.7rem 0.8rem', textAlign: 'center', color: '#f59e0b', fontSize: '0.8rem' }}>
                                                {a.nota ? `+${(a.nota.valor * 10).toFixed(0)}` : '—'}
                                            </td>
                                            <td style={{ padding: '0.7rem 0.8rem', textAlign: 'center' }}>
                                                {a.nota
                                                    ? <span style={{ background: getGradeBg(a.nota.valor, a.nota_maxima), color: getGradeColor(a.nota.valor, a.nota_maxima), padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                        {a.nota.valor / a.nota_maxima >= 0.8 ? 'Ótimo' : a.nota.valor / a.nota_maxima >= 0.6 ? 'Bom' : 'Recuperar'}
                                                    </span>
                                                    : <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>Pendente</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                        <td colSpan={4} style={{ padding: '0.8rem', color: '#aaa', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }}>Total XP por Atividades:</td>
                                        <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 900, color: '#4ade80' }}>{fmtXP(stats.xpAtividades)} XP</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                            </div>
                        )}
                </div>

                {/* ── MISSIONS TABLE ── */}
                {missoes.length > 0 && (
                    <div style={{ ...sectionStyle, marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                            <Target size={18} color="#60a5fa" />
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Missões e Desafios</h3>
                            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#aaa' }}>
                                {missoes.filter(m => m.nota).length} / {missoes.length} concluídas
                            </span>
                        </div>
                        <div className="table-responsive-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#aaa', textAlign: 'left' }}>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>Missão</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>Prazo</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>Recompensa</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>Nota</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>XP</th>
                                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {missoes.map(m => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: m.nota ? 'rgba(96,165,250,0.07)' : 'transparent' }}>
                                        <td style={{ padding: '0.7rem 0.8rem', color: '#fff', fontWeight: m.nota ? '600' : 'normal' }}>
                                            <div>{m.titulo}</div>
                                            {m.descricao && <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: 2 }}>{m.descricao}</div>}
                                        </td>
                                        <td style={{ padding: '0.7rem 0.8rem', color: '#aaa', fontSize: '0.75rem' }}>{fmtDate(m.prazo)}</td>
                                        <td style={{ padding: '0.7rem 0.8rem', textAlign: 'center', color: '#f59e0b' }}>{m.recompensa} pts</td>
                                        <td style={{ padding: '0.7rem 0.8rem', textAlign: 'center', fontWeight: 'bold', color: m.nota ? '#60a5fa' : '#aaa' }}>{m.nota ? m.nota.valor : '—'}</td>
                                        <td style={{ padding: '0.7rem 0.8rem', textAlign: 'center', color: '#f59e0b', fontSize: '0.8rem' }}>
                                            {m.nota ? `+${(m.nota.valor * 3).toFixed(0)}` : '—'}
                                        </td>
                                        <td style={{ padding: '0.7rem 0.8rem', textAlign: 'center' }}>
                                            {m.nota
                                                ? <span style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 'bold' }}>Concluída</span>
                                                : <span style={{ color: '#aaa', fontSize: '0.7rem' }}>Pendente</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                    <td colSpan={4} style={{ padding: '0.8rem', color: '#aaa', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }}>Total XP por Missões:</td>
                                    <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 900, color: '#60a5fa' }}>{fmtXP(stats.xpMissoes)} XP</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                        </div>
                    </div>
                )}

                {/* ── PORTAL DAILY ── */}
                <div style={{ ...sectionStyle, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(251,191,36,0.1)', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Star size={20} color="#f59e0b" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#f59e0b', letterSpacing: '2px', textTransform: 'uppercase' }}>Portal Diário de Desafios</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>{stats.xpPortal} pontos acumulados</div>
                        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Desafios diários completados ao longo do período</div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: '#aaa' }}>Contribuição ao XP Total</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f59e0b' }}>{stats.totalXP > 0 ? ((stats.xpPortal / stats.totalXP) * 100).toFixed(1) : 0}%</div>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                    <span>SENAI · Boletim Digital · Sistema de Ranking de Guildas</span>
                    <span>Desenvolvido por Professor Johnny Oliveira</span>
                    <span>Gerado em {new Date().toLocaleString('pt-BR')}</span>
                </div>
            </div>

            <style>{`
                @media print {
                    /* Hide the dashboard content entirely behind the modal during print */
                    .container > *:not(.boletim-overlay) {
                        display: none !important;
                    }

                    /* Reset the fixed overlay container to regular block flow so it can stretch multi-page */
                    .boletim-overlay {
                        position: static !important;
                        inset: auto !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: transparent !important;
                        padding: 0 !important;
                        display: block !important;
                    }

                    /* Hide everything else under body */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Render overlay container and bulletin card visible */
                    .boletim-overlay, #boletim-print-area, #boletim-print-area * {
                        visibility: visible !important;
                    }
                    /* Place the bulletin card perfectly flowing on the printing pages */
                    #boletim-print-area {
                        position: static !important;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0.5cm !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }

                    /* General element colors for high contrast black-on-white print */
                    #boletim-print-area h1,
                    #boletim-print-area h2,
                    #boletim-print-area h3,
                    #boletim-print-area p,
                    #boletim-print-area div,
                    #boletim-print-area span,
                    #boletim-print-area td,
                    #boletim-print-area th,
                    #boletim-print-area strong {
                        color: #000000 !important;
                        text-shadow: none !important;
                        background: transparent !important;
                    }

                    #boletim-print-area svg {
                        stroke: #000000 !important;
                        fill: none !important;
                    }

                    #boletim-print-area svg path,
                    #boletim-print-area svg circle,
                    #boletim-print-area svg line,
                    #boletim-print-area svg polyline,
                    #boletim-print-area svg rect,
                    #boletim-print-area svg polygon {
                        stroke: #000000 !important;
                    }

                    /* Style card sections with simple elegant borders and zero heavy black ink backgrounds */
                    #boletim-print-area div[style*="background"],
                    #boletim-print-area .sectionStyle {
                        background: #ffffff !important;
                        border: 1px solid #cccccc !important;
                        border-radius: 10px !important;
                        padding: 0.8rem !important;
                        margin-bottom: 0.8rem !important;
                    }

                    /* Tables styling in print to look like standard sulfite academic reports */
                    #boletim-print-area table {
                        border-collapse: collapse !important;
                        width: 100% !important;
                    }
                    #boletim-print-area tr {
                        background: transparent !important;
                        border-bottom: 1px solid #dddddd !important;
                    }
                    #boletim-print-area th {
                        color: #000000 !important;
                        border-bottom: 2px solid #000000 !important;
                        padding: 0.4rem 0.6rem !important;
                        font-size: 0.75rem !important;
                        font-weight: bold !important;
                    }
                    #boletim-print-area td {
                        color: #111111 !important;
                        padding: 0.4rem 0.6rem !important;
                        font-size: 0.75rem !important;
                        border-bottom: 1px solid #eeeeee !important;
                    }

                    /* Convert active status tags to clean text tags */
                    #boletim-print-area span[style*="background"] {
                        background: #f3f4f6 !important;
                        color: #000000 !important;
                        border: 1px solid #bbbbbb !important;
                        padding: 1px 8px !important;
                        border-radius: 4px !important;
                    }

                    /* Clean grid gaps for compact height */
                    #boletim-print-area div[style*="gridTemplateColumns"] {
                        gap: 0.6rem !important;
                        margin-bottom: 0.6rem !important;
                    }

                    /* Hide elements explicitly marked as no-print */
                    .no-print {
                        display: none !important;
                    }

                    @page {
                        size: A4 portrait;
                        margin: 1.2cm 1cm;
                    }
                }
            `}</style>
        </div>
    );
};

const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    zIndex: 99999, padding: '1rem', overflowY: 'auto'
};

const cardStyle = {
    background: 'linear-gradient(135deg, rgba(20,20,35,0.98) 0%, rgba(10,10,25,0.99) 100%)',
    border: '1px solid rgba(255,232,31,0.15)', borderRadius: '20px',
    padding: '2rem', width: '100%', maxWidth: '900px',
    boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,232,31,0.05)',
    marginTop: '1rem', marginBottom: '1rem'
};

const headerStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '1.5rem', paddingBottom: '1.5rem',
    borderBottom: '2px solid rgba(255,232,31,0.2)',
    background: 'linear-gradient(135deg, rgba(255,232,31,0.04) 0%, transparent 60%)',
    borderRadius: '12px 12px 0 0', margin: '-2rem -2rem 1.5rem -2rem', padding: '2rem',
    flexWrap: 'wrap', gap: '1rem'
};

const sectionStyle = {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', padding: '1.2rem'
};

const InfoBadge = ({ label, value }) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
        <div style={{ fontSize: '0.6rem', color: '#ffe81f', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</div>
        <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600' }}>{value}</div>
    </div>
);

const StatBlock = ({ icon, label, value, color }) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '0.6rem', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color }}>{value}</div>
        </div>
    </div>
);

export default BoletimAluno;
