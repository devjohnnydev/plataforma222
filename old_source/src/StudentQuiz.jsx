import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Hourglass, Trophy, Shield, Volume2, VolumeX, Zap } from 'lucide-react';

const playSynthSound = (type, muted) => {
    if (muted) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } else if (type === 'success') {
            const notes = [261.63, 329.63, 392.00, 523.25];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
                gain.gain.setValueAtTime(0.03, ctx.currentTime + idx * 0.07);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.18);
                osc.start(ctx.currentTime + idx * 0.07);
                osc.stop(ctx.currentTime + idx * 0.07 + 0.18);
            });
        } else if (type === 'gameover') {
            const notes = [392.00, 329.63, 261.63, 196.00];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
                gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.3);
                osc.start(ctx.currentTime + idx * 0.12);
                osc.stop(ctx.currentTime + idx * 0.12 + 0.3);
            });
        }
    } catch (e) {
        console.warn('Audio Context error:', e);
    }
};

const StudentQuiz = ({ token, API_URL, onQuizCompleted }) => {
    const [portalState, setPortalState] = useState(() => {
        const todayStr = new Date().toDateString();
        const lastAttemptDate = localStorage.getItem('portalLastAttemptDate');
        if (lastAttemptDate === todayStr) {
            return 'ATTEMPTED';
        }
        return 'CLOSED'; // Cover start screen
    });

    const [muted, setMuted] = useState(() => {
        const saved = localStorage.getItem('eduGameMuted');
        return saved ? saved === 'true' : false;
    });

    const [quizQuestions, setQuizQuestions] = useState([]);
    const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState([]);
    const [quizTimeLeft, setQuizTimeLeft] = useState(15);
    const [quizResult, setQuizResult] = useState(null);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizFeedback, setQuizFeedback] = useState(null);
    const [quizError, setQuizError] = useState('');

    // Timer regressivo
    useEffect(() => {
        let interval = null;
        if (portalState === 'PLAYING' && !quizFeedback) {
            interval = setInterval(() => {
                setQuizTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleQuizAnswer(-1);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [portalState, quizCurrentIndex, quizFeedback]);

    const toggleMute = () => {
        setMuted(prev => {
            const next = !prev;
            localStorage.setItem('eduGameMuted', String(next));
            playSynthSound('click', next);
            return next;
        });
    };

    const startQuiz = async () => {
        setQuizLoading(true);
        setQuizError('');
        setPortalState('LOADING_QUIZ');

        try {
            const response = await fetch(`${API_URL}/quiz/gerar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Erro ao gerar quiz');
            }

            const data = await response.json();

            if (!data.questions || data.questions.length === 0) {
                throw new Error('Nenhuma pergunta gerada');
            }

            setQuizQuestions(data.questions);
            setQuizAnswers(new Array(data.questions.length).fill(null));
            setQuizCurrentIndex(0);
            setQuizTimeLeft(15);
            setQuizFeedback(null);
            setQuizResult(null);
            setPortalState('PLAYING');
        } catch (err) {
            console.error('Quiz generation error:', err);
            setQuizError(err.message || 'Erro ao gerar quiz');
            setPortalState('CLOSED');
        } finally {
            setQuizLoading(false);
        }
    };

    const handleQuizAnswer = (answerIndex) => {
        if (quizFeedback) return;

        playSynthSound(answerIndex >= 0 ? 'click' : 'gameover', muted);

        const newAnswers = [...quizAnswers];
        newAnswers[quizCurrentIndex] = answerIndex;
        setQuizAnswers(newAnswers);
        setQuizFeedback({ selected: answerIndex });

        setTimeout(() => {
            setQuizFeedback(null);

            if (quizCurrentIndex < quizQuestions.length - 1) {
                setQuizCurrentIndex(prev => prev + 1);
                setQuizTimeLeft(15);
            } else {
                submitQuizAnswers(newAnswers);
            }
        }, 800);
    };

    const submitQuizAnswers = async (answers) => {
        setPortalState('LOADING_QUIZ');
        setQuizLoading(true);

        try {
            const response = await fetch(`${API_URL}/quiz/responder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ respostas: answers })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Erro ao enviar respostas');
            }

            const result = await response.json();

            const todayStr = new Date().toDateString();
            localStorage.setItem('portalLastAttemptDate', todayStr);
            localStorage.setItem('portalAttemptScore', String(result.points));
            localStorage.setItem('portalAttemptResult', result.points > 0 ? 'SUCCESS' : 'FAILED');

            playSynthSound(result.points > 0 ? 'success' : 'gameover', muted);
            setQuizResult(result);
            setPortalState('RESULT');

            if (onQuizCompleted) {
                onQuizCompleted(result);
            }
        } catch (err) {
            console.error('Quiz submit error:', err);
            setQuizError(err.message || 'Erro ao enviar respostas');
            setPortalState('CLOSED');
        } finally {
            setQuizLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <AnimatePresence mode="wait">
                {portalState === 'CLOSED' ? (
                    <motion.div 
                        key="cover-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                        className="glass-card" 
                        style={{ padding: '2.5rem', width: '100%', maxWidth: '460px', textAlign: 'center', border: '1px solid rgba(255, 232, 31, 0.1)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                            <button 
                                onClick={toggleMute}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
                            >
                                {muted ? <VolumeX size={20} /> : <Volume2 size={20} style={{ color: 'var(--primary)' }} />}
                            </button>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '2rem', color: 'var(--primary)', textShadow: '0 0 12px rgba(255, 232, 31, 0.4)', fontWeight: '900', marginBottom: '0.2rem' }}>
                                DESAFIO DIÁRIO
                            </h2>
                            <p style={{ color: '#aaa', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
                                Quiz com Inteligência Artificial
                            </p>
                        </div>

                        <div style={{
                            margin: '1.5rem 0', padding: '1.5rem', background: 'rgba(0,0,0,0.5)', borderRadius: '16px',
                            border: '1px solid rgba(255, 232, 31, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem'
                        }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255, 232, 31, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--primary)' }}>
                                <HelpCircle size={28} style={{ color: 'var(--primary)' }} />
                            </div>
                            <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: 0, fontWeight: 'bold' }}>Quiz Diário</h3>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                                Responda <strong>10 questões</strong> sobre o conteúdo das missões e atividades do seu curso! Você tem <strong>15 segundos</strong> por pergunta.
                            </p>
                        </div>

                        {quizError && (
                            <div style={{ 
                                margin: '0 0 1rem 0', padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', 
                                borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: 'var(--danger)', fontSize: '0.8rem' 
                            }}>
                                ⚠️ {quizError}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                playSynthSound('click', muted);
                                startQuiz();
                            }}
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '1rem', gap: '0.5rem', fontSize: '0.95rem' }}
                            disabled={quizLoading}
                        >
                            <Zap size={18} />
                            {quizLoading ? 'GERANDO QUIZ...' : 'INICIAR QUIZ'}
                        </button>
                    </motion.div>
                ) : portalState === 'LOADING_QUIZ' ? (
                    <motion.div 
                        key="loading-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                        className="glass-card" 
                        style={{ padding: '3rem', width: '100%', maxWidth: '460px', textAlign: 'center' }}
                    >
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>
                                🧠 Preparando Quiz...
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                                A IA está gerando perguntas baseadas no conteúdo do seu curso
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                style={{
                                    width: '60px', height: '60px', borderRadius: '50%',
                                    border: '3px solid rgba(255,255,255,0.1)',
                                    borderTopColor: 'var(--primary)',
                                    borderRightColor: 'rgba(99, 102, 241, 0.6)'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                                    style={{
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: 'var(--primary)'
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>
                ) : portalState === 'PLAYING' && quizQuestions.length > 0 ? (
                    <motion.div 
                        key="quiz-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                        className="glass-card" 
                        style={{ padding: '2rem', width: '100%', maxWidth: '500px', textAlign: 'center', position: 'relative' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <button 
                                onClick={toggleMute}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
                            >
                                {muted ? <VolumeX size={18} /> : <Volume2 size={18} style={{ color: 'var(--primary)' }} />}
                            </button>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <HelpCircle size={14} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 'bold' }}>
                                    Questão {quizCurrentIndex + 1} / {quizQuestions.length}
                                </span>
                            </div>
                        </div>

                        <div style={{ 
                            width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', 
                            borderRadius: '3px', marginBottom: '1rem', overflow: 'hidden' 
                        }}>
                            <motion.div 
                                animate={{ width: `${((quizCurrentIndex) / quizQuestions.length) * 100}%` }}
                                transition={{ duration: 0.3 }}
                                style={{ 
                                    height: '100%', borderRadius: '3px',
                                    background: 'linear-gradient(90deg, var(--primary), #6366f1)' 
                                }} 
                            />
                        </div>

                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            margin: '0 auto 1rem auto', padding: '6px 16px',
                            background: quizTimeLeft <= 5 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 232, 31, 0.05)',
                            borderRadius: '20px', 
                            border: quizTimeLeft <= 5 ? '1px solid var(--danger)' : '1px solid rgba(255, 232, 31, 0.2)',
                            width: 'fit-content',
                            boxShadow: quizTimeLeft <= 5 ? '0 0 12px rgba(239, 68, 68, 0.2)' : 'none',
                        }}>
                            <Hourglass size={14} style={{ color: quizTimeLeft <= 5 ? 'var(--danger)' : 'var(--primary)' }} />
                            <span style={{
                                fontSize: '1.15rem', fontWeight: 'bold',
                                color: quizTimeLeft <= 5 ? 'var(--danger)' : 'var(--primary)',
                                fontFamily: 'monospace'
                            }}>
                                {quizTimeLeft}s
                            </span>

                            <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                <motion.div
                                    key={quizCurrentIndex}
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: 15, ease: 'linear' }}
                                    style={{
                                        height: '100%', borderRadius: '2px',
                                        background: quizTimeLeft <= 5 ? 'var(--danger)' : 'var(--primary)'
                                    }}
                                />
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={quizCurrentIndex}
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.25 }}
                            >
                                <div style={{
                                    margin: '0 0 1.2rem 0', padding: '1.2rem', background: 'rgba(0,0,0,0.4)', borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left'
                                }}>
                                    <p style={{ color: '#fff', fontSize: '0.95rem', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>
                                        {quizQuestions[quizCurrentIndex]?.pergunta}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {quizQuestions[quizCurrentIndex]?.alternativas.map((alt, idx) => {
                                        const isSelected = quizFeedback?.selected === idx;
                                        const isTimeout = quizFeedback?.selected === -1;
                                        
                                        return (
                                            <motion.button
                                                key={idx}
                                                whileHover={!quizFeedback ? { scale: 1.02 } : {}}
                                                whileTap={!quizFeedback ? { scale: 0.98 } : {}}
                                                onClick={() => handleQuizAnswer(idx)}
                                                disabled={!!quizFeedback}
                                                style={{
                                                    width: '100%', textAlign: 'left', padding: '0.9rem 1rem',
                                                    background: isSelected 
                                                        ? 'rgba(99, 102, 241, 0.25)' 
                                                        : isTimeout 
                                                            ? 'rgba(239, 68, 68, 0.08)'
                                                            : 'rgba(255,255,255,0.04)',
                                                    border: isSelected 
                                                        ? '1px solid rgba(99, 102, 241, 0.6)' 
                                                        : '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '12px', cursor: quizFeedback ? 'default' : 'pointer',
                                                    color: isSelected ? '#fff' : 'rgba(255,255,255,0.85)',
                                                    fontSize: '0.85rem', fontWeight: isSelected ? 'bold' : 'normal',
                                                    transition: 'all 0.2s',
                                                    boxShadow: isSelected ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none',
                                                    opacity: quizFeedback && !isSelected ? 0.5 : 1
                                                }}
                                            >
                                                {alt}
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                {quizFeedback?.selected === -1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            marginTop: '0.8rem', padding: '0.6rem', background: 'rgba(239, 68, 68, 0.1)',
                                            borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)',
                                            color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 'bold'
                                        }}
                                    >
                                        ⏰ Tempo esgotado!
                                    </motion.div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                ) : portalState === 'RESULT' && quizResult ? (
                    <motion.div 
                        key="result-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className="glass-card" 
                        style={{ padding: '2rem', width: '100%', maxWidth: '500px', textAlign: 'center', maxHeight: '80vh', overflowY: 'auto' }}
                    >
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', textShadow: '0 0 12px rgba(255, 232, 31, 0.4)', fontWeight: '900', marginBottom: '0.2rem' }}>
                                RESULTADO
                            </h2>
                            <p style={{ color: '#aaa', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
                                Quiz Diário
                            </p>
                        </div>

                        <div style={{
                            margin: '1rem 0', padding: '1.5rem', background: 'rgba(0,0,0,0.5)', borderRadius: '20px',
                            border: quizResult.points > 0 
                                ? '1px solid rgba(74, 222, 128, 0.3)' 
                                : '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: quizResult.points > 0
                                ? '0 0 20px rgba(74, 222, 128, 0.1)'
                                : '0 0 20px rgba(239, 68, 68, 0.1)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem'
                        }}>
                            <div style={{ 
                                width: '64px', height: '64px', borderRadius: '50%', 
                                background: quizResult.points > 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                border: `2px solid ${quizResult.points > 0 ? 'var(--success)' : 'var(--danger)'}`,
                                boxShadow: `0 0 15px ${quizResult.points > 0 ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
                            }}>
                                {quizResult.points > 0 
                                    ? <Trophy size={32} style={{ color: 'var(--success)' }} /> 
                                    : <Shield size={32} style={{ color: 'var(--danger)' }} />
                                }
                            </div>

                            <h3 style={{ color: quizResult.points > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>
                                {quizResult.points >= 4 ? 'Excelente!' : quizResult.points >= 2 ? 'Bom Trabalho!' : quizResult.points > 0 ? 'Continue Tentando!' : 'Não desista!'}
                            </h3>

                            <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', textShadow: '0 0 10px rgba(255, 232, 31, 0.4)', margin: '5px 0' }}>
                                {quizResult.acertos} / {quizResult.total} Acertos
                            </div>

                            <div style={{ 
                                fontSize: '1.2rem', fontWeight: 'bold', 
                                color: quizResult.points > 0 ? 'var(--success)' : 'var(--danger)',
                                background: quizResult.points > 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                padding: '6px 16px', borderRadius: '20px'
                            }}>
                                +{quizResult.points} pontos para o ranking
                            </div>
                        </div>

                        <div style={{ margin: '1rem 0', textAlign: 'left' }}>
                            <h4 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>
                                Detalhamento das Questões
                            </h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {quizResult.detalhes?.map((d, idx) => (
                                    <div key={idx} style={{
                                        padding: '0.7rem 0.9rem', borderRadius: '10px',
                                        background: d.correto ? 'rgba(74, 222, 128, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                                        border: `1px solid ${d.correto ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                        display: 'flex', alignItems: 'flex-start', gap: '0.6rem'
                                    }}>
                                        <span style={{ 
                                            fontSize: '1rem', minWidth: '22px', 
                                            color: d.correto ? 'var(--success)' : 'var(--danger)' 
                                        }}>
                                            {d.correto ? '✅' : '❌'}
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', margin: '0 0 4px 0', lineHeight: '1.4' }}>
                                                {idx + 1}. {d.pergunta}
                                            </p>
                                            {!d.correto && d.alternativas && d.respostaCorreta >= 0 && (
                                                <p style={{ color: 'var(--success)', fontSize: '0.72rem', margin: 0, fontWeight: 'bold' }}>
                                                    Resposta: {d.alternativas[d.respostaCorreta]}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ) : portalState === 'ATTEMPTED' ? (
                    <motion.div 
                        key="attempted-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className="glass-card" 
                        style={{ padding: '2.5rem', width: '100%', maxWidth: '460px', textAlign: 'center' }}
                    >
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '2rem', color: 'var(--primary)', textShadow: '0 0 12px rgba(255, 232, 31, 0.4)', fontWeight: '900', marginBottom: '0.2rem' }}>
                                DESAFIO DIÁRIO
                            </h2>
                            <p style={{ color: '#aaa', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
                                Quiz com Inteligência Artificial
                            </p>
                        </div>

                        <div style={{
                            margin: '1.5rem 0', padding: '2rem 1.5rem', background: 'rgba(0,0,0,0.5)', borderRadius: '20px',
                            border: localStorage.getItem('portalAttemptResult') === 'SUCCESS' 
                                ? '1px solid rgba(74, 222, 128, 0.3)' 
                                : '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: localStorage.getItem('portalAttemptResult') === 'SUCCESS'
                                ? '0 0 20px rgba(74, 222, 128, 0.1)'
                                : '0 0 20px rgba(239, 68, 68, 0.1)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem'
                        }}>
                            {localStorage.getItem('portalAttemptResult') === 'SUCCESS' ? (
                                <>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--success)', boxShadow: '0 0 15px rgba(74, 222, 128, 0.3)' }}>
                                        <Trophy size={32} style={{ color: 'var(--success)' }} />
                                    </div>
                                    
                                    <h3 style={{ color: 'var(--success)', fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>
                                        Quiz Concluído!
                                    </h3>
                                    
                                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', textShadow: '0 0 10px rgba(255, 232, 31, 0.4)', margin: '5px 0' }}>
                                        {localStorage.getItem('portalAttemptScore')} / 5 Pontos
                                    </div>

                                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', margin: 0, lineHeight: '1.4' }}>
                                        Parabéns! Sua recompensa foi registrada. Volte amanhã para um novo quiz!
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--danger)', boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)' }}>
                                        <Shield size={32} style={{ color: 'var(--danger)' }} />
                                    </div>
                                    <h3 style={{ color: 'var(--danger)', fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>
                                        Quiz Realizado
                                    </h3>
                                    
                                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--danger)', margin: '5px 0' }}>
                                        0 / 5 Pontos
                                    </div>

                                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', margin: 0, lineHeight: '1.5' }}>
                                        Você poderá tentar um novo quiz amanhã! Estude o conteúdo das suas missões e atividades para melhorar.
                                    </p>
                                </>
                            )}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
};

export default StudentQuiz;
