import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
let adminToken = '';
let agentToken = '';

async function test() {
    try {
        console.log('1. Logging in as Admin...');
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            identifier: 'test.user2@xcompany.com',
            password: 'password123'
        });
        adminToken = adminLogin.data.token;
        console.log('Admin logged in successfully');

        const adminHeaders = { Authorization: `Bearer ${adminToken}` };

        console.log('\n2. Testing Admin: Get All Users...');
        const usersRes = await axios.get(`${API_URL}/admin/users`, { headers: adminHeaders });
        console.log(`Found ${usersRes.data.length} users`);

        console.log('\n3. Testing Admin: Create New User (Supervisor)...');
        const newUserRes = await axios.post(`${API_URL}/admin/users`, {
            username: 'supervisor_' + Date.now(),
            password: 'password123',
            firstName: 'Super',
            lastName: 'Visor',
            email: `supervisor_${Date.now()}@xcompany.com`,
            role: 'supervisor'
        }, { headers: adminHeaders });
        console.log('Supervisor created:', newUserRes.data.username);
        const supervisorId = newUserRes.data.id;

        console.log('\n4. Testing Admin: Team Status Dashboard...');
        const teamRes = await axios.get(`${API_URL}/admin/team-status`, { headers: adminHeaders });
        console.log(`Team status retrieved, ${teamRes.data.length} members found`);

        console.log('\n5. Testing Access Restriction: Agent trying Admin endpoint...');
        // Register a new agent
        const agentReg = await axios.post(`${API_URL}/auth/register`, {
            username: 'agent_' + Date.now(),
            password: 'password123',
            firstName: 'Normal',
            lastName: 'Agent'
        });
        const agentLogin = await axios.post(`${API_URL}/auth/login`, {
            identifier: agentReg.data.email,
            password: 'password123'
        });
        agentToken = agentLogin.data.token;
        const agentHeaders = { Authorization: `Bearer ${agentToken}` };

        try {
            await axios.get(`${API_URL}/admin/users`, { headers: agentHeaders });
            console.log('ERROR: Agent was able to access Admin endpoint!');
        } catch (e) {
            console.log('Agent access denied as expected:', e.response?.data?.error || e.message);
        }

        console.log('\n6. Testing User Deactivation...');
        const deactivateRes = await axios.patch(`${API_URL}/admin/users/${supervisorId}/deactivate`, {}, { headers: adminHeaders });
        console.log('User deactivated:', deactivateRes.data.message);

        console.log('\n7. Testing Login for Deactivated User...');
        try {
            await axios.post(`${API_URL}/auth/login`, {
                identifier: newUserRes.data.email,
                password: 'password123'
            });
            console.log('ERROR: Deactivated user was able to log in!');
        } catch (e) {
            console.log('Deactivated user login failed as expected:', e.response?.data?.error || e.message);
        }

        console.log('\nVerification Complete!');
    } catch (error) {
        if (error.response) {
            console.error('Verification Failed (Response):', error.response.status, error.response.data);
        } else {
            console.error('Verification Failed:', error.message);
        }
    } finally {
        process.exit();
    }
}

test();
