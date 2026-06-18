/**
 * CONFICOMPUTOS — Login y Registro
 * app.js
 */
'use strict';

/* ── LOGIN ── */
const LoginController = (() => {
  let resetEmail = '';

  function init() {
    document.getElementById('btn-login')?.addEventListener('click', doLogin);
    document.getElementById('login-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    document.getElementById('btn-ir-registro')?.addEventListener('click', () => { window.location.href = 'pages/register.html'; });

    // Olvidé contraseña
    document.getElementById('btn-forgot')?.addEventListener('click', () => {
      document.getElementById('forgot-step-1').style.display = 'block';
      document.getElementById('forgot-step-2').style.display = 'none';
      document.getElementById('forgot-step-3').style.display = 'none';
      document.getElementById('forgot-email').value = '';
      hideErr('forgot-error-1'); hideErr('forgot-error-2'); hideErr('forgot-error-3');
      document.getElementById('modal-forgot').classList.add('open');
    });
    document.getElementById('btn-send-reset')?.addEventListener('click', enviarCodigo);
    document.getElementById('btn-verify-reset')?.addEventListener('click', verificarCodigo);
    document.getElementById('btn-save-pass')?.addEventListener('click', guardarNuevaPass);
    document.getElementById('btn-back-forgot')?.addEventListener('click', () => {
      document.getElementById('forgot-step-2').style.display = 'none';
      document.getElementById('forgot-step-1').style.display = 'block';
    });
  }

  function doLogin() {
    const email = (document.getElementById('login-email').value || '').trim();
    const pass  = (document.getElementById('login-pass').value  || '').trim();
    const rol   = document.getElementById('login-rol').value;
    const err   = document.getElementById('login-error');
    hideEl(err);

    if (!email) { showEl(err, 'Ingresa tu correo electrónico.'); return; }
    if (!pass)  { showEl(err, 'Ingresa tu contraseña.'); return; }
    if (!rol)   { showEl(err, 'Selecciona tu rol.'); return; }

    const user = AuthService.login(email, pass, rol);
    if (user) {
      window.location.href = user.rol === 'admin'
        ? 'pages/admin-dashboard.html'
        : 'pages/user-dashboard.html';
    } else {
      showEl(err, 'Credenciales incorrectas o usuario inactivo. Verifica tus datos.');
    }
  }

  function enviarCodigo() {
    const email  = document.getElementById('forgot-email').value.trim();
    const metodo = document.querySelector('input[name="forgot-metodo"]:checked')?.value || 'email';
    hideErr('forgot-error-1');

    if (!email.includes('@')) { showErr('forgot-error-1', 'Ingresa un correo electrónico válido.'); return; }

    const result = AuthService.solicitarRecuperacion(email, metodo);
    if (!result) { showErr('forgot-error-1', 'No encontramos una cuenta con ese correo.'); return; }

    resetEmail = email;
    document.getElementById('forgot-step-1').style.display = 'none';
    document.getElementById('forgot-step-2').style.display = 'block';
    document.getElementById('reset-token').value = '';

    const info = document.getElementById('reset-info');
    if (metodo === 'email') {
      info.innerHTML = `📧 Enviamos un código de 8 caracteres a <strong>${email}</strong>. Revisa tu bandeja de entrada y spam.`;
    } else {
      info.innerHTML = `📱 Enviamos un código de 8 caracteres por SMS al número <strong>${result.telefono || 'registrado'}</strong>.`;
    }
    // DEMO: mostrar token en un toast para pruebas
    UI.toast('🔑 (DEMO) Código: ' + result.token + ' — Ver consola del navegador');
  }

  function verificarCodigo() {
    const token = document.getElementById('reset-token').value.trim();
    hideErr('forgot-error-2');
    if (!token) { showErr('forgot-error-2', 'Ingresa el código recibido.'); return; }
    if (AuthService.verificarToken(resetEmail, token)) {
      document.getElementById('forgot-step-2').style.display = 'none';
      document.getElementById('forgot-step-3').style.display = 'block';
    } else {
      showErr('forgot-error-2', 'Código incorrecto o expirado. Solicita uno nuevo.');
    }
  }

  function guardarNuevaPass() {
    const p1 = document.getElementById('new-pass').value;
    const p2 = document.getElementById('new-pass2').value;
    hideErr('forgot-error-3');
    if (p1.length < 6) { showErr('forgot-error-3', 'La contraseña debe tener al menos 6 caracteres.'); return; }
    if (p1 !== p2)     { showErr('forgot-error-3', 'Las contraseñas no coinciden.'); return; }
    AuthService.cambiarPassword(resetEmail, p1);
    document.getElementById('modal-forgot').classList.remove('open');
    UI.toast('✅ Contraseña actualizada. Ya puedes iniciar sesión.');
  }

  function showEl(el, msg) { el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 5000); }
  function hideEl(el)       { el.classList.remove('show'); }
  function showErr(id, msg) { const el = document.getElementById(id); if(el){el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),5000);} }
  function hideErr(id)      { const el = document.getElementById(id); if(el) el.classList.remove('show'); }

  return { init };
})();


/* ── REGISTER ── */
const RegisterController = (() => {
  let currentStep = 1;
  let regData = {};
  let adminCodeDigits = new Array(8).fill('');

  function init() {
    updateSteps();
    document.getElementById('btn-next1')?.addEventListener('click', () => nextStep(1));
    document.getElementById('btn-next2')?.addEventListener('click', () => nextStep(2));
    document.getElementById('btn-back2')?.addEventListener('click', () => goStep(1));
    document.getElementById('btn-back3')?.addEventListener('click', () => goStep(2));
    document.getElementById('btn-register')?.addEventListener('click', tryRegister);
    document.getElementById('reg-pass')?.addEventListener('input', checkPassStrength);
    document.getElementById('btn-verify-code')?.addEventListener('click', verifyAdminCode);
    document.getElementById('btn-cancel-code')?.addEventListener('click', () => {
      document.getElementById('admin-code-overlay').classList.remove('open');
    });
    document.getElementById('btn-switch-user')?.addEventListener('click', () => {
      regData.rol = 'usuario';
      document.getElementById('admin-code-overlay').classList.remove('open');
      doRegister();
    });
    document.getElementById('btn-go-login')?.addEventListener('click', () => {
      window.location.href = '../app.html';
    });
    // Setup code digits
    for (let i = 0; i < 8; i++) {
      const el = document.getElementById('cd' + i);
      if (!el) continue;
      el.addEventListener('input', () => onDigit(i, el));
      el.addEventListener('keydown', e => onDigitKey(i, e));
    }
  }

  function nextStep(n) {
    const err = document.getElementById('reg-err' + n);
    err.classList.remove('show');
    if (n === 1) {
      const nombre   = document.getElementById('reg-nombre').value.trim();
      const apellido = document.getElementById('reg-apellido').value.trim();
      const email    = document.getElementById('reg-email').value.trim();
      if (!nombre || !apellido) { showErr(n, 'Ingresa nombre y apellido.'); return; }
      if (!email.includes('@')) { showErr(n, 'Ingresa un correo válido.'); return; }
      const existe = db.getUsuarios().find(u => u.email === email);
      if (existe) { showErr(n, 'Este correo ya está registrado.'); return; }
      regData.nombre   = nombre + ' ' + apellido;
      regData.email    = email;
      regData.rol      = document.getElementById('reg-rol').value;
    }
    if (n === 2) {
      const tel    = document.getElementById('reg-tel').value.trim();
      const ciudad = document.getElementById('reg-ciudad').value.trim();
      if (!tel)    { showErr(n, 'Ingresa tu teléfono.'); return; }
      if (!ciudad) { showErr(n, 'Ingresa tu ciudad.'); return; }
      regData.telefono = tel;
      regData.ciudad   = ciudad;
      regData.depto    = document.getElementById('reg-depto').value.trim();
      regData.fechaNac = document.getElementById('reg-fecha').value;
    }
    goStep(n + 1);
  }

  function goStep(n) {
    currentStep = n;
    for (let i = 1; i <= 3; i++) {
      const step = document.getElementById('step-content-' + i);
      if (step) step.style.display = i === n ? 'block' : 'none';
      const dot  = document.getElementById('sdot' + i);
      if (dot) dot.className = 'step-dot' + (i < n ? ' done' : i === n ? ' active' : '');
    }
    const l1 = document.getElementById('sline1');
    const l2 = document.getElementById('sline2');
    if (l1) l1.className = 'step-line' + (n > 1 ? ' done' : '');
    if (l2) l2.className = 'step-line' + (n > 2 ? ' done' : '');
  }

  function updateSteps() { goStep(1); }

  function showErr(n, msg) {
    const el = document.getElementById('reg-err' + n);
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3500);
  }

  function checkPassStrength() {
    const v = document.getElementById('reg-pass').value;
    let s = 0;
    if (v.length >= 6) s++;
    if (v.length >= 10) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    const bar   = document.getElementById('pass-bar');
    const label = document.getElementById('pass-label');
    const colors = ['#e5e7eb','#ef4444','#f97316','#eab308','#84cc16','#22c55e'];
    const labels = ['','Muy débil','Débil','Regular','Fuerte','Muy fuerte'];
    if (bar)   { bar.style.width = (s/5*100) + '%'; bar.style.background = colors[Math.min(s,5)]; }
    if (label) { label.textContent = labels[Math.min(s,5)]; label.style.color = colors[Math.min(s,5)]; }
  }

  function tryRegister() {
    const pass  = document.getElementById('reg-pass').value;
    const pass2 = document.getElementById('reg-pass2').value;
    const terms = document.getElementById('reg-terms').checked;
    if (pass.length < 6) { showErr(3, 'Contraseña mínimo 6 caracteres.'); return; }
    if (pass !== pass2)  { showErr(3, 'Las contraseñas no coinciden.'); return; }
    if (!terms)          { showErr(3, 'Acepta los términos y condiciones.'); return; }
    regData.pass = pass;
    if (regData.rol === 'admin') {
      adminCodeDigits = new Array(8).fill('');
      for (let i = 0; i < 8; i++) { const el=document.getElementById('cd'+i); if(el){el.value='';el.classList.remove('filled');} }
      document.getElementById('code-error-msg').classList.remove('show');
      document.getElementById('admin-code-overlay').classList.add('open');
      setTimeout(() => document.getElementById('cd0')?.focus(), 100);
    } else {
      doRegister();
    }
  }

  function onDigit(i, el) {
    const val = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').charAt(0);
    el.value = val;
    adminCodeDigits[i] = val;
    el.classList.toggle('filled', !!val);
    document.getElementById('code-error-msg').classList.remove('show');
    if (val && i < 7) document.getElementById('cd' + (i + 1))?.focus();
  }

  function onDigitKey(i, e) {
    if (e.key === 'Backspace' && !adminCodeDigits[i] && i > 0) {
      adminCodeDigits[i-1] = '';
      const prev = document.getElementById('cd' + (i-1));
      if (prev) { prev.value = ''; prev.classList.remove('filled'); prev.focus(); }
    }
    if (e.key === 'Enter') verifyAdminCode();
  }

  function verifyAdminCode() {
    const code = adminCodeDigits.join('');
    if (AuthService.verificarCodigoAdmin(code)) {
      document.getElementById('admin-code-overlay').classList.remove('open');
      doRegister();
    } else {
      document.getElementById('code-error-msg').classList.add('show');
      const wrap = document.getElementById('code-digits-wrap');
      wrap.classList.add('shake');
      setTimeout(() => {
        wrap.classList.remove('shake');
        adminCodeDigits = new Array(8).fill('');
        for (let i = 0; i < 8; i++) { const el=document.getElementById('cd'+i); if(el){el.value='';el.classList.remove('filled');} }
        document.getElementById('cd0')?.focus();
      }, 500);
    }
  }

  function doRegister() {
    const u = AuthService.register(regData.nombre, regData.email, regData.pass, regData.rol, regData.telefono||'', regData.ciudad||'', regData.depto||'', regData.fechaNac||'');
    // Mostrar pantalla de éxito
    document.getElementById('success-username').textContent = u.nombre;
    document.getElementById('sc-email').textContent  = u.email;
    document.getElementById('sc-rol').textContent    = u.rolLabel;
    document.getElementById('sc-ciudad').textContent = u.ciudad || '—';
    document.getElementById('sc-tel').textContent    = u.telefono || '—';
    document.getElementById('sc-fecha').textContent  = u.registrado;
    document.getElementById('success-overlay').classList.add('open');
    lanzarConfetti();
  }

  function lanzarConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#ec4899','#f9a8d4','#ffd6e7','#be185d','#ffadd2','#db2777'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;border-radius:${Math.random()>.5?'50%':'2px'};animation:fall ${2+Math.random()*3}s linear ${Math.random()*2}s infinite;`;
      container.appendChild(el);
    }
  }

  return { init };
})();

/* Inicializar según la página */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('btn-login'))    LoginController.init();
  if (document.getElementById('btn-register')) RegisterController.init();
});