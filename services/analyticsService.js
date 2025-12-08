const User = require('../models/User');
const Organization = require('../models/Organization');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const JobMatch = require('../models/JobMatch');
const Interview = require('../models/Interview');

/**
 * Get Super Admin Analytics
 */
async function getSuperAdminAnalytics() {
    try {
        const [
            totalOrganizations,
            activeOrganizations,
            totalUsers,
            totalJobs,
            totalResumes,
            totalInterviews,
            recentOrganizations
        ] = await Promise.all([
            Organization.countDocuments(),
            Organization.countDocuments({ status: 'active' }),
            User.countDocuments(),
            Job.countDocuments(),
            Resume.countDocuments(),
            Interview.countDocuments(),
            Organization.find().sort({ createdAt: -1 }).limit(5).select('name createdAt subscriptionPlan')
        ]);

        // User distribution by role
        const usersByRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        // Organizations by subscription plan
        const orgsByPlan = await Organization.aggregate([
            { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } }
        ]);

        // Monthly growth
        const monthlyGrowth = await Organization.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        return {
            overview: {
                totalOrganizations,
                activeOrganizations,
                totalUsers,
                totalJobs,
                totalResumes,
                totalInterviews
            },
            usersByRole,
            orgsByPlan,
            monthlyGrowth,
            recentOrganizations
        };
    } catch (error) {
        console.error('Error getting super admin analytics:', error);
        throw error;
    }
}

/**
 * Get Organization Admin Analytics
 */
async function getOrgAdminAnalytics(organizationId) {
    try {
        const [
            totalRecruiters,
            activeJobs,
            totalResumes,
            totalMatches,
            completedInterviews,
            avgMatchScore
        ] = await Promise.all([
            User.countDocuments({ organizationId, role: 'recruiter' }),
            Job.countDocuments({ organizationId, status: 'active' }),
            Resume.countDocuments({ organizationId }),
            JobMatch.countDocuments({ organizationId }),
            Interview.countDocuments({ organizationId, status: 'completed' }),
            JobMatch.aggregate([
                { $match: { organizationId } },
                { $group: { _id: null, avgScore: { $avg: '$matchScore' } } }
            ])
        ]);

        // Recruiter performance
        const recruiterPerformance = await User.aggregate([
            { $match: { organizationId, role: 'recruiter' } },
            {
                $lookup: {
                    from: 'jobs',
                    localField: '_id',
                    foreignField: 'postedBy',
                    as: 'jobs'
                }
            },
            {
                $project: {
                    username: 1,
                    email: 1,
                    jobCount: { $size: '$jobs' }
                }
            },
            { $sort: { jobCount: -1 } },
            { $limit: 10 }
        ]);

        // Job status distribution
        const jobsByStatus = await Job.aggregate([
            { $match: { organizationId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Resume status distribution
        const resumesByStatus = await Resume.aggregate([
            { $match: { organizationId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        return {
            overview: {
                totalRecruiters,
                activeJobs,
                totalResumes,
                totalMatches,
                completedInterviews,
                avgMatchScore: avgMatchScore[0]?.avgScore || 0
            },
            recruiterPerformance,
            jobsByStatus,
            resumesByStatus
        };
    } catch (error) {
        console.error('Error getting org admin analytics:', error);
        throw error;
    }
}

/**
 * Get Recruiter Analytics
 */
async function getRecruiterAnalytics(recruiterId, organizationId) {
    try {
        const [
            myJobs,
            myResumes,
            myMatches,
            myInterviews,
            topMatches
        ] = await Promise.all([
            Job.countDocuments({ postedBy: recruiterId }),
            Resume.countDocuments({ uploadedBy: recruiterId }),
            JobMatch.countDocuments({ organizationId }),
            Interview.countDocuments({ invitedBy: recruiterId }),
            JobMatch.find({ organizationId })
                .sort({ matchScore: -1 })
                .limit(5)
                .populate('candidateId', 'candidateInfo')
                .populate('jobId', 'title')
        ]);

        // My jobs performance
        const jobsPerformance = await Job.aggregate([
            { $match: { postedBy: recruiterId } },
            {
                $lookup: {
                    from: 'jobmatches',
                    localField: '_id',
                    foreignField: 'jobId',
                    as: 'matches'
                }
            },
            {
                $project: {
                    title: 1,
                    status: 1,
                    matchCount: { $size: '$matches' },
                    createdAt: 1
                }
            },
            { $sort: { matchCount: -1 } }
        ]);

        // Interview completion rate
        const interviewStats = await Interview.aggregate([
            { $match: { invitedBy: recruiterId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        return {
            overview: {
                myJobs,
                myResumes,
                myMatches,
                myInterviews
            },
            jobsPerformance,
            interviewStats,
            topMatches
        };
    } catch (error) {
        console.error('Error getting recruiter analytics:', error);
        throw error;
    }
}

module.exports = {
    getSuperAdminAnalytics,
    getOrgAdminAnalytics,
    getRecruiterAnalytics
};
