// ============================================================
// app.js - código compartilhado por login.html, index.html, busca.html e dashboard.html
// ============================================================

// >>> COLE AQUI a URL do app da web (Implantar > Gerenciar implantações). É o ÚNICO lugar que precisa dela. <<<
const WEB_APP_URL = "COLE_AQUI_A_URL_DO_APP_DA_WEB";

const SESSAO_KEY = 'correios_sessao_v3';

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 'yyyy-MM-dd' -> 'dd/MM/yyyy'  |  'yyyy-MM-dd HH:mm' -> 'dd/MM/yyyy HH:mm'
function dataBR(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/);
  return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : '';
}

// ---------- sessão ----------
function lerSessao() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSAO_KEY));
    if (s && s.token && s.expira > Date.now()) return s;
  } catch (e) { /* ignora */ }
  localStorage.removeItem(SESSAO_KEY);
  return null;
}
function salvarSessao(s) { localStorage.setItem(SESSAO_KEY, JSON.stringify(s)); }
function sair() { localStorage.removeItem(SESSAO_KEY); location.replace('login.html'); }

// Páginas protegidas: sem login válido, vai direto para a tela de login
if (!window.PAGINA_PUBLICA && !lerSessao()) location.replace('login.html');

// ---------- chamada ao servidor ----------
async function api(acao, dados) {
  if (WEB_APP_URL.startsWith('COLE_AQUI')) throw new Error('Configure a WEB_APP_URL no arquivo app.js.');
  const s = lerSessao();
  const resp = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita pré-verificação CORS do navegador
    body: JSON.stringify(Object.assign({}, dados || {}, { acao: acao, token: s ? s.token : '' }))
  });
  const json = await resp.json();
  if (json.codigo === 'NAO_AUTENTICADO') {
    localStorage.removeItem(SESSAO_KEY);
    location.replace('login.html');
    throw new Error(json.mensagem);
  }
  return json;
}

// ---------- CAIXA ALTA em qualquer campo marcado com data-caixa-alta ----------
(function () {
  const st = document.createElement('style');
  st.textContent = '[data-caixa-alta]{text-transform:uppercase}[data-caixa-alta]::placeholder{text-transform:none}';
  document.head.appendChild(st);
  document.addEventListener('input', e => {
    const el = e.target;
    if (!el.matches || !el.matches('[data-caixa-alta]')) return;
    const v = el.value.toUpperCase();
    if (v !== el.value) {
      const a = el.selectionStart, b = el.selectionEnd;
      el.value = v;
      try { el.setSelectionRange(a, b); } catch (_) { /* campo sem seleção */ }
    }
  });
})();

// ---------- barra do usuário (nome, trocar senha, sair) ----------
function montarBarraUsuario() {
  const s = lerSessao();
  const nav = document.getElementById('navTopo');
  if (!s || !nav) return;
  const box = document.createElement('div');
  box.className = 'flex items-center gap-3 px-3 py-2 rounded-xl bg-card border border-card text-xs text-slate-400';
  box.innerHTML = `
    <i class="fas fa-user-circle text-indigo-400"></i>
    <span class="font-semibold text-slate-200">${esc(s.nome)}</span>
    <button type="button" id="btnTrocarSenha" class="hover:text-white" title="Alterar minha senha"><i class="fas fa-key"></i></button>
    <button type="button" id="btnSair" class="hover:text-white" title="Sair"><i class="fas fa-right-from-bracket"></i></button>`;
  nav.appendChild(box);
  document.getElementById('btnSair').addEventListener('click', sair);
  document.getElementById('btnTrocarSenha').addEventListener('click', () => abrirModalSenha(false));
  if (s.trocar) abrirModalSenha(true); // senha provisória: troca obrigatória
}

function abrirModalSenha(obrigatorio) {
  if (document.getElementById('modalSenha')) return;
  const m = document.createElement('div');
  m.id = 'modalSenha';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px';
  m.innerHTML = `
    <div class="bg-card border border-card rounded-2xl p-6 w-full max-w-sm">
      <h3 class="text-lg font-bold text-white mb-1"><i class="fas fa-key text-indigo-400 mr-2"></i>Alterar senha</h3>
      <p class="text-xs text-slate-400 mb-4">${obrigatorio ? 'Você entrou com uma senha provisória. Crie a sua senha pessoal para continuar.' : 'Mínimo de 6 caracteres.'}</p>
      <input type="password" id="senhaAtual" placeholder="Senha atual" autocomplete="current-password" class="w-full rounded-xl px-4 py-3 text-sm mb-3">
      <input type="password" id="senhaNova" placeholder="Nova senha" autocomplete="new-password" class="w-full rounded-xl px-4 py-3 text-sm mb-3">
      <input type="password" id="senhaNova2" placeholder="Repita a nova senha" autocomplete="new-password" class="w-full rounded-xl px-4 py-3 text-sm mb-3">
      <p id="senhaMsg" class="text-xs text-rose-400 mb-3 hidden"></p>
      <div class="flex gap-2">
        <button type="button" id="senhaSalvar" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm">Salvar</button>
        ${obrigatorio ? '' : '<button type="button" id="senhaCancelar" class="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm">Cancelar</button>'}
      </div>
    </div>`;
  document.body.appendChild(m);

  const msg = t => { const el = document.getElementById('senhaMsg'); el.textContent = t; el.classList.remove('hidden'); };
  const cancelar = document.getElementById('senhaCancelar');
  if (cancelar) cancelar.addEventListener('click', () => m.remove());

  document.getElementById('senhaSalvar').addEventListener('click', async () => {
    const atual = document.getElementById('senhaAtual').value;
    const nova = document.getElementById('senhaNova').value;
    if (nova.length < 6) return msg('A nova senha precisa ter pelo menos 6 caracteres.');
    if (nova !== document.getElementById('senhaNova2').value) return msg('As senhas novas não conferem.');
    const btn = document.getElementById('senhaSalvar');
    btn.disabled = true;
    try {
      const r = await api('trocarSenha', { senhaAtual: atual, senhaNova: nova });
      if (!r.sucesso) { btn.disabled = false; return msg(r.mensagem); }
      const s = lerSessao();
      s.token = r.token; s.trocar = false;
      salvarSessao(s);
      m.remove();
      alert('Senha alterada com sucesso!');
    } catch (err) { btn.disabled = false; msg(err.message); }
  });
}

document.addEventListener('DOMContentLoaded', montarBarraUsuario);
