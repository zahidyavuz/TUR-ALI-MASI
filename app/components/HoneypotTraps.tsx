'use client';

/**
 * HONEYPOT COMPONENT
 * Bu bileşen, sadece botların ve hackerların görebileceği görünmez linkler oluşturur.
 */
/* eslint-disable @next/next/no-html-link-for-pages */
export default function HoneypotTraps() {
    return (
        <div 
            aria-hidden="true" 
            style={{ 
                position: 'absolute', 
                top: -1000, 
                left: -1000, 
                width: 1, 
                height: 1, 
                overflow: 'hidden', 
                opacity: 0 
            }}
        >
            {/* Casus botlar için cazip sahte linkler */}
            <a href="/api/security/honeypot/admin-config-dump" rel="nofollow">Admin Configuration</a>
            <a href="/api/security/honeypot/user-credentials-export" rel="nofollow">User Database Export</a>
            <a href="/api/security/honeypot/env-file-backup" rel="nofollow">Environment Variables</a>
            <a href="/api/security/honeypot/system-shell-access" rel="nofollow">Terminal Debug</a>
            
            {/* Form tabanlı honeypot (Botlar formları doldurmaya bayılır) */}
            <form action="/api/security/honeypot/form-bruteforce" method="POST">
                <input type="text" name="admin_username" defaultValue="admin" />
                <input type="password" name="admin_password" defaultValue="123456" />
                <button type="submit">Login to Secret Panel</button>
            </form>
        </div>
    );
}
