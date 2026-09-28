import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma } from '@repo/db';
import { auth } from '../lib/auth';
import { verifyPassword } from 'better-auth/crypto';

async function runAuthTests() {
  console.log('====================================================');
  console.log('  BETTER AUTH COMPLETE INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 1: Database Integrity & Remapping Check
  // ────────────────────────────────────────────────────────────────
  console.log('📋 Test Group 1: Database Users & Accounts Integrity');
  
  const totalUsers = await prisma.user.count();
  console.log(`     Total Users in DB: ${totalUsers}`);
  assert(totalUsers >= 100, `Expected at least 100 users, got ${totalUsers}`);

  const totalCredentialAccounts = await prisma.account.count({
    where: { providerId: 'credential' },
  });
  console.log(`     Total Credential Accounts in DB: ${totalCredentialAccounts}`);
  assert(totalCredentialAccounts >= 100, `Expected at least 100 credential accounts, got ${totalCredentialAccounts}`);

  // Check that no Clerk user IDs (user_*) remain in User.id
  const remainingClerkUsers = await prisma.user.findMany({
    where: { id: { startsWith: 'user_' } },
  });
  assert(remainingClerkUsers.length === 0, `Expected 0 old Clerk IDs in User table, found ${remainingClerkUsers.length}`);

  // Check contacts and messages foreign keys
  const orphanContacts = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM contacts c LEFT JOIN users u ON c.user_id = u.id WHERE u.id IS NULL
  `;
  assert(Number(orphanContacts[0].count) === 0, 'All contacts foreign keys are valid and point to existing users');

  const orphanMessages = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE u.id IS NULL
  `;
  assert(Number(orphanMessages[0].count) === 0, 'All messages foreign keys are valid and point to existing users');

  // ────────────────────────────────────────────────────────────────
  // TEST 2: Password Hash Verification for Migrated Users
  // ────────────────────────────────────────────────────────────────
  console.log('\n🔐 Test Group 2: Password Hash Verification');
  
  const credsPath = path.resolve(__dirname, '../user_credentials.json');
  assert(fs.existsSync(credsPath), 'user_credentials.json exists');

  const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  const sampleUser = credentials[0];
  console.log(`     Testing sample user: ${sampleUser.email} (ID: ${sampleUser.new_user_id})`);

  const account = await prisma.account.findFirst({
    where: { userId: sampleUser.new_user_id, providerId: 'credential' },
  });
  assert(account !== null, `Found credential account for ${sampleUser.email}`);
  assert(!!account?.password, 'Credential account has hashed password');

  const passwordValid = await verifyPassword({
    hash: account!.password!,
    password: sampleUser.temp_password,
  });
  assert(passwordValid, `Password hash successfully verifies against temp_password "${sampleUser.temp_password}"`);

  // ────────────────────────────────────────────────────────────────
  // TEST 3: Better Auth Core Sign-In API with Migrated Credentials
  // ────────────────────────────────────────────────────────────────
  console.log('\n🚀 Test Group 3: Better Auth API - Credential Sign-In');

  try {
    const signInResult = await auth.api.signInEmail({
      body: {
        email: sampleUser.email,
        password: sampleUser.temp_password,
      },
    });

    assert(!!signInResult, 'signInEmail returned result');
    assert(signInResult.user.id === sampleUser.new_user_id, `Session user ID matches remapped UUID (${signInResult.user.id})`);
    assert(signInResult.user.email === sampleUser.email, `Session user email matches (${signInResult.user.email})`);
    assert(!!signInResult.token, 'Session token was successfully generated');
    console.log(`     Session Token: ${signInResult.token.substring(0, 16)}...`);

    // Verify session was persisted in Session table
    const dbSession = await prisma.session.findUnique({
      where: { token: signInResult.token },
    });
    assert(dbSession !== null, 'Session persisted in PostgreSQL session table');
    assert(dbSession?.userId === sampleUser.new_user_id, 'Session correctly linked to user in database');

    // Clean up test session
    await prisma.session.delete({ where: { token: signInResult.token } });
  } catch (err: any) {
    assert(false, `Better Auth signInEmail failed: ${err.message}`);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 4: Better Auth New User Registration Flow
  // ────────────────────────────────────────────────────────────────
  console.log('\n👤 Test Group 4: Better Auth API - Registration & Sign-Up');
  
  const testNewEmail = `test-user-${Date.now()}@wachat-test.internal`;
  const testPassword = 'SecurePassword2026!';
  const testName = 'Automated Test User';

  let createdUserId: string | null = null;
  try {
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: testNewEmail,
        password: testPassword,
        name: testName,
      },
    });

    assert(!!signUpResult, 'signUpEmail succeeded');
    assert(signUpResult.user.email === testNewEmail, 'Registered user has correct email');
    assert(signUpResult.user.name === testName, 'Registered user has correct name');
    createdUserId = signUpResult.user.id;

    // Verify in DB
    const dbUser = await prisma.user.findUnique({ where: { email: testNewEmail } });
    assert(dbUser !== null, 'User saved to Prisma User table');
    assert(dbUser?.name === testName, 'User has correct name in DB');

    const dbAccount = await prisma.account.findFirst({
      where: { userId: createdUserId, providerId: 'credential' },
    });
    assert(dbAccount !== null, 'Account saved to Prisma Account table');

    // Test sign in with the newly registered user
    const testSignIn = await auth.api.signInEmail({
      body: {
        email: testNewEmail,
        password: testPassword,
      },
    });
    assert(testSignIn.user.id === createdUserId, 'Newly registered user can log in immediately');

    // Clean up session and test user
    await prisma.session.deleteMany({ where: { userId: createdUserId } });
    await prisma.account.deleteMany({ where: { userId: createdUserId } });
    await prisma.user.delete({ where: { id: createdUserId } });
    console.log('     Cleaned up test registration user.');
  } catch (err: any) {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } }).catch(() => {});
      await prisma.account.deleteMany({ where: { userId: createdUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    assert(false, `Better Auth signUpEmail failed: ${err.message}`);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 5: Forgot Password / Verification Token Flow
  // ────────────────────────────────────────────────────────────────
  console.log('\n🔑 Test Group 5: Better Auth API - Forgot Password Flow');
  
  try {
    const forgotResult = await auth.api.requestPasswordReset({
      body: {
        email: sampleUser.email,
        redirectTo: 'http://localhost:3000/reset-password',
      },
    });

    assert(forgotResult !== undefined, 'requestPasswordReset API executed without throwing');

    const allVerifications = await prisma.verification.findMany();
    console.log(`     Total verification records in DB: ${allVerifications.length}`);
    if (allVerifications.length > 0) {
      console.log(`     Sample verification identifier: "${allVerifications[0].identifier}"`);
    }

    assert(allVerifications.length > 0, 'Password reset verification token created in DB');
    const latestVerification = allVerifications[allVerifications.length - 1];
    assert(latestVerification.identifier.startsWith('reset-password:'), `Verification identifier formatted correctly (${latestVerification.identifier})`);
    console.log(`     Reset Token: ${latestVerification.value ? latestVerification.value.substring(0, 16) : latestVerification.identifier}...`);

    // Clean up test verification records
    await prisma.verification.deleteMany({});
  } catch (err: any) {
    assert(false, `Better Auth forgetPassword failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`  ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log('====================================================\n');
}

runAuthTests()
  .catch((e) => {
    console.error('Test execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
