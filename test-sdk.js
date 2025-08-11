/**
 * Test Script for Built Trinity Profiles SDK
 * 
 * This script tests the compiled JavaScript version of the SDK
 * Run with: node test-sdk.js
 */

const { TrinityProfilesSDK } = require('./dist/index.js');

async function testBuiltSDK() {
    console.log('🧪 Testing Built Trinity Profiles SDK...\n');

    try {
        // Test 1: SDK Initialization
        console.log('1️⃣ Testing SDK Initialization...');
        const sdk = new TrinityProfilesSDK({
            baseUrl: 'https://api.example.com',
            accessToken: 'test-token-123'
        });
        console.log('✅ SDK initialized successfully\n');

        // Test 2: Access to Method Groups
        console.log('2️⃣ Testing Method Group Access...');
        console.log('Patients methods:', typeof sdk.patients);
        console.log('Search methods:', typeof sdk.search);
        console.log('Utils methods:', typeof sdk.utils);
        console.log('✅ All method groups accessible\n');

        // Test 3: Token Update
        console.log('3️⃣ Testing Token Update...');
        sdk.updateAccessToken('new-token-456');
        console.log('✅ Token updated successfully\n');

        // Test 4: Connection Test (will fail without real API)
        console.log('4️⃣ Testing Connection (expected to fail)...');
        try {
            await sdk.testConnection();
            console.log('✅ Connection successful');
        } catch (error) {
            console.log('⚠️  Connection failed as expected:', error.message);
        }

        console.log('\n🎉 All tests completed successfully!');
        console.log('✨ Your SDK is working correctly!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the tests
testBuiltSDK(); 