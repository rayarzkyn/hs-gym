import { createUser } from '../lib/firebase-auth.js';

const users = [
  { username: 'admin', password: 'password' },
  { username: 'manager', password: 'password' },
  { username: 'keuangan', password: 'password' },
  { username: 'operasional', password: 'password' },
  { username: 'Member_001', password: 'qwerty123' },
  { username: 'Member_002', password: 'qwerty123' },
];

async function setupFirebaseUsers() {
  console.log('🚀 Setting up Firebase users...');
  
  for (const user of users) {
    try {
      const result = await createUser(user.username, user.password);
      if (result.success) {
        console.log(`✅ ${user.username} created successfully`);
      } else {
        console.log(`⚠️ ${user.username}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${user.username}: ${error.message}`);
    }
    
    // Delay between creations
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('🎉 Firebase user setup completed!');
}

setupFirebaseUsers();