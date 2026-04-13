import React, { useState, useEffect, useRef, useCallback } from 'react';
import Board from './Board';
import Shapes from './Shapes';
import { socket } from '../socket';
import {
  createEmptyBoard,
  getRandomShapes,
  canPlaceShape,
  placeShape,
  checkAndClearLines,
  checkGameOver,
  GRID_SIZE,
} from '../utils/gameLogic';
import { TRAINING_STEPS } from '../utils/trainingLogic';
import { getBestMove } from '../utils/aiLogic';
import {
  playPlaceSound,
  playClearSound,
  playGameOverSound,
  playWinSound,
} from '../utils/sounds';

export default function Game({ roomId, mode, isMobile = false, uid, roomCreator }) {
  const isCoop       = mode === 'coop';
  const isVersus     = mode === 'versus';
  const isPvE        = mode === 'pve';
  const isTraining   = mode === 'training';
  const isMultiplayer = isCoop || isVersus;
  
  const [trainingStepIdx, setTrainingStepIdx] = useState(0);
  const trainingScript = isTraining ? TRAINING_STEPS[trainingStepIdx] : null;

  // ── Game state ──────────────────────────────────────────
  const [board, setBoard]       = useState(() => {
    if (mode === 'solo') {
      const saved = localStorage.getItem('block_blast_solo_board');
      if (saved) return JSON.parse(saved);
    }
    return createEmptyBoard();
  });
  const [shapes, setShapes]     = useState(() => {
    if (mode === 'solo') {
      const saved = localStorage.getItem('block_blast_solo_shapes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) return parsed;
        } catch(e) {}
      }
    }
    return [];
  });
  const [score, setScore]       = useState(() => {
    if (mode === 'solo') {
      const saved = localStorage.getItem('block_blast_solo_score');
      if (saved) return parseInt(saved, 10);
    }
    return 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [coopRestarting, setCoopRestarting] = useState(false);
  const [versusRestarting, setVersusRestarting] = useState(false);
  const [scorePopping, setScorePopping] = useState(false);

  // Clear animation: set of "row-col" keys currently flashing
  const [clearingCells, setClearingCells] = useState(new Set());

  // Opponent (Versus / PvE)
  const [opponent, setOpponent]                 = useState(() => ({ board: createEmptyBoard(), score: 0 }));
  const [opponentShapes, setOpponentShapes]     = useState([]);
  const [opponentGameOver, setOpponentGameOver] = useState(false);
  const [opponentLeft, setOpponentLeft]         = useState(false);

  // ── Drag state ───────────────────────────────────────────
  // dragState → React (triggers re-render for floating block matrix/active)
  // Position (x,y) is managed 100% via DOM refs — never in React state
  const [dragState, setDragState] = useState({ active: false, matrix: null, index: null });
  const dragRef = useRef({ active: false, matrix: null, index: null, x: 0, y: 0, boardRect: null, floatWidth: null, floatHeight: null });

  const [previewState, setPreviewState] = useState(null);
  const previewRef = useRef(null);

  // DOM refs
  const floatingRef   = useRef(null);
  const rafRef        = useRef(null);
  const boardRef      = useRef(board);
  const commitDropRef = useRef(null); // always-current commitShapeDrop
  boardRef.current = board;

  // Shapes ref so commitShapeDrop doesn't close over stale shapes
  const shapesRef   = useRef(shapes);
  shapesRef.current = shapes;
  // isMobile ref for mount-time effect closure
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const isCoopRef = useRef(isCoop);
  isCoopRef.current = isCoop;
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  
  const lastEmitRef = useRef(0);
  
  // Remote drag state for streaming
  const [remoteDrag, setRemoteDrag] = useState(null);
  const remoteDragRef = useRef(null);
  remoteDragRef.current = remoteDrag;

  // ── Init shapes ──────────────────────────────────────────
  useEffect(() => {
    if (isTraining) {
      const ts = TRAINING_STEPS[0];
      setBoard(ts.board || createEmptyBoard());
      setShapes(ts.shapes);
      setTrainingStepIdx(0);
    } else if (isCoop && roomId) {
      socket.emit('coop_request_init', roomId);
    } else if (!isCoop) {
      if (mode === 'solo') {
        setShapes(prev => {
          if (!prev || prev.length === 0) {
            const loadedScore = parseInt(localStorage.getItem('block_blast_solo_score') || '0', 10);
            return getRandomShapes(3, loadedScore);
          }
          return prev;
        });
      } else {
        setShapes(getRandomShapes(3, 0));
      }
      if (isPvE) setOpponentShapes(getRandomShapes(3, 0));
    }
  }, [isPvE, isCoop, isTraining, roomId, mode]);

  // ── Auto Save to Local Storage ───────────────────────────
  useEffect(() => {
    if (mode === 'solo') {
      if (!gameOver && shapes && shapes.length > 0) {
        localStorage.setItem('block_blast_solo_board', JSON.stringify(board));
        localStorage.setItem('block_blast_solo_shapes', JSON.stringify(shapes));
        localStorage.setItem('block_blast_solo_score', score.toString());
      } else if (gameOver) {
        localStorage.removeItem('block_blast_solo_board');
        localStorage.removeItem('block_blast_solo_shapes');
        localStorage.removeItem('block_blast_solo_score');
      }
    }
  }, [board, shapes, score, mode, gameOver]);

  // ── Score pop animation ──────────────────────────────────
  const prevScore = useRef(score);
  useEffect(() => {
    if (score !== prevScore.current) {
      setScorePopping(true);
      const t = setTimeout(() => setScorePopping(false), 450);
      prevScore.current = score;
      return () => clearTimeout(t);
    }
  }, [score]);

  // ── Sync to server (Versus) ──────────────────────────────
  useEffect(() => {
    if (isVersus && roomId) socket.emit('update_state', { roomId, score, board });
  }, [board, score, isVersus, roomId]);

  // ── Socket listeners ─────────────────────────────────────
  useEffect(() => {
    if (!isMultiplayer) return;
    if (isVersus) {
      socket.on('opponent_update', (data) => setOpponent({ board: data.board, score: data.score }));
      socket.on('opponent_game_over', () => setOpponentGameOver(true));
      socket.on('versus_restarting_soon', () => setVersusRestarting(true));
      socket.on('versus_restart_now', () => {
        setBoard(createEmptyBoard());
        setScore(0);
        setShapes(getRandomShapes(3));
        setGameOver(false);
        setOpponentGameOver(false);
        setVersusRestarting(false);
        setOpponent({ board: createEmptyBoard(), score: 0 });
      });
    }
    if (isCoop) {
      socket.on('coop_init_state', (data) => {
        setGameOver(false);
        setCoopRestarting(false);
        if (data.board) setBoard(data.board);
        if (data.score) setScore(data.score);
        if (data.shapes) {
          setShapes(data.shapes);
          if (data.board && checkGameOver(data.board, data.shapes)) {
            setGameOver(true);
          }
        }
      });
      socket.on('coop_board_update', (data) => { 
        setBoard(data.board); 
        setScore(data.score);
        if (data.shapes) {
          setShapes(data.shapes);
          if (checkGameOver(data.board, data.shapes)) {
            setGameOver(true);
            playGameOverSound();
          }
        }
      });
      socket.on('coop_shapes_update', (data) => {
        setShapes(data);
      });
      socket.on('coop_drag_stream', (data) => {
        setRemoteDrag(data);
      });
      socket.on('coop_drag_stream_end', () => {
        setRemoteDrag(null);
      });
      socket.on('coop_restarting_soon', () => {
        setCoopRestarting(true);
      });
    }
    socket.on('opponent_left', () => { setOpponentLeft(true); });
    return () => {
      socket.off('opponent_update');
      socket.off('opponent_game_over');
      socket.off('versus_restarting_soon');
      socket.off('versus_restart_now');
      socket.off('coop_init_state');
      socket.off('coop_board_update');
      socket.off('coop_shapes_update');
      socket.off('coop_restarting_soon');
      socket.off('coop_drag_stream');
      socket.off('coop_drag_stream_end');
      socket.off('opponent_left');
    };
  }, [isMultiplayer, isVersus, isCoop, roomId]);

  // ── AI PvE loop ──────────────────────────────────────────
  useEffect(() => {
    if (!isPvE || opponentGameOver || gameOver) return;
    const timer = setTimeout(() => {
      const move = getBestMove(opponent.board, opponentShapes);
      if (!move) { setOpponentGameOver(true); return; }
      const shapeColor = opponentShapes[move.shapeIndex]?.colorId || 1;
      let newBoard = placeShape(opponent.board, move.matrix, shapeColor, move.row, move.col);
      let shp = 0;
      move.matrix.forEach(r => r.forEach(c => { if (c === 1) shp += 10; }));
      const { newBoard: cleared, linesCleared } = checkAndClearLines(newBoard);
      const newScore = opponent.score + shp + linesCleared * 100;
      const ns = [...opponentShapes]; ns.splice(move.shapeIndex, 1);
      const upcoming = ns.length === 0 ? getRandomShapes(3) : ns;
      setOpponent({ board: newBoard, score: newScore });
      setOpponentShapes(upcoming);
      if (checkGameOver(cleared, upcoming)) setOpponentGameOver(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isPvE, opponent, opponentShapes, opponentGameOver, gameOver]);

  // ── Submit Score to DB ───────────────────────────────────
  // Fetch initial high score from server on mount
  useEffect(() => {
    if (uid && mode && !isTraining) {
      fetch(`${URL}/api/user/${uid}`)
        .then(r => r.json())
        .then(data => {
          if (mode === 'solo' && data.solo_high_score > maxScore) setMaxScore(data.solo_high_score);
          if (mode === 'coop' && data.coop_high_score > maxScore) setMaxScore(data.coop_high_score);
        })
        .catch(console.error);
    }
  }, [uid, mode]);

  // Real-time tracking so if player closes window, highest score reflects immediately.
  useEffect(() => {
    if (uid && score > 0) {
      if (!isVersus && !isPvE && !isTraining) {
        socket.emit('submit_score', { uid, mode, score });
      }
    }
  }, [score, uid, mode, isVersus, isPvE, isTraining]);

  useEffect(() => {
    if (isVersus && opponentGameOver && uid) {
      socket.emit('submit_score', { uid, mode: 'versus' });
      playWinSound();
    }
  }, [opponentGameOver, isVersus, uid]);

  // Theme based on score (removed) - blocks now keep their classic intrinsic 3D UI colors.

  // ── Drag helpers ─────────────────────────────────────────
  const rotateMatrix = (m) => m[0].map((_, ci) => m.map(row => row[ci]).reverse());

  const handleSoloRestart = () => {
    setBoard(createEmptyBoard());
    setScore(0);
    setShapes(getRandomShapes(3));
    setGameOver(false);
    if (isPvE) {
      setOpponent({ board: createEmptyBoard(), score: 0 });
      setOpponentShapes(getRandomShapes(3));
      setOpponentGameOver(false);
    }
    if (mode === 'solo') {
      localStorage.removeItem('block_blast_solo_score');
      localStorage.removeItem('block_blast_solo_board');
      localStorage.removeItem('block_blast_solo_shapes');
    }
  };

  const moveFloating = (x, y) => {
    if (!floatingRef.current) return;
    // Use transform for positioning — React won't override since transform
    // is always set to 'translate(X,Y) translate(-50%,-110%)' and managed via DOM
    const verticalOffset = isMobileRef.current ? 160 : 110;
    floatingRef.current.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - ${verticalOffset}%))`;
  };

  // ── GLOBAL pointer handlers (mounted once, always active) ──
  // This fixes the mouse drag bug: no async delay from useEffect!
  // Handlers read dragRef.current to decide whether to act.
  useEffect(() => {
    let lastCellKey = null;

    const onMove = (e) => {
      if (!dragRef.current.active) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      const y = e.clientY ?? e.touches?.[0]?.clientY;
      if (x == null || y == null) return;

      dragRef.current.x = x;
      dragRef.current.y = y;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        moveFloating(x, y);

        // ── Mathematical Hit-Test ─────────────────────────────────────────
        const mat = dragRef.current.matrix;
        let hitRow = null, hitCol = null;

        if (!dragRef.current.boardRect) {
          const boardEl = document.querySelector('.grid-container:not(.opponent-grid)');
          if (boardEl) dragRef.current.boardRect = boardEl.getBoundingClientRect();
        }

        if (!dragRef.current.floatWidth && floatingRef.current) {
          dragRef.current.floatWidth = floatingRef.current.offsetWidth;
          dragRef.current.floatHeight = floatingRef.current.offsetHeight;
        }

        if (dragRef.current.boardRect && dragRef.current.floatWidth) {

          const boardRect = dragRef.current.boardRect;
          const floatWidth = dragRef.current.floatWidth;
          const floatHeight = dragRef.current.floatHeight;
          
          const verticalOffset = isMobileRef.current ? 1.6 : 1.1; // Matches moveFloating offset 160% vs 110%
          
          const floatLeft = x - (floatWidth / 2);
          const floatTop = y - (floatHeight * verticalOffset);
          
          const cellSize = boardRect.width / 8;
          const floatHalfCell = isMobileRef.current ? 14 : 24;
          
          const topX = floatLeft + floatHalfCell;
          const topY = floatTop + floatHalfCell;

          hitCol = Math.floor((topX - boardRect.left) / cellSize);
          hitRow = Math.floor((topY - boardRect.top) / cellSize);
        }
        
        let pRow = null, pCol = null;

        if (hitRow !== null && hitCol !== null) {
          const key = `${hitRow}-${hitCol}`;
          if (key !== lastCellKey) {
            lastCellKey = key;
            // canPlaceShape gracefully handles out of bounds (returning false)
            if (canPlaceShape(boardRef.current, mat, hitRow, hitCol)) {
              const ps = { matrix: mat, row: hitRow, col: hitCol, colorId: dragRef.current.colorId };
              previewRef.current = ps;
              setPreviewState(ps);
              pRow = hitRow; pCol = hitCol;
            } else {
              previewRef.current = null;
              setPreviewState(null);
            }
          } else if (previewRef.current) {
            pRow = previewRef.current.row;
            pCol = previewRef.current.col;
          }
        } else {
          lastCellKey = null;
          previewRef.current = null;
          setPreviewState(null);
        }
        
        // Broadcast drag roughly every 50ms (~20fps) to save bandwidth
        if (isCoopRef.current && roomIdRef.current) {
          const now = Date.now();
          if (now - lastEmitRef.current > 50) {
            lastEmitRef.current = now;
            socket.emit('coop_drag_move', {
              roomId: roomIdRef.current,
              x, y,
              matrix: mat,
              colorId: dragRef.current.colorId,
              shapeIndex: dragRef.current.index,
              previewRow: pRow,
              previewCol: pCol
            });
          }
        }
      });
    };

    const onUp = (e) => {
      if (!dragRef.current.active) return;
      document.body.classList.remove('dragging');
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastCellKey = null;

      const pr = previewRef.current;
      const idx = dragRef.current.index;
      const mat = dragRef.current.matrix;

      // Reset cached metrics
      dragRef.current.boardRect = null;
      dragRef.current.floatWidth = null;
      dragRef.current.floatHeight = null;

      // Reset drag state BEFORE committing drop (avoids double-trigger)
      dragRef.current.active = false;
      setDragState({ active: false, matrix: null, index: null });
      previewRef.current = null;
      setPreviewState(null);
      
      if (isCoopRef.current && roomIdRef.current) {
         socket.emit('coop_drag_end', roomIdRef.current);
      }

      if (pr) commitDropRef.current?.(mat, idx, pr.row, pr.col);
    };

    const onRotate = (e) => {
      if (!dragRef.current.active) return;
      if (e.type === 'contextmenu' || (e.type === 'keydown' && e.code === 'Space')) {
        e.preventDefault();
        const rotated = rotateMatrix(dragRef.current.matrix);
        dragRef.current.matrix = rotated;
        setDragState(prev => ({ ...prev, matrix: rotated }));
        const { x, y } = dragRef.current;
        // Re-use same visual-center offset as onMove
        const nRows = rotated.length;
        const cellPx = isMobileRef.current ? (28 + 3) : (48 + 6);
        const hitY = Math.max(1, Math.round(y - nRows * cellPx * 0.6));
        const elements = document.elementsFromPoint(x, hitY);
        const cellNode = elements.find(
          el => el.classList.contains('grid-cell') && !el.closest('.opponent-grid')
        );
        if (cellNode) {
          const row = parseInt(cellNode.dataset.row, 10);
          const col = parseInt(cellNode.dataset.col, 10);
          if (canPlaceShape(boardRef.current, rotated, row, col)) {
            const ps = { matrix: rotated, row, col, colorId: dragRef.current.colorId };
            previewRef.current = ps;
            setPreviewState(ps);
          } else {
            previewRef.current = null;
            setPreviewState(null);
          }
        }
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('contextmenu', onRotate);
    window.addEventListener('keydown', onRotate);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('contextmenu', onRotate);
      window.removeEventListener('keydown', onRotate);
    };
  }, []); // ← EMPTY deps: mounted once, handlers use refs — no stale closures

  // ── Drag start ───────────────────────────────────────────
  const handleDragStart = useCallback((e, shape, index) => {
    if (gameOver) return;
    if (isCoopRef.current && remoteDragRef.current) return; // Wait for other player to finish

    // Prevent text selection and default browser drag if cancelable
    if (e.cancelable) e.preventDefault();
    const matrix = shape.matrix || shape;
    const colorId = shape.colorId || 1;
    document.body.classList.add('dragging');
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    // Set ref FIRST (handlers check this synchronously)
    dragRef.current = { active: true, matrix, index, colorId, x, y };
    // Trigger React render (show floating block with correct matrix)
    setDragState({ active: true, matrix, index, colorId });
  }, [gameOver]);

  // Once floating block renders, update its position from dragRef if needed
  const setFloatingRef = useCallback((el) => {
    floatingRef.current = el;
    if (el && dragRef.current.active) {
      const { x, y } = dragRef.current;
      el.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 110%))`;
    }
  }, []);

  // ── Commit shape drop (with clear animation) ─────────────
  const commitShapeDrop = useCallback((shapeMatrix, shapeIndex, startRow, startCol) => {
    const currentBoard = boardRef.current;
    const colorId = shapesRef.current[shapeIndex]?.colorId || 1;
    let placed = placeShape(currentBoard, shapeMatrix, colorId, startRow, startCol);

    let shapeScore = 0;
    shapeMatrix.forEach(r => r.forEach(c => { if (c === 1) shapeScore += 10; }));

    // Find which rows/cols will be cleared BEFORE clearing
    const rowsToClear = [];
    const colsToClear = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (placed[r].every(c => c > 0)) rowsToClear.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) { if (placed[r][c] === 0) { full = false; break; } }
      if (full) colsToClear.push(c);
    }

    const linesCleared = rowsToClear.length + colsToClear.length;

    // Play placement sound
    playPlaceSound();

    if (linesCleared > 0) {
      // Build set of all cells to flash
      const flashSet = new Set();
      rowsToClear.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) flashSet.add(`${r}-${c}`);
      });
      colsToClear.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) flashSet.add(`${r}-${c}`);
      });

      // Show placed board first (with the new blocks)
      setBoard(placed);

      // After 1 frame, start flash animation
      requestAnimationFrame(() => {
        setClearingCells(flashSet);
        playClearSound(linesCleared);

        // After animation completes, apply the actual clear
        setTimeout(() => {
          setClearingCells(new Set());
          const { newBoard: cleared } = checkAndClearLines(placed);
          setBoard(cleared);
          
          const newScoreValue = score + shapeScore + (linesCleared * 100 * comboMult);
          setScore(newScoreValue);
          
          setShapes(prev => {
            let upcoming;
            if (isTraining && trainingScript?.goal !== 'GRADUATE') {
               const stepComplete = (trainingScript.goal === 'DROP_ANY' || (trainingScript.goal === 'CLEAR_LINE' && linesCleared > 0));
               if (stepComplete) {
                  const nextIdx = trainingStepIdx + 1;
                  const nextScript = TRAINING_STEPS[nextIdx];
                  if (nextScript) {
                     setTimeout(() => setTrainingStepIdx(nextIdx), 0);
                     if (nextScript.board) setTimeout(() => setBoard(nextScript.board), 0);
                     upcoming = nextScript.shapes || getRandomShapes(3, newScoreValue);
                  }
               } else {
                  setTimeout(() => setBoard(trainingScript.board), 0);
                  upcoming = trainingScript.shapes;
               }
            } else {
               const nsShapes = [...prev];
               nsShapes.splice(shapeIndex, 1);
               upcoming = nsShapes.length === 0 ? getRandomShapes(3, newScoreValue) : nsShapes;
            }
            
            if (isCoop) socket.emit('coop_place_block', { roomId, newBoard: cleared, newScore: newScoreValue, newShapes: upcoming });
            
            if (upcoming && upcoming.length > 0 && checkGameOver(cleared, upcoming)) {
              setGameOver(true);
              playGameOverSound();
              socket.emit('log_game_over', { uid, mode, score: newScoreValue });
              if (isVersus) socket.emit('game_over', roomId);
            }
            return upcoming || [];
          });
        }, 380);
      });
    } else {
      // No lines to clear — instant update
      setBoard(placed);
      
      const newScoreValue = score + shapeScore;
      setScore(newScoreValue);
      
      setShapes(prev => {
        let upcoming;
        if (isTraining && trainingScript?.goal !== 'GRADUATE') {
           const stepComplete = (trainingScript.goal === 'DROP_ANY'); // linesCleared is 0 here
           if (stepComplete) {
              const nextIdx = trainingStepIdx + 1;
              const nextScript = TRAINING_STEPS[nextIdx];
              if (nextScript) {
                 setTimeout(() => setTrainingStepIdx(nextIdx), 0);
                 if (nextScript.board) setTimeout(() => setBoard(nextScript.board), 0);
                 upcoming = nextScript.shapes || getRandomShapes(3, newScoreValue);
              }
           } else {
              setTimeout(() => setBoard(trainingScript.board), 0);
              upcoming = trainingScript.shapes;
           }
        } else {
           const nsShapes = [...prev];
           nsShapes.splice(shapeIndex, 1);
           upcoming = nsShapes.length === 0 ? getRandomShapes(3, newScoreValue) : nsShapes;
        }
        
        if (isCoop) socket.emit('coop_place_block', { roomId, newBoard: placed, newScore: newScoreValue, newShapes: upcoming });
        
        if (upcoming && upcoming.length > 0 && checkGameOver(placed, upcoming)) {
          setGameOver(true);
          playGameOverSound();
          socket.emit('log_game_over', { uid, mode, score: newScoreValue });
          if (isVersus) socket.emit('game_over', roomId);
        }
        return upcoming || [];
      });
    }
  }, [isCoop, isVersus, roomId]);
  // Keep ref in sync so the mount-time useEffect closure can call latest version
  commitDropRef.current = commitShapeDrop;

  // Win sound when opponent loses
  useEffect(() => {
    if (isVersus && opponentGameOver) playWinSound();
  }, [isVersus, opponentGameOver]);

  // ── Labels ───────────────────────────────────────────────
  const myLabel      = isCoop ? '🤝 Bảng Chung (Co-op)' : isTraining ? '🎓 Bảng Khởi Động' : 'Mục Tiêu';
  const opLabel      = isPvE  ? '🤖 BOT AI'              : '⚔️ Đối Thủ';
  const showOpponent = isVersus || isPvE;

  // Track max high score locally for display
  const [maxScore, setMaxScore] = useState(202805);
  useEffect(() => { if (score > maxScore) setMaxScore(score); }, [score, maxScore]);

  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {/* ── CLASSIC BLOCK BLAST HEADER ── */}
      <div className="game-dynamic-header">
         <div className="game-top-row">
           <div className="crown-score">
             <span role="img" aria-label="crown">👑</span> 
             {maxScore}
           </div>
         </div>
         <div className="center-huge-score">{score}</div>
      </div>

    <div className={`game-area ${isMobile ? 'game-area--mobile' : ''}`}>

      {/* ─── OPPONENT ─── */}
      {showOpponent && (
        <div className="player-section opponent">
          <div className="player-header">
            <span className="player-name">{opLabel}</span>
            <div className="score-board">🏆 <span>{opponent?.score || 0}</span></div>
          </div>
          {opponentGameOver && (
            <div className="game-status-banner game-status-banner--opponent">✅ ĐỐI THỦ ĐÃ THUA!</div>
          )}
          <Board board={opponent?.board || createEmptyBoard()} isOpponent={true} clearingCells={new Set()} />
          {isPvE && !opponentGameOver && !isMobile && (
            <Shapes shapes={opponentShapes} draggedIndex={null} onDragStart={() => {}} isMobile={false} />
          )}
        </div>
      )}

      {/* ─── PLAYER ─── */}
      <div className="player-section" style={{ position: 'relative' }}>
        {isTraining && trainingScript && (
          <div className="training-banner">
            <span className="training-icon">💡</span>
            <span className="training-text">{trainingScript.message}</span>
          </div>
        )}
        {showOpponent && <div style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '-0.5rem', alignSelf: 'flex-start'}}>{myLabel}</div>}
        {isCoopRef.current && <div style={{color: 'var(--c-mint)', fontSize: '0.9rem', marginBottom: '-0.5rem', fontWeight: 'bold'}}>🤝 {roomCreator ? `Phòng của ${roomCreator}` : 'Bảng Chiến Dịch Chung'}</div>}
        {isVersus && <div style={{color: 'var(--danger-color)', fontSize: '0.9rem', marginBottom: '-0.5rem', fontWeight: 'bold'}}>⚔️ {roomCreator ? `Phòng của ${roomCreator}` : 'Bảng Thách Đấu'}</div>}

        {gameOver && (
          <div className="game-status-banner game-status-banner--lose" style={{ flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
            <div>💥 HẾT CHỖ! {isCoop ? 'ĐỘI BẠN ĐÃ THUA' : 'BẠN ĐÃ THUA'}</div>
            {isCoop && !coopRestarting && (
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
                onClick={() => socket.emit('coop_request_restart', roomId)}
              >
                🔄 Chơi Lại Trận Mới
              </button>
            )}
            {isCoop && coopRestarting && (
                <div style={{fontSize: '0.85rem', color: 'var(--c-yellow)', marginTop: '0.2rem'}}>
                  Đồng đội muốn chơi lại, tự động vào trận sau 3s...
                </div>
            )}
            {(!isMultiplayer || isPvE) && (
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
                onClick={handleSoloRestart}
              >
                🔄 Chơi Lại Trận Mới
              </button>
            )}
            {isVersus && !versusRestarting && (
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
                onClick={() => socket.emit('versus_request_restart', roomId)}
              >
                🔄 Tái Đấu (Chơi Lại)
              </button>
            )}
            {isVersus && versusRestarting && (
                <div style={{fontSize: '0.85rem', color: 'var(--c-yellow)', marginTop: '0.2rem'}}>
                  Đối thủ muốn tái đấu, tự động vào trận sau 3s...
                </div>
            )}
          </div>
        )}

        {isVersus && opponentGameOver && (
          <div className="game-status-banner game-status-banner--win" style={{ flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
            <div>🎉 BẠN ĐÃ THẮNG!</div>
            {!versusRestarting && (
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
                onClick={() => socket.emit('versus_request_restart', roomId)}
              >
                🔄 Tái Đấu (Chơi Lại)
              </button>
            )}
            {versusRestarting && (
                <div style={{fontSize: '0.85rem', color: 'var(--c-yellow)', marginTop: '0.2rem'}}>
                  Đối thủ muốn tái đấu, tự động vào trận sau 3s...
                </div>
            )}
          </div>
        )}

        {opponentLeft && (
          <div className="game-status-banner game-status-banner--opponent">Đồng đội / Đối thủ đã thoát!</div>
        )}

        <div className="board-and-shapes">
          <Board
            board={board}
            isOpponent={false}
            previewState={
              dragState.active ? previewState : (remoteDrag?.previewRow != null ? { matrix: remoteDrag.matrix, row: remoteDrag.previewRow, col: remoteDrag.previewCol, colorId: remoteDrag.colorId } : null)
            }
            clearingCells={clearingCells}
          />

          {!gameOver && (
            <Shapes
              shapes={shapes}
              onDragStart={handleDragStart}
              draggedIndex={dragState.index}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>

      {/* ─── FLOATING DRAG CLONE ─── */}
      {dragState.active && dragState.matrix && (
        <div
          ref={setFloatingRef}
          className={`floating-block ${isMobile ? 'floating-block--mobile' : ''}`}
          // No style prop here — transform is managed ENTIRELY via DOM in moveFloating()
          // React will never override el.style.transform since it's not in style prop
        >
          {dragState.matrix.map((row, rIdx) => (
            <div key={rIdx} className="shape-row">
              {row.map((cell, cIdx) => (
                <div key={cIdx} className={`floating-cell ${cell === 0 ? 'empty' : `color-${dragState.colorId}`}`} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ─── REMOTE FLOATING CLONE (CO-OP STREAM) ─── */}
      {!dragState.active && remoteDrag && remoteDrag.matrix && (
        <div
          className={`floating-block ${isMobile ? 'floating-block--mobile' : ''}`}
          style={{ 
            transform: `translate(calc(${remoteDrag.x}px - 50%), calc(${remoteDrag.y}px - 110%))`,
            opacity: 0.85
          }}
        >
          {remoteDrag.matrix.map((row, rIdx) => (
            <div key={rIdx} className="shape-row">
              {row.map((cell, cIdx) => (
                <div key={cIdx} className={`floating-cell ${cell === 0 ? 'empty' : `color-${remoteDrag.colorId || 1}`}`} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
