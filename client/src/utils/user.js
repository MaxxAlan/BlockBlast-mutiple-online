export function getUID() {
  let uid = localStorage.getItem('player_uid');
  if (!uid) {
    uid = 'player_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('player_uid', uid);
  }
  return uid;
}

export function getNickname() {
  return localStorage.getItem('player_nickname') || '';
}

export function setNickname(name) {
  localStorage.setItem('player_nickname', name);
}
