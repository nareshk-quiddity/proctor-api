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

// ==================== AUTH TESTS ====================
async function testAuth() {
    console.log('\n========== AUTHENTICATION TESTS ==========\n');

    try {
        // Test 1: Register Super Admin
        const superAdminData = {
            username: 'superadmin_' + Date.now(),
            email: `superadmin_${Date.now()}@test.com`,
            password: 'password123',
            role: 'super_admin'
        };

        const registerRes = await axios.post(`${API_URL}/auth/register`, superAdminData);
        logTest('Register Super Admin', registerRes.status === 200 && registerRes.data.token);

        const superAdminToken = registerRes.data.token;
        const superAdminId = registerRes.data.user._id;

        // Test 2: Login
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: superAdminData.email,
            password: superAdminData.password
        });
        logTest('Login Super Admin', loginRes.status === 200 && loginRes.data.token);

        // Test 3: Get Profile
        const profileRes = await axios.get(`${API_URL}/auth/profile/${superAdminId}`);
        logTest('Get User Profile', profileRes.status === 200 && profileRes.data.email === superAdminData.email);

        return { superAdminToken, superAdminId, superAdminEmail: superAdminData.email };
    } catch (error) {
        logTest('Authentication Tests', false, error.response?.data?.message || error.message);
        throw error;
    }
}

// ==================== ORGANIZATION TESTS ====================
async function testOrganizations(token) {
    console.log('\n========== ORGANIZATION TESTS ==========\n');

    try {
        // Test 1: Create Organization
        const orgData = {
            name: 'Test Corp ' + Date.now(),
            domain: `test${Date.now()}.com`,
            subscription: {
                plan: 'enterprise',
                maxRecruiters: 5,
                maxJobPostings: 10
            }
        };

        const createRes = await axios.post(`${API_URL}/super-admin/organizations`, orgData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        logTest('Create Organization', createRes.status === 201 && createRes.data._id);

        const orgId = createRes.data._id;

        // Test 2: Get All Organizations
        const listRes = await axios.get(`${API_URL}/super-admin/organizations`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        logTest('List Organizations', listRes.status === 200 && Array.isArray(listRes.data.organizations));

        // Test 3: Get Organization Details
        const detailsRes = await axios.get(`${API_URL}/super-admin/organizations/${orgId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        logTest('Get Organization Details', detailsRes.status === 200 && detailsRes.data._id === orgId);

        return { orgId, orgName: orgData.name };
    } catch (error) {
        logTest('Organization Tests', false, error.response?.data?.message || error.message);
        throw error;
    }
}

// ==================== RECRUITER TESTS ====================
async function testRecruiterWorkflow(orgId) {
    console.log('\n========== RECRUITER WORKFLOW TESTS ==========\n');

    try {
        // Test 1: Register Recruiter
        const recruiterData = {
            username: 'recruiter_' + Date.now(),
            email: `recruiter_${Date.now()}@test.com`,
            password: 'password123',
            role: 'recruiter',
            organizationId: orgId
        };

        const registerRes = await axios.post(`${API_URL}/auth/register`, recruiterData);
        logTest('Register Recruiter', registerRes.status === 200 && registerRes.data.token);

        const recruiterToken = registerRes.data.token;

        // Test 2: Create Job
        const jobData = {
            title: 'Senior Software Engineer',
            description: 'Looking for an experienced software engineer',
            department: 'Engineering',
            employmentType: 'full-time',
            location: {
                city: 'San Francisco',
                state: 'CA',
                country: 'USA',
                remote: true
            },
            requirements: {
                skills: ['JavaScript', 'React', 'Node.js'],
                experience: {
                    minimum: 5,
                    preferred: 7
                },
                education: 'Bachelor\'s degree in Computer Science'
            },
            salary: {
                min: 120000,
                max: 180000,
                currency: 'USD'
            },
            status: 'active'
        };

        const createJobRes = await axios.post(`${API_URL}/recruiter/jobs`, jobData, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Create Job', createJobRes.status === 201 && createJobRes.data._id);

        const jobId = createJobRes.data._id;

        // Test 3: Get Jobs
        const getJobsRes = await axios.get(`${API_URL}/recruiter/jobs`, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Get Recruiter Jobs', getJobsRes.status === 200 && getJobsRes.data.jobs.length > 0);

        // Test 4: Get Job Details
        const jobDetailsRes = await axios.get(`${API_URL}/recruiter/jobs/${jobId}`, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Get Job Details', jobDetailsRes.status === 200 && jobDetailsRes.data._id === jobId);

        // Test 5: Update Job
        const updateJobRes = await axios.put(`${API_URL}/recruiter/jobs/${jobId}`,
            { title: 'Lead Software Engineer' },
            { headers: { Authorization: `Bearer ${recruiterToken}` } }
        );
        logTest('Update Job', updateJobRes.status === 200 && updateJobRes.data.title === 'Lead Software Engineer');

        // Test 6: Paste Resume
        const resumeData = {
            candidateInfo: {
                name: 'John Doe',
                email: 'john.doe@example.com',
                phone: '+1234567890'
            },
            rawText: `John Doe
Software Engineer
john.doe@example.com | +1234567890

EXPERIENCE:
Senior Developer at Tech Corp (2018-2023)
- Developed React applications
- Led team of 5 developers
- Worked with Node.js and MongoDB

SKILLS:
JavaScript, React, Node.js, MongoDB, Python, AWS

EDUCATION:
Bachelor of Science in Computer Science
Stanford University, 2018`
        };

        const pasteResumeRes = await axios.post(`${API_URL}/recruiter/resumes/paste`, resumeData, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Paste Resume', pasteResumeRes.status === 201 && pasteResumeRes.data._id);

        const resumeId = pasteResumeRes.data._id;

        // Test 7: Get Resumes
        const getResumesRes = await axios.get(`${API_URL}/recruiter/resumes`, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Get Resumes', getResumesRes.status === 200 && getResumesRes.data.resumes.length > 0);

        // Test 8: Get Resume Details
        const resumeDetailsRes = await axios.get(`${API_URL}/recruiter/resumes/${resumeId}`, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Get Resume Details', resumeDetailsRes.status === 200 && resumeDetailsRes.data._id === resumeId);

        return { recruiterToken, jobId, resumeId };
    } catch (error) {
        logTest('Recruiter Workflow Tests', false, error.response?.data?.message || error.message);
        throw error;
    }
}

// ==================== PUBLIC JOB TESTS ====================
async function testPublicJobs() {
    console.log('\n========== PUBLIC JOB TESTS ==========\n');

    try {
        // Test 1: Get All Public Jobs
        const listRes = await axios.get(`${API_URL}/jobs`);
        logTest('Get Public Jobs', listRes.status === 200 && Array.isArray(listRes.data.jobs));

        // Test 2: Search Jobs
        const searchRes = await axios.get(`${API_URL}/jobs?search=engineer`);
        logTest('Search Jobs', searchRes.status === 200);

        return true;
    } catch (error) {
        logTest('Public Job Tests', false, error.response?.data?.message || error.message);
        return false;
    }
}

// ==================== ANALYTICS TESTS ====================
async function testAnalytics(recruiterToken, orgId) {
    console.log('\n========== ANALYTICS TESTS ==========\n');

    try {
        // Test 1: Get Recruiter Dashboard Stats
        const dashboardRes = await axios.get(`${API_URL}/analytics/recruiter/dashboard`, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Get Recruiter Dashboard Stats', dashboardRes.status === 200);

        // Test 2: Get Job Analytics
        const jobAnalyticsRes = await axios.get(`${API_URL}/analytics/recruiter/jobs`, {
            headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        logTest('Get Job Analytics', jobAnalyticsRes.status === 200);

        return true;
    } catch (error) {
        logTest('Analytics Tests', false, error.response?.data?.message || error.message);
        return false;
    }
}

// ==================== MAIN TEST RUNNER ====================
async function runAllTests() {
    console.log('\n🚀 Starting Comprehensive API Tests...\n');
    console.log('='.repeat(50));

    try {
        // Run tests in sequence
        const authData = await testAuth();
        const orgData = await testOrganizations(authData.superAdminToken);
        const recruiterData = await testRecruiterWorkflow(orgData.orgId);
        await testPublicJobs();
        await testAnalytics(recruiterData.recruiterToken, orgData.orgId);

        // Print summary
        console.log('\n' + '='.repeat(50));
        console.log('\n📊 TEST SUMMARY\n');
        console.log(`✅ Passed: ${results.passed.length}`);
        console.log(`❌ Failed: ${results.failed.length}`);
        console.log(`📈 Success Rate: ${((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(2)}%`);

        if (results.failed.length > 0) {
            console.log('\n❌ Failed Tests:');
            results.failed.forEach(fail => {
                console.log(`   - ${fail.name}: ${fail.message}`);
            });
        }

        console.log('\n' + '='.repeat(50));
        console.log('\n✨ All tests completed!\n');

    } catch (error) {
        console.error('\n💥 Test suite failed:', error.message);
        console.log('\n📊 Partial Results:');
        console.log(`✅ Passed: ${results.passed.length}`);
        console.log(`❌ Failed: ${results.failed.length + 1}`);
    }
}

// Run tests
runAllTests();
