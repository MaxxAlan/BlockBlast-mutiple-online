import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import Game from './components/Game';
import { socket } from './socket';
import { useIsMobile } from './hooks/useIsMobile';
import Leaderboard from './components/Leaderboard';
import { getUID, getNickname, setNickname } from './utils/user';

// ── Helper: build shareable URL ────────────────────────────
function buildShareUrl(roomId) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash   = '';
  url.searchParams.set('room', roomId);
  return url.toString();
}

// ── QR Canvas component ─────────────────────────────────────
function QRCanvas({ value }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: 160,
      margin: 1,
      color: { dark: '#e8f0fe', light: '#0a1020' },
    });
  }, [value]);

  return (
    <canvas
      ref={canvasRef}
      style={{ borderRadius: 10, display: 'block' }}
    />
  );
}

// ── Copy-to-clipboard button ─────────────────────────────────
function CopyButton({ text, label = 'Sao Chép' }) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      className={`btn btn--copy ${copied ? 'copied' : ''}`}
      onClick={handle}
    >
      {copied ? '✅ Đã Sao Chép!' : `📋 ${label}`}
    </button>
  );
}


// ────────────────────────────────────────────────────────────
// APP
// ────────────────────────────────────────────────────────────
function App() {
  const isMobile = useIsMobile();

  const [view, setView]           = useState('home');
  const [roomId, setRoomId]       = useState('');
  const [inputRoom, setInputRoom] = useState('');
  const [playMode, setPlayMode]   = useState('solo');
  const [errorMsg, setErrorMsg]   = useState('');
  
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isConnecting, setIsConnecting] = useState(!socket.connected);
  const [needsNickname, setNeedsNickname] = useState(!getNickname());
  const [nicknameInput, setNicknameInput] = useState('');

  // ── Auto-join from URL query param ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('room');
    if (code && code.length === 4) {
      setInputRoom(code.toUpperCase());
      // small delay so socket connect is ready
      const t = setTimeout(() => {
        socket.emit('join_room', code.toUpperCase());
      }, 600);
      return () => clearTimeout(t);
    }
  }, []);

  // ── Socket events ───────────────────────────────────────
  useEffect(() => {
    const handleConnect = () => {
      setIsConnecting(false);
      socket.emit('init_user', { uid: getUID(), nickname: getNickname() });
    };
    if (socket.connected) handleConnect();
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', () => setIsConnecting(true));

    socket.on('room_created', (data) => {
      // Handle both {roomId, mode} object and plain string (legacy server)
      const code = typeof data === 'string' ? data : data?.roomId;
      const mode = typeof data === 'object' ? data?.mode : undefined;
      if (code) setRoomId(code);
      if (mode) setPlayMode(mode);
      setView('lobby_waiting');
    });

    socket.on('room_joined', (data) => {
      const code = typeof data === 'string' ? data : data?.roomId;
      const mode = typeof data === 'object' ? data?.mode : undefined;
      if (code) setRoomId(code);
      if (mode) setPlayMode(mode);
      setView('lobby_waiting');
    });

    socket.on('game_start', (data) => {
      setPlayMode(data.mode);
      // Clean URL query param when game starts
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url);
      setView('game');
    });

    socket.on('error', (msg) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 3000);
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('game_start');
      socket.off('error');
      socket.off('connect', handleConnect);
      socket.off('disconnect');
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────
  const startSolo = () => { setPlayMode('solo'); setView('game'); };
  const startPvE  = () => { setPlayMode('pve');  setView('game'); };
  const goHome    = () => {
    setView('home');
    setRoomId('');
    setInputRoom('');
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url);
  };
  
  const handleSaveNickname = () => {
    if (!nicknameInput.trim()) return;
    setNickname(nicknameInput.trim());
    setNeedsNickname(false);
    socket.emit('init_user', { uid: getUID(), nickname: nicknameInput.trim() });
  };

  const createRoom = (m) => socket.emit('create_room', m);

  const joinRoom = useCallback(() => {
    if (inputRoom.trim() === '') return;
    socket.emit('join_room', inputRoom.trim().toUpperCase());
  }, [inputRoom]);

  // ── Derived ──────────────────────────────────────────────
  const modeLabel  = playMode === 'coop' ? '🤝 CO-OP — Đồng Đội' : '⚔️ VERSUS — Đối Kháng';
  const shareUrl   = roomId ? buildShareUrl(roomId) : '';

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="app-container">

      {/* ── HEADER ────────────────────────────── */}
      <header className="app-header">
        {view !== 'home' && (
          <button className="btn-back" onClick={goHome}>← Thoát</button>
        )}
        <h1 className="title" data-text="BLOCK BLAST">BLOCK BLAST</h1>
      </header>

      {/* ── HOME ──────────────────────────────── */}
      {view === 'home' && (
        <div className="lobby-container">
          {needsNickname && (
            <div className="lobby-card" style={{ marginBottom: '1.5rem', background: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6' }}>
              <p style={{marginBottom: 10, color: '#93c5fd'}}>Vui lòng nhập tên hiển thị của bạn:</p>
              <div className="lobby-join-row">
                <input
                  type="text"
                  className="input-code"
                  placeholder="Nhập tên của bạn..."
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                  style={{ flex: 1, textTransform: 'none' }}
                  maxLength={15}
                />
                <button className="btn btn--blue" onClick={handleSaveNickname}>Lưu</button>
              </div>
            </div>
          )}
          
          {isConnecting && (
            <div className="lobby-error" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid #f59e0b' }}>
              ⏳ Đang kết nối tới máy chủ... (Vui lòng đợi)
            </div>
          )}

          <p className="lobby-section-label">Chế Độ Một Mình</p>
          <div className="lobby-card">
            <div className={`btn-group ${isMobile ? 'btn-group--vertical' : ''}`}>
              <button id="btn-solo"  className="btn btn--flex"           onClick={startSolo}>⚡ Chơi Đơn (Solo)</button>
              <button id="btn-pve"   className="btn btn--purple btn--flex" onClick={startPvE}>🤖 Đấu Với AI</button>
            </div>
          </div>

          <p className="lobby-section-label" style={{ marginTop: '0.5rem' }}>Chơi Trực Tuyến</p>
          <div className="lobby-card">
            <div className={`btn-group ${isMobile ? 'btn-group--vertical' : ''}`}>
              <button id="btn-create-versus" className="btn btn--danger btn--flex" onClick={() => createRoom('versus')}>⚔️ Tạo Phòng Thách Đấu</button>
              <button id="btn-create-coop"   className="btn btn--blue   btn--flex" onClick={() => createRoom('coop')}>🤝 Tạo Phòng Co-op</button>
            </div>

            <div className="lobby-divider">HOẶC THAM GIA</div>

            <div className="lobby-join-row">
              <input
                id="input-room-code"
                type="text"
                className="input-code"
                placeholder="MÃ PHÒNG (4 KÝ TỰ)"
                value={inputRoom}
                onChange={(e) => setInputRoom(e.target.value.toUpperCase())}
                maxLength={4}
                onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                style={{ flex: 1 }}
              />
              <button id="btn-join" className="btn btn--outline" onClick={joinRoom}>Vào</button>
            </div>
          </div>

          {errorMsg && <div className="lobby-error">{errorMsg}</div>}
          
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
             <button className="btn btn--outline" onClick={() => setShowLeaderboard(true)} style={{ borderStyle: 'dashed' }}>
               🏆 Xem Bảng Thành Tích
             </button>
          </div>
        </div>
      )}

      {/* ── WAITING ROOM ──────────────────────── */}
      {view === 'lobby_waiting' && (
        <div className="waiting-container">
          <span className="waiting-badge">{modeLabel}</span>

          {/* Room code */}
          <div style={{ textAlign: 'center' }}>
            <p className="waiting-hint" style={{ marginBottom: '0.4rem' }}>Mã phòng của bạn</p>
            <div className="waiting-room-code">{roomId}</div>
          </div>

          {/* Share section */}
          <div className="share-section">
            {/* QR code */}
            <div className="share-qr">
              <QRCanvas value={shareUrl} />
              <span className="share-qr-label">Quét để vào phòng</span>
            </div>

            {/* Link + copy buttons */}
            <div className="share-actions">
              <p className="share-url-label">Hoặc chia sẻ link:</p>
              <div className="share-url-box">
                <span className="share-url-text">{shareUrl}</span>
              </div>
              <CopyButton text={shareUrl}  label="Sao Chép Link" />
              <CopyButton text={roomId}    label="Sao Chép Mã Phòng" />
            </div>
          </div>

          {/* Loading indicator */}
          <div className="loading-dots"><span /><span /><span /></div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {playMode === 'coop' ? 'Đang chờ đồng đội tham gia…' : 'Đang chờ đối thủ tham gia…'}
          </p>
        </div>
      )}

      {/* ── GAME ──────────────────────────────── */}
      {view === 'game' && (
        <Game roomId={roomId} mode={playMode} isMobile={isMobile} uid={getUID()} />
      )}
      
      {/* ── LEADERBOARD MODAL ────────────────── */}
      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} isMobile={isMobile} />
      )}
    </div>
  );
}

export default App;
