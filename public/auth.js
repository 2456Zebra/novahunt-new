document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('auth-button-container');

  const updateAuthUI = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    container.innerHTML = '';

    if (user) {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '16px';

      const emailSpan = document.createElement('span');
      emailSpan.textContent = user.email;
      emailSpan.style.fontSize = '14px';
      emailSpan.style.color = '#374151';

      const signOutBtn = document.createElement('button');
      signOutBtn.textContent = 'Sign Out';
      signOutBtn.style.background = '#dc2626';
      signOutBtn.style.color = 'white';
      signOutBtn.style.padding = '8px 16px';
      signOutBtn.style.borderRadius = '8px';
      signOutBtn.style.border = 'none';
      signOutBtn.style.cursor = 'pointer';
      signOutBtn.onclick = async () => {
        await supabase.auth.signOut();
        updateAuthUI();
      };

      wrapper.appendChild(emailSpan);
      wrapper.appendChild(signOutBtn);
      container.appendChild(wrapper);
    } else {
      const signInBtn = document.createElement('button');
      signInBtn.textContent = 'Sign Up / Sign In';
      signInBtn.style.background = '#2563eb';
      signInBtn.style.color = 'white';
      signInBtn.style.padding = '12px 24px';
      signInBtn.style.borderRadius = '12px';
      signInBtn.style.border = 'none';
      signInBtn.style.fontWeight = '700';
      signInBtn.style.fontSize = '16px';
      signInBtn.style.cursor = 'pointer';
      signInBtn.onclick = () => showAuthModal();

      container.appendChild(signInBtn);
    }
  };

  const showAuthModal = () => {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.inset = 0;
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '16px';
    modal.style.zIndex = 100;

    modal.innerHTML = `
      <div style="width:100%;max-width:400px;background:white;border-radius:16px;padding:32px;">
        <h2 style="text-align:center;font-size:24px;font-weight:800;margin-bottom:24px;" id="modal-title">Create Account</h2>
        <form id="auth-form" style="display:flex;flex-direction:column;gap:16px;">
          <input type="email" id="email" placeholder="Email address" required style="padding:12px 16px;border:2px solid #d1d5db;border-radius:12px;font-size:16px;" />
          <input type="password" id="password" placeholder="Password (min. 6 characters)" required minlength="6" style="padding:12px 16px;border:2px solid #d1d5db;border-radius:12px;font-size:16px;" />
          <button type="submit" id="submit-btn" style="padding:14px;background:#2563eb;color:white;border:none;border-radius:12px;font-weight:700;font-size:18px;">Sign Up</button>
        </form>
        <p id="message" style="text-align:center;margin-top:16px;font-size:16px;"></p>
        <p style="text-align:center;margin-top:24px;">
          Already have an account? <button id="toggle-mode" style="color:#2563eb;font-weight:700;background:none;border:none;cursor:pointer;">Sign In</button>
        </p>
        <button id="close-modal" style="width:100%;margin-top:24px;color:#6b7280;background:none;border:none;cursor:pointer;">Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    let isSignUp = true;
    const title = modal.querySelector('#modal-title');
    const submitBtn = modal.querySelector('#submit-btn');
    const toggle = modal.querySelector('#toggle-mode');
    const message = modal.querySelector('#message');
    const form = modal.querySelector('#auth-form');

    toggle.onclick = () => {
      isSignUp = !isSignUp;
      title.textContent = isSignUp ? 'Create Account' : 'Welcome Back';
      submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
      toggle.textContent = isSignUp ? 'Sign In' : 'Sign Up';
      toggle.previousSibling.textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = modal.querySelector('#email').value;
      const password = modal.querySelector('#password').value;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Loading...';
      message.textContent = '';

      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) {
        message.textContent = result.error.message;
        message.style.color = 'red';
      } else {
        message.textContent = isSignUp ? 'Check your email for confirmation!' : 'Welcome back!';
        message.style.color = 'green';
        setTimeout(() => {
          document.body.removeChild(modal);
          updateAuthUI();
        }, 1500);
      }

      submitBtn.disabled = false;
      submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    };

    modal.querySelector('#close-modal').onclick = () => {
      document.body.removeChild(modal);
    };

    modal.onclick = (e) => {
      if (e.target === modal) document.body.removeChild(modal);
    };
  };

  // Initial UI
  updateAuthUI();

  // Listen for auth changes
  supabase.auth.onAuthStateChange(() => {
    updateAuthUI();
  });
});
