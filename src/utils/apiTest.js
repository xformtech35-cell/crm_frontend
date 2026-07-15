// src/utils/apiTest.js (temporary file for testing)
export async function testAPI() {
  // Test 1: Create a team
  console.log('Testing team creation...');
  const testTeam = {
    name: 'Test Team',
    description: 'This is a test team'
  };
  
  try {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTeam)
    });
    const team = await response.json();
    console.log('Team created:', team);
    
    // Test 2: Create a team member
    console.log('Testing team member creation...');
    const testMember = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'member',
      teamId: team.id  // Use the ID from created team
    };
    
    const memberResponse = await fetch('/api/team-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMember)
    });
    const member = await memberResponse.json();
    console.log('Team member created:', member);
    
  } catch (error) {
    console.error('API test failed:', error);
  }
}