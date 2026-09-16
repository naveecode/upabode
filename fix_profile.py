import re

with open('src/components/ProfileView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add edit state
state_code = "const [activeTab, setActiveTab] = useState<'transmissions' | 'saved' | 'followers' | 'following' | 'settings'>('transmissions');\n  const [isEditing, setIsEditing] = useState(false);\n  const [editForm, setEditForm] = useState({ username: user.username, handle: user.handle });\n  const [editStatus, setEditStatus] = useState('');"

content = re.sub(
    r"const \[activeTab, setActiveTab\] = useState<'transmissions'.*?\('transmissions'\);",
    state_code,
    content,
    flags=re.DOTALL
)

settings_tab = '''{activeTab === 'settings' && (
          <div style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: '24px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.25rem', marginBottom: '6px' }}>
                  Account Parameters
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: 0 }}>
                  Your quantum credentials registered across the Upabode network.
                </p>
              </div>
              <button 
                onClick={async () => {
                  if (isEditing) {
                    setEditStatus('Saving...');
                    const { updateProfile } = await import('../app/actions');
                    const fd = new FormData();
                    fd.append('username', editForm.username);
                    fd.append('handle', editForm.handle);
                    const res = await updateProfile(fd);
                    if (res.error) setEditStatus(res.error);
                    else { setEditStatus('Saved!'); setIsEditing(false); window.location.reload(); }
                  } else {
                    setIsEditing(true);
                  }
                }}
                style={{ background: isEditing ? 'var(--earth)' : 'rgba(255,255,255,0.1)', color: isEditing ? '#000' : '#fff', border: 'none', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>

            {editStatus && <div style={{ color: editStatus === 'Saved!' ? 'var(--earth)' : 'var(--danger)', fontSize: '0.8rem' }}>{editStatus}</div>}

            <div style={{ display: 'grid', gap: '14px' }}>
              {/* Avatar Uploader */}
              <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className={user-avatar \} style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                    {user.avatarUrl?.startsWith?.('http') ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (user.avatarUrl || user.username.charAt(0))}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Profile Avatar</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--earth)' }}>Update Display Picture</div>
                  </div>
                </div>
                <div style={{ width: '100px', height: '40px', overflow: 'hidden' }}>
                  <UploadButton
                    endpoint="mediaUploader"
                    onClientUploadComplete={async (res: any) => {
                      if (res && res[0]) {
                        const { updateAvatar } = await import('../app/actions');
                        await updateAvatar(res[0].url);
                        window.location.reload();
                      }
                    }}
                    appearance={{
                      button: { background: 'var(--earth)', color: '#000', fontSize: '0.8rem', padding: '0 10px', height: '40px', width: '100%' },
                      allowedContent: { display: 'none' }
                    }}
                    content={{ button: 'Upload' }}
                  />
                </div>
              </div>

              <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Username</div>
                  {isEditing ? (
                    <input 
                      value={editForm.username} 
                      onChange={e => setEditForm({...editForm, username: e.target.value})} 
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--line)', color: '#fff', padding: '4px 8px', borderRadius: '6px', width: '100%', marginTop: '4px' }} 
                    />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>{user.username}</div>
                  )}
                </div>
                {!isEditing && <span style={{ fontSize: '0.74rem', color: 'var(--earth)' }}>Active</span>}
              </div>

              <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Cosmic Handle</div>
                  {isEditing ? (
                    <input 
                      value={editForm.handle} 
                      onChange={e => setEditForm({...editForm, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()})} 
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--line)', color: '#fff', padding: '4px 8px', borderRadius: '6px', width: '100%', marginTop: '4px' }} 
                    />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>@{user.handle}</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}'''

content = re.sub(
    r"\{activeTab === 'settings' && \(\s*<div style=\{\{.*?</div>\s*</div>\s*\)\}",
    settings_tab,
    content,
    flags=re.DOTALL
)

with open('src/components/ProfileView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
