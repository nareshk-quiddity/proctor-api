const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test results tracker
const results = {
    passed: [],
    failed: []
};

function logTest(name, passed, message = '') {
    if (passed) {
        results.passed.push(name);
        console.log(`✅ ${name}`);
    } else {
        results.failed.push({ name, message });
        console.log(`❌ ${name}: ${message}`);
    }
}

async function testCompleteWorkflow() {
    console.log('\n🚀 Testing Complete Role-Based Workflow...\n');
    console.log('='.repeat(70));

    try {
        // ==================== SUPER ADMIN TESTS ====================
        console.log('\n========== SUPER ADMIN WORKFLOW ==========\n');

        // 1. Create Super Admin
        const superAdminData = {
            username: 'superadmin_' + Date.now(),
            email: `superadmin_${Date.now()}@test.com`,
            password: 'password123',
            role: 'super_admin'
        };

        const superAdminRes = await axios.post(`${API_URL}/auth/register`, superAdminData);
        logTest('Super Admin: Register', superAdminRes.status === 200);
        const superAdminToken = superAdminRes.data.token;

        // 2. Create Organization
        const orgData = {
            name: 'Test Company ' + Date.now(),
            domain: `testco${Date.now()}.com`,
            subscription: {
                plan: 'enterprise',
                maxRecruiters: 10,
                maxJobPostings: 50
            }
        };

        const orgRes = await axios.post(`${API_URL}/super-admin/organizations`, orgData, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        logTest('Super Admin: Create Organization', orgRes.status === 201);
        const orgId = orgRes.data._id;

        // 3. Create Customer Admin
        const customerAdminData = {
            username: 'customeradmin_' + Date.now(),
            email: `customeradmin_${Date.now()}@test.com`,
            password: 'password123',
            role: 'customer_admin',
            organizationId: orgId
        };

        const customerAdminRes = await axios.post(`${API_URL}/auth/register`, customerAdminData);
        logTest('Super Admin: Create Customer Admin', customerAdminRes.status === 200);

        // 4. Get All Users (Super Admin monitoring)
        const usersRes = await axios.get(`${API_URL}/super-admin/users`, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        logTest('Super Admin: Monitor All Users', usersRes.status === 200);

        // 5. Get Platform Analytics
        const platformAnalyticsRes = await axios.get(`${API_URL}/super-admin/analytics`, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        logTest('Super Admin: Platform Analytics', platformAnalyticsRes.status === 200);

        // ==================== CUSTOMER ADMIN TESTS ====================
        console.log('\n========== CUSTOMER ADMIN WORKFLOW ==========\n');

        // 1. Login as Customer Admin
        const customerAdminLogin = await axios.post(`${API_URL}/auth/login`, {
            email: customerAdminData.email,
            password: customerAdminData.password
        });
        logTest('Customer Admin: Login', customerAdminLogin.status === 200);
        const customerAdminToken = customerAdminLogin.data.token;

        // 2. Get Organization Settings
        const settingsRes = await axios.get(`${API_URL}/org-admin/settings`, {
            headers: { Authorization: `Bearer ${customerAdminToken}` }
        });
        logTest('Customer Admin: Get Organization Settings', settingsRes.status === 200);

        // 3. Create Recruiter
        const recruiterData = {
            username: 'recruiter_' + Date.now(),
            email: `recruiter_${Date.now()}@test.com`,
            password: 'password123',
            profile: {
                firstName: 'John',
                lastName: 'Recruiter'
            }
        };

        const createRecruiterRes = await axios.post(`${API_URL}/org-admin/recruiters`, recruiterData, {
            headers: { Authorization: `Bearer ${customerAdminToken}` }
        });
        logTest('Customer Admin: Create Recruiter', createRecruiterRes.status === 201);
        const recruiterId = createRecruiterRes.data._id;

        // 4. Get All Recruiters
        const recruitersRes = await axios.get(`${API_URL}/org-admin/recruiters`, {
            headers: { Authorization: `Bearer ${customerAdminToken}` }
        });
        logTest('Customer Admin: List Recruiters', recruitersRes.status === 200);

        // 5. Update Recruiter
        const updateRecruiterRes = await axios.put(`${API_URL}/org-admin/recruiters/${recruiterId}`,
            { profile: { firstName: 'Jane' } },
            { headers: { Authorization: `Bearer ${customerAdminToken}` } }
        );
        logTest('Customer Admin: Update Recruiter', updateRecruiterRes.status === 200);

        // 6. Get Organization Analytics
        const orgAnalyticsRes = await axios.get(`${API_URL}/org-admin/analytics`, {
            headers: { Authorization: `Bearer ${customerAdminToken}` }
        });
        logTest('Customer Admin: Organization Analytics', orgAnalyticsRes.status === 200);

        // ==================== RECRUITER TESTS ====================
        console.log('\n========== RECRUITER WORKFLOW ==========\n');

        // 1. Login as Recruiter
        const recruiterLogin = await axios.post(`${API_URL}/auth/login`, {
            email: recruiterData.email,
            password: recruiterData.password
        });
        logTest('Recruiter: Login', recruiterLogin.status === 200);
        const recruiterToken = recruiterLogin.data.token;

        // 2. Create Job
        const jobData = {
            title: 'Senior Software Engineer',
            description: 'We are looking for an experienced software engineer',
            department: 'Engineering',
            employmentType: 'full-time',
            location: {
                city: 'San Francisco',
                state: 'CA',
                country: 'USA',
                remote: true
            },
            requirements: {
                skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
                experience: { minimum: 5, preferred: 7 },
                education: 'Bachelor\'s degree in Computer Science'
            },
            salary: { min: 120000, max: 180000, currency: 'USD' },
            status: 'active'
        };

        const createJobRes = await axios.post(`${API_URL}/recruiter/jobs`, jobData, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Recruiter: Create Job', createJobRes.status === 201);
        const jobId = createJobRes.data._id;

        // 3. Upload/Paste Resume
        const resumeData = {
            candidateInfo: {
                name: 'Alice Johnson',
                email: 'alice.johnson@example.com',
                phone: '+1234567890'
            },
            rawText: `Alice Johnson
Senior Software Engineer
alice.johnson@example.com | +1234567890

EXPERIENCE:
Lead Developer at Tech Innovations (2018-2024)
- Led development of React-based applications
- Managed team of 8 developers
- Implemented microservices architecture with Node.js
- Worked extensively with MongoDB and PostgreSQL

SKILLS:
JavaScript, TypeScript, React, Node.js, MongoDB, PostgreSQL, AWS, Docker, Kubernetes

EDUCATION:
Master of Science in Computer Science
MIT, 2018`
        };

        const pasteResumeRes = await axios.post(`${API_URL}/recruiter/resumes/paste`, resumeData, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Recruiter: Upload Resume', pasteResumeRes.status === 201);
        const resumeId = pasteResumeRes.data._id;

        // 4. Match Resume with Job (AI Analysis)
        const matchRes = await axios.post(`${API_URL}/recruiter/match`,
            { jobId, resumeIds: [resumeId] },
            { headers: { Authorization: `Bearer ${recruiterToken}` } }
        );
        logTest('Recruiter: AI Resume Analysis & Matching', matchRes.status === 200);
        const matchId = matchRes.data.matches[0]._id;

        // 5. Get Matches (Pending Candidates List)
        const matchesRes = await axios.get(`${API_URL}/recruiter/matches/${jobId}`, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Recruiter: View Pending Candidates', matchesRes.status === 200);

        // 6. Review Match (Approve for Interview)
        const reviewRes = await axios.put(`${API_URL}/recruiter/matches/${matchId}/review`,
            { status: 'approved', notes: 'Excellent match, proceed to interview' },
            { headers: { Authorization: `Bearer ${recruiterToken}` } }
        );
        logTest('Recruiter: Review & Approve Candidate', reviewRes.status === 200);

        // 7. Send Interview Invitation (Email with Link)
        const interviewRes = await axios.post(`${API_URL}/recruiter/interviews/invite`,
            { matchId, expiresInDays: 7 },
            { headers: { Authorization: `Bearer ${recruiterToken}` } }
        );
        logTest('Recruiter: Send Interview Link via Email', interviewRes.status === 201);
        const interviewId = interviewRes.data._id;
        const interviewToken = interviewRes.data.accessToken;

        console.log(`\n📧 Interview Link: http://localhost:3000/interview/${interviewToken}`);

        // 8. Get Recruiter Dashboard
        const recruiterDashboardRes = await axios.get(`${API_URL}/analytics/recruiter/dashboard`, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Recruiter: Dashboard Analytics', recruiterDashboardRes.status === 200);

        // 9. Get Interviews List
        const interviewsRes = await axios.get(`${API_URL}/recruiter/interviews`, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Recruiter: Monitor Interviews', interviewsRes.status === 200);

        // ==================== CANDIDATE WORKFLOW ====================
        console.log('\n========== CANDIDATE WORKFLOW ==========\n');

        // Note: In real scenario, candidate would:
        // 1. Click email link
        // 2. Create profile (if first time)
        // 3. Login
        // 4. Attend interview
        // 5. Submit answers
        // 6. View results (recruiter cannot access)

        console.log('📝 Candidate Flow (Simulated):');
        console.log('   1. Candidate receives email with interview link');
        console.log('   2. Clicks link: http://localhost:3000/interview/' + interviewToken);
        console.log('   3. Creates profile (self-registration)');
        console.log('   4. Logs in and attends interview');
        console.log('   5. Submits interview answers');
        console.log('   6. Views results (recruiter has no access to this)');

        // ==================== CLEANUP TEST ====================
        console.log('\n========== ADMIN CLEANUP TESTS ==========\n');

        // Customer Admin: Delete Recruiter
        const deleteRecruiterRes = await axios.delete(`${API_URL}/org-admin/recruiters/${recruiterId}`, {
            headers: { Authorization: `Bearer ${customerAdminToken}` }
        });
        logTest('Customer Admin: Delete Recruiter', deleteRecruiterRes.status === 200);

        // Super Admin: Update Organization
        const updateOrgRes = await axios.put(`${API_URL}/super-admin/organizations/${orgId}`,
            { status: 'active' },
            { headers: { Authorization: `Bearer ${superAdminToken}` } }
        );
        logTest('Super Admin: Update Organization', updateOrgRes.status === 200);

        // Print summary
        console.log('\n' + '='.repeat(70));
        console.log('\n📊 WORKFLOW TEST SUMMARY\n');
        console.log(`✅ Passed: ${results.passed.length}`);
        console.log(`❌ Failed: ${results.failed.length}`);
        console.log(`📈 Success Rate: ${((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(2)}%`);

        if (results.failed.length > 0) {
            console.log('\n❌ Failed Tests:');
            results.failed.forEach(fail => {
                console.log(`   - ${fail.name}: ${fail.message}`);
            });
        }

        console.log('\n' + '='.repeat(70));
        console.log('\n✨ Complete Workflow Test Finished!\n');

    } catch (error) {
        console.error('\n💥 Test failed:', error.response?.data?.message || error.message);
        console.log('\n📊 Partial Results:');
        console.log(`✅ Passed: ${results.passed.length}`);
        console.log(`❌ Failed: ${results.failed.length + 1}`);
    }
}

// Run tests
testCompleteWorkflow();
