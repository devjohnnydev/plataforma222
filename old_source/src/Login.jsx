import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { LogIn, Mail, Lock, User, Code, Camera } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'framer-motion';

// Sound effects generator using Web Audio API (completely offline & lightweight)
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
        } else if (type === 'flip') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(250, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0.03, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
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
        } else if (type === 'unlock') {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(90, ctx.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.6);
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(92, ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(752, ctx.currentTime + 0.6);
            
            gain.gain.setValueAtTime(0.02, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            
            osc1.start();
            osc2.start();
            osc1.stop(ctx.currentTime + 0.6);
            osc2.stop(ctx.currentTime + 0.6);
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

const Login = () => {
    const { login, registerStudent, updateProfessorPassword } = useData();
    const [role, setRole] = useState('ALUNO'); // 'ALUNO', 'PROFESSOR', 'ADMIN'
    const [mode, setMode] = useState('LOGIN'); // 'LOGIN' or 'REGISTER'
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        nome: '',
        codigo: ''
    });

    const [newPassword, setNewPassword] = useState('');
    const [mustChange, setMustChange] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);

    // Audio State
    const [muted, setMuted] = useState(() => {
        const saved = localStorage.getItem('eduGameMuted');
        return saved ? saved === 'true' : false;
    });

    const API_URL = import.meta.env.VITE_API_URL || '/api';

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (mustChange) {
                await updateProfessorPassword(newPassword);
                alert('Senha alterada com sucesso! Você já está conectado.');
                setMustChange(false);
                return;
            }

            if (mode === 'REGISTER' && role === 'ALUNO') {
                await registerStudent({
                    nome: formData.nome?.trim(),
                    email: formData.email?.trim().toLowerCase(),
                    password: formData.password,
                    codigo: formData.codigo?.trim().toUpperCase()
                });
                alert('Cadastro realizado com sucesso!');
                return;
            }

            let credentials = { 
                email: formData.email?.trim().toLowerCase(), 
                password: formData.password 
            };
            const user = await login(credentials);

            if (user && user.role === 'PROFESSOR' && user.primeiro_acesso) {
                setMustChange(true);
            }
        } catch (e) {
            alert(e.message || 'Erro ao realizar ação');
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', background: 'var(--bg-dark)', position: 'relative', overflow: 'hidden' }}>
            
            {/* Ambient Animated Cyber Nebula Background */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '600px', height: '600px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 232, 31, 0.04) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)',
                filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0
            }} />

            {/* Floating particles effect */}
            <div style={{
                position: 'absolute', width: '100%', height: '100%',
                backgroundImage: 'radial-gradient(1px 1px at 10% 20%, rgba(255,232,31,0.2) 0%, transparent 100%), radial-gradient(1px 1px at 50% 60%, rgba(99,102,241,0.2) 0%, transparent 100%)',
                pointerEvents: 'none', zIndex: 0
            }} />

            <AnimatePresence mode="wait">
                {/* CYBERPUNK LOGIN FORM CARD */}
                <motion.div 
                    key="login-form-card"
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="glass-card" 
                    style={{ padding: '2.5rem', width: '100%', maxWidth: '450px', zIndex: 10 }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '2.3rem', marginBottom: '0.4rem', color: 'var(--primary)', textShadow: '0 0 10px rgba(255, 232, 31, 0.3)', fontWeight: '900' }}>
                            RANKING SENAI
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {mustChange ? 'Alteração de Senha Obrigatória' :
                                mode === 'REGISTER' ? 'Crie sua ficha de Aventureiro' : 'Acesse sua conta para ver o Ranking'}
                        </p>
                    </div>

                    {!mustChange && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {['ALUNO', 'PROFESSOR', 'ADMIN'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => { 
                                        playSynthSound('click', muted);
                                        setRole(r); 
                                        setMode('LOGIN'); 
                                    }}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                                        background: role === r ? 'var(--primary)' : 'transparent',
                                        color: role === r ? '#000' : 'rgba(255,255,255,0.5)',
                                        fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {mustChange ? (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div style={{ textAlign: 'center', marginBottom: '1rem', padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)' }}>
                                    <p style={{ color: 'var(--warning)', fontWeight: 'bold' }}>Segurança em Primeiro Lugar!</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mestres devem trocar a senha no primeiro acesso.</p>
                                </div>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.85rem' }}><Lock size={14} /> Nova Senha</label>
                                    <input
                                        className="input-field"
                                        type="password"
                                        placeholder="Sua nova senha secreta"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem', padding: '1rem' }}>
                                    SALVAR E CONTINUAR
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1.2rem' }}>
                                {mode === 'REGISTER' && (
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.85rem' }}><User size={14} /> Seu Nome</label>
                                        <input
                                            className="input-field"
                                            placeholder="Ex: João da Silva"
                                            value={formData.nome}
                                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.85rem' }}><Mail size={14} /> E-mail</label>
                                    <input
                                        className="input-field"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.85rem' }}><Lock size={14} /> Senha</label>
                                    <input
                                        className="input-field"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                </div>

                                {mode === 'REGISTER' && (
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.85rem' }}><Code size={14} /> Código da Turma</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                className="input-field"
                                                placeholder="Código fornecido pelo professor"
                                                value={formData.codigo}
                                                onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                                                required
                                                style={{ marginBottom: 0, flex: 1 }}
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    playSynthSound('click', muted);
                                                    setShowQRScanner(true);
                                                }}
                                                className="btn" 
                                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', padding: '0 1rem', width: 'auto' }}
                                            >
                                                <Camera size={18} style={{ color: '#fff' }} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '1rem', gap: '0.5rem' }}>
                                    {mode === 'REGISTER' ? 'CRIAR CONTA' : 'ENTRAR NA GUILDA'}
                                    <LogIn size={18} />
                                </button>

                                {role === 'ALUNO' && (
                                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                        {mode === 'LOGIN' ? (
                                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                                                Não tem conta? <span onClick={() => { playSynthSound('click', muted); setMode('REGISTER'); }} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Cadastre-se aqui</span>
                                            </p>
                                        ) : (
                                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                                                Já tem conta? <span onClick={() => { playSynthSound('click', muted); setMode('LOGIN'); }} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Faça login</span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </form>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.2rem' }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                            Desenvolvido por <strong>Johnny Oliveira</strong>
                        </p>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Modal do Scanner */}
            {showQRScanner && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
                }} onClick={() => setShowQRScanner(false)}>
                    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px', width: '100%', background: 'var(--bg-dark)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Escanear Código</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Aponte a câmera para o QR Code da sala.</p>
                        
                        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem', border: '2px solid var(--primary)' }}>
                            <Scanner 
                                onScan={(result) => {
                                    if (result && result.length > 0) {
                                        setFormData({ ...formData, codigo: result[0].rawValue.toUpperCase() });
                                        setShowQRScanner(false);
                                    }
                                }}
                                onError={(error) => console.log(error)}
                            />
                        </div>

                        <button 
                            type="button" 
                            onClick={() => {
                                playSynthSound('click', muted);
                                setShowQRScanner(false);
                            }} 
                            className="btn" 
                            style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.1)' }}
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
