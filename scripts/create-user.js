const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Service Role Key is required to bypass some restrictions and manage users
// In a real project, this should be in .env and NEVER committed or exposed to client
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnbnBmZmxqZm5ka3NncnhpaWt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMwNTcyOCwiZXhwIjoyMDg0ODgxNzI4fQ.YK98pp1dpl2BTvsLP2UDyQYH58H4neXu9NV6Rn9tV60';
const PROJECT_URL = 'https://fgnpffljfndksgrxiikx.supabase.co';

const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUser(email, password, role = 'USER') {
  console.log(`Creating user: ${email} with role: ${role}...`);

  try {
    // 1. Create user in Auth
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Auto confirm email
    });

    if (createError) {
      console.error('Error creating user:', createError.message);
      return;
    }

    console.log(`User created with ID: ${user.user.id}`);

    // 2. Update profile role if needed (Trigger might have set it to USER)
    if (role === 'ADMIN') {
      console.log('Updating role to ADMIN...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'ADMIN' })
        .eq('id', user.user.id);

      if (updateError) {
        console.error('Error updating role:', updateError.message);
      } else {
        console.log('Role updated successfully.');
      }
    }

    console.log('✅ User setup complete!');
    console.log(`Login with: ${email} / ${password}`);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Get args
const args = process.argv.slice(2);
const email = args[0] || 'admin@example.com';
const password = args[1] || 'password123';
const role = args[2] || 'ADMIN';

createUser(email, password, role);
