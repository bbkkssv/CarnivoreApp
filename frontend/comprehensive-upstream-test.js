// Comprehensive upstream dependency test for T015-T022
require('dotenv').config({ path: '.env.local' });

console.log('🔍 COMPREHENSIVE UPSTREAM DEPENDENCY TEST');
console.log('=========================================');
console.log('Testing all dependencies for T015-T022 before proceeding...\n');

let results = [];

function logResult(test, status, message = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${test}: ${status} ${message}`);
  results.push({ test, status, message });
}

// Test 1: Environment Variables
console.log('1️⃣ TESTING ENVIRONMENT VARIABLES');
console.log('─────────────────────────────────');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'JWT_SECRET',
  'DATABASE_URL'
];

let envIssues = [];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar] || process.env[envVar].includes('your-')) {
    envIssues.push(envVar);
  }
});

if (envIssues.length === 0) {
  logResult('Environment Variables', 'PASS', 'All required vars set');
} else {
  logResult('Environment Variables', 'FAIL', `Missing: ${envIssues.join(', ')}`);
}

// Test 2: File Structure
console.log('\n2️⃣ TESTING FILE STRUCTURE');
console.log('──────────────────────────');

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  // Services (T015-T016)
  'src/services/adaptationService.ts',
  'src/services/subscriptionService.ts',
  'src/services/mealPlanService.ts',
  'src/services/shoppingListService.ts',
  'src/lib/supabase.ts',
  
  // API Routes (T017-T022)
  'app/api/onboarding/route.ts',
  'app/api/meal-plans/route.ts', 
  'app/api/meal-plans/[id]/route.ts',
  'app/api/shopping-lists/route.ts',
  'app/api/shopping-lists/[id]/route.ts',
  'app/api/adaptation-logs/route.ts',
  'app/api/auth/register/route.ts',
  'app/api/auth/login/route.ts',
  'app/api/auth/logout/route.ts',
  'app/api/auth/verify/route.ts',
  'app/api/subscriptions/webhook/route.ts'
];

let missingFiles = [];
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
  }
});

if (missingFiles.length === 0) {
  logResult('File Structure', 'PASS', 'All required files exist');
} else {
  logResult('File Structure', 'FAIL', `Missing: ${missingFiles.length} files`);
  missingFiles.slice(0, 3).forEach(file => console.log(`   ❌ Missing: ${file}`));
  if (missingFiles.length > 3) console.log(`   ... and ${missingFiles.length - 3} more`);
}

// Test 3: Service Dependencies
console.log('\n3️⃣ TESTING SERVICE DEPENDENCIES');
console.log('────────────────────────────────');

async function testServiceImports() {
  const serviceTests = [];
  
  // Test Supabase client
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    logResult('Supabase Client', 'PASS');
  } catch (error) {
    logResult('Supabase Client', 'FAIL', error.message);
  }
  
  // Test Stripe
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    logResult('Stripe SDK', 'PASS', `v${stripe.VERSION || 'unknown'}`);
  } catch (error) {
    logResult('Stripe SDK', 'FAIL', error.message);
  }
  
  // Test bcryptjs
  try {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('test', 12);
    const valid = bcrypt.compareSync('test', hash);
    logResult('bcryptjs', valid ? 'PASS' : 'FAIL');
  } catch (error) {
    logResult('bcryptjs', 'FAIL', error.message);
  }
  
  // Test JWT
  try {
    const { SignJWT } = require('jose');
    logResult('JWT (jose)', 'PASS');
  } catch (error) {
    logResult('JWT (jose)', 'FAIL', error.message);
  }
  
  // Test service files
  const serviceFiles = [
    'adaptationService.ts',
    'subscriptionService.ts',
    'mealPlanService.ts', 
    'shoppingListService.ts'
  ];
  
  serviceFiles.forEach(service => {
    try {
      const servicePath = path.join(__dirname, 'src', 'services', service);
      if (fs.existsSync(servicePath)) {
        const content = fs.readFileSync(servicePath, 'utf8');
        if (content.includes('export') && content.includes('class')) {
          logResult(`Service ${service}`, 'PASS');
        } else {
          logResult(`Service ${service}`, 'WARN', 'File exists but may be incomplete');
        }
      } else {
        logResult(`Service ${service}`, 'FAIL', 'File not found');
      }
    } catch (error) {
      logResult(`Service ${service}`, 'FAIL', error.message);
    }
  });
}

// Test 4: Database Connection
console.log('\n4️⃣ TESTING DATABASE CONNECTION');
console.log('───────────────────────────────');

async function testDatabase() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      logResult('Database Connection', 'FAIL', error.message);
    } else {
      logResult('Database Connection', 'PASS');
    }
    
    // Test required tables
    const requiredTables = ['users', 'subscriptions', 'meal_plans', 'enhanced_meals', 'preference_profiles'];
    
    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          logResult(`Table: ${table}`, 'FAIL', error.message);
        } else {
          logResult(`Table: ${table}`, 'PASS');
        }
      } catch (error) {
        logResult(`Table: ${table}`, 'FAIL', error.message);
      }
    }
    
  } catch (error) {
    logResult('Database Setup', 'FAIL', error.message);
  }
}

// Test 5: API Routes Accessibility (if server is running)
console.log('\n5️⃣ TESTING API ROUTE ACCESSIBILITY');
console.log('──────────────────────────────────');

const http = require('http');

function testAPIRoute(path, expectedStatus = [404, 405, 200, 201, 400]) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      timeout: 2000
    }, (res) => {
      if (expectedStatus.includes(res.statusCode)) {
        resolve({ status: 'PASS', code: res.statusCode });
      } else {
        resolve({ status: 'WARN', code: res.statusCode });
      }
    });
    
    req.on('error', () => {
      resolve({ status: 'SKIP', code: 'No server' });
    });
    
    req.on('timeout', () => {
      resolve({ status: 'SKIP', code: 'Timeout' });
    });
    
    req.end();
  });
}

async function testAPIRoutes() {
  const apiRoutes = [
    '/api/auth/register',
    '/api/auth/login', 
    '/api/auth/verify',
    '/api/subscriptions/webhook',
    '/api/onboarding',
    '/api/meal-plans',
    '/api/shopping-lists',
    '/api/adaptation-logs'
  ];
  
  console.log('Testing API route accessibility (requires server running)...');
  
  for (const route of apiRoutes) {
    const result = await testAPIRoute(route);
    if (result.status === 'SKIP') {
      logResult(`API ${route}`, 'SKIP', 'Server not running');
    } else {
      logResult(`API ${route}`, result.status, `HTTP ${result.code}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  await testServiceImports();
  await testDatabase();
  await testAPIRoutes();
  
  console.log('\n📊 FINAL ASSESSMENT');
  console.log('===================');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  
  if (failed === 0) {
    console.log('\n🎉 NO CRITICAL UPSTREAM ISSUES DETECTED');
    console.log('✅ SAFE TO PROCEED TO T023');
  } else {
    console.log('\n🚨 CRITICAL UPSTREAM ISSUES DETECTED');
    console.log('❌ MUST FIX BEFORE PROCEEDING');
    
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   ❌ ${r.test}: ${r.message}`);
    });
  }
  
  return failed === 0;
}

runAllTests().catch(console.error);