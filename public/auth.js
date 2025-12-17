document.addEventListener('DOMContentLoaded', () => {
  const supabase = window.supabase.createClient(
    'https://YOUR-SUPABASE-PROJECT.supabase.co',  // REPLACE WITH YOUR SUPABASE_URL
    'YOUR-PUBLIC-ANON-KEY'  // REPLACE WITH NEXT_PUBLIC_SUPABASE_ANON_KEY from Vercel env
  );

  const container = document.getElementById('auth-button-container');

  const updateUI = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    container.innerHTML = '';

    if (user) {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.gap = '16px';

      const email = document.createElement('span');
      email.textContent = user.email;
      email.style.fontSize = '14px';
      email.style.color = '#374151';

      const logout = document.createElement('button');
      logout.textContent = 'Sign Out';
      logout.style.background = '#dc2626';
      logout.style.color = 'white';
      logout.style.padding = '8px 16px';
      logout.style.borderRadius = '8px';
      logout.style.border = 'none';
      logout.style.cursor = 'pointer';
      logout.onclick = async () => {
        await supabase.auth.signOut();
        updateUI();
      };

      div.appendChild(email);
      div.appendChild(logout);
      container.appendChild(div);
    } else {
      const login = document.createElement('button');
      login.textContent = 'Sign Up / Sign In';
      login.style.background = '#2563eb';
      login.style.color = 'white';
      login.style.padding = '12px 24px';
      login.style.borderRadius = '12px';
      login.style.border = 'none';
      login.style.fontWeight = '700';
      login.style.fontSize = '16px';
      login.style.cursor = 'pointer';
      login.onclick = showModal;

      container.appendChild(login);
    }
  };

  const showModal = () => {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '16px';
    modal.style.zIndex = '100';

    modal.innerHTML = `
      <div style="width:100%;max-width:400px;background:white;border-radius:16px;padding:32px;">
        <h2 style="text-align:center;font-size:24px;font-weight:800;margin-bottom:24px;" id="title">Create Account</h2>
        <form id="form" style="display:flex;flex-direction:column;gap:16px;">
          <input type="email" id="email" placeholder="Email address" required style="padding:12px 16px;border:2px solid #d1d5db;border-radius:12px;font-size:16px;" />
          <input type="password" id="password" placeholder="Password (min. 6 characters)" required minlength="6" style="padding:12px 16px;border:2px solid #d1d5db;border-radius:12px;font-size:16px;" />
          <button type="submit" id="submit" style="padding:14px;background:#2563eb;color:white;border:none;border-radius:12px;font-weight:700;font-size:18px;">Sign Up</button>
        </form>
        <p id="msg" style="text-align:center;margin-top:16px;"></p>
        <p style="text-align:center;margin-top:24px;">
          Already have an account? <button id="toggle" style="color:#2563eb;font-weight:700;background:none;border:none;cursor:pointer;">Sign In</button>
        </p>
        <button id="close" style="width:100%;margin-top:24px;color:#6b7280;background:none;border:none;cursor:pointer;">Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    let signUp = true;
    const title = modal.querySelector('#title');
    const submit = modal.querySelector('#submit');
    const toggle = modal.querySelector('#toggle');
    const msg = modal.querySelector('#msg');

    toggle.onclick = () => {
      signUp = !signUp;
      title.textContent = signUp ? 'Create Account' : 'Welcome Back';
      submit.textContent = signUp ? 'Sign Up' : 'Sign In';
    };

    modal.querySelector('#form').onsubmit = async (e) => {
      e.preventDefault();
      const email = modal.querySelector('#email').value;
      const password = modal.querySelector('#password').value;
      submit.disabled = true;
      submit.textContent = 'Loading...';

      const { error } = signUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        msg.textContent = error.message;
        msg.style.color = 'red';
      } else {
        msg.textContent = signUp ? 'Check your email for confirmation!' : 'Welcome back!';
        msg.style.color = 'green';
        setTimeout(() => {
          document.body.removeChild(modal);
          updateUI();
        }, 1500);
      }

      submit.disabled = false;
      submit.textContent = signUp ? 'Sign Up' : 'Sign In';
    };

    modal.querySelector('#close').onclick = () => document.body.removeChild(modal);
    modal.onclick = (e) => { if (e.target === modal) document.body.removeChild(modal); };
  };

  updateUI();
  supabase.auth.onAuthStateChange(updateUI);
});
