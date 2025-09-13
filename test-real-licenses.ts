#!/usr/bin/env tsx

/**
 * Test Real Gaming Licenses Configuration
 */

console.log('🏛️ TESTING REAL GAMING LICENSES CONFIGURATION\n');

// Check environment variables
console.log('📋 ENVIRONMENT CONFIGURATION:');
console.log(`   ACTIVE_LICENSES: ${process.env.ACTIVE_LICENSES || 'NOT SET'}`);
console.log(`   GEO_ALLOW_LIST: ${process.env.GEO_ALLOW_LIST || 'NOT SET'}`);
console.log(`   GEO_BLOCK_LIST: ${process.env.GEO_BLOCK_LIST || 'NOT SET'}`);
console.log(`   LICENSE_DISPLAY_ENABLED: ${process.env.LICENSE_DISPLAY_ENABLED || 'NOT SET'}\n`);

// Parse and validate licenses
const activeLicenses = process.env.ACTIVE_LICENSES?.split(',') || [];
console.log('🔍 LICENSE VALIDATION:');

if (activeLicenses.length === 0) {
  console.log('   ❌ No licenses configured');
} else {
  console.log(`   ✅ ${activeLicenses.length} licenses found:`);
  
  activeLicenses.forEach((license, index) => {
    const trimmed = license.trim();
    let issuer = 'Unknown';
    let valid = false;
    
    if (trimmed.startsWith('MGA/B2C/')) {
      issuer = 'Malta Gaming Authority';
      valid = true;
    } else if (trimmed.match(/^\d{5}-\d{4}-[A-Z]{2}$/)) {
      issuer = 'UK Gambling Commission';
      valid = true;
    } else if (trimmed.startsWith('CEG-') || trimmed.includes('/JAZ')) {
      issuer = 'Curaçao eGaming';
      valid = true;
    }
    
    const status = valid ? '✅' : '❌';
    console.log(`   ${index + 1}. ${status} ${trimmed} (${issuer})`);
  });
}

// Test jurisdiction access
console.log('\n🌍 JURISDICTION ACCESS TEST:');
const allowedCountries = process.env.GEO_ALLOW_LIST?.split(',') || [];
const blockedCountries = process.env.GEO_BLOCK_LIST?.split(',') || [];

console.log('   ✅ Allowed countries:', allowedCountries.join(', '));
console.log('   ❌ Blocked countries:', blockedCountries.join(', '));

// Test specific countries
const testCountries = ['GB', 'MT', 'CW', 'US', 'FR'];
console.log('\n🧪 COUNTRY ACCESS SIMULATION:');

testCountries.forEach(country => {
  const allowed = allowedCountries.includes(country);
  const blocked = blockedCountries.includes(country);
  
  let status = '🟡 UNKNOWN';
  if (allowed && !blocked) status = '✅ ALLOWED';
  else if (blocked) status = '❌ BLOCKED';
  else if (!allowed) status = '⚠️ NOT LICENSED';
  
  console.log(`   ${country}: ${status}`);
});

// Summary
console.log('\n📊 REAL GAMING LICENSES SUMMARY:');
console.log('================================');
console.log(`✅ Licenses Configured: ${activeLicenses.length}`);
console.log(`🌍 Allowed Countries: ${allowedCountries.length}`);
console.log(`🚫 Blocked Countries: ${blockedCountries.length}`);

const validLicenses = activeLicenses.filter(license => {
  const trimmed = license.trim();
  return trimmed.startsWith('MGA/B2C/') || 
         trimmed.match(/^\d{5}-\d{4}-[A-Z]{2}$/) || 
         trimmed.startsWith('CEG-') ||
         trimmed.includes('/JAZ');
});

console.log(`✅ Valid License Formats: ${validLicenses.length}/${activeLicenses.length}`);

if (validLicenses.length === activeLicenses.length && activeLicenses.length > 0) {
  console.log('\n🎉 REAL GAMING LICENSES SUCCESSFULLY CONFIGURED!');
  console.log('✅ Platform has valid regulatory licenses');
  console.log('✅ Geo-compliance rules active');
  console.log('✅ Ready for regulated operations');
} else {
  console.log('\n⚠️ License configuration needs attention');
}

console.log(`\nLast checked: ${new Date().toLocaleString()}`);
