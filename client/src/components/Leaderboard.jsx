import React, { useEffect, useState } from 'react';
import './Leaderboard.css';
import { URL } from '../socket';

export default function Leaderboard({ onClose, isMobile }) {
  const [data, setData] = useState({ solo: [], coop: [], versus: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('solo');

  useEffect(() => {
    fetch(`${URL}/api/leaderboard`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error('Error fetching leaderboards:', e);
        setLoading(false);
      });
  }, []);

  const renderTable = (list, scoreKey, scoreLabel) => {
    if (list.length === 0) {
      return <div className="ldb-empty">Chưa có dữ liệu</div>;
    }
    return (
      <div className="ldb-table-wrap">
        <table className="ldb-table">
          <thead>
            <tr>
              <th>Hạng</th>
              <th>Người chơi</th>
              <th>{scoreLabel}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item, idx) => (
              <tr key={idx} className={idx < 3 ? `top-${idx+1}` : ''}>
                <td className="ldb-rank">
                  {idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </td>
                <td className="ldb-name">{item.nickname || 'Ẩn danh'}</td>
                <td className="ldb-score">{item[scoreKey]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="ldb-overlay">
      <div className={`ldb-modal ${isMobile ? 'ldb-mobile' : ''}`}>
        <button className="ldb-close" onClick={onClose}>&times;</button>
        <h2 className="ldb-title">BẢNG VÀNG THÀNH TÍCH</h2>
        
        <div className="ldb-tabs">
          <button className={activeTab === 'solo' ? 'active' : ''} onClick={() => setActiveTab('solo')}>⚡ Solo</button>
          <button className={activeTab === 'coop' ? 'active' : ''} onClick={() => setActiveTab('coop')}>🤝 Co-op</button>
          <button className={activeTab === 'versus' ? 'active' : ''} onClick={() => setActiveTab('versus')}>⚔️ Thách Đấu</button>
        </div>

        <div className="ldb-content">
          {loading ? (
            <div className="ldb-loading">Đang tải...</div>
          ) : (
            <>
              {activeTab === 'solo' && renderTable(data.solo, 'solo_high_score', 'Điểm Cao')}
              {activeTab === 'coop' && renderTable(data.coop, 'coop_high_score', 'Điểm Cao')}
              {activeTab === 'versus' && renderTable(data.versus, 'versus_wins', 'Số Trận Thắng')}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
