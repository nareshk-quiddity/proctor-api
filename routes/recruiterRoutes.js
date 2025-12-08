const router = require('express').Router();
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const JobMatch = require('../models/JobMatch');
const Interview = require('../models/Interview');
const Organization = require('../models/Organization');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// ==================== JOB ROUTES ====================

// Get all jobs for recruiter
router.get('/jobs', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const query = {
            recruiterId: req.user._id,
            organizationId: req.user.organizationId
        };
        if (status) query.status = status;

        const jobs = await Job.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Job.countDocuments(query);

        res.json({
            jobs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new job
router.post('/jobs', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        // Check job posting limits
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(400).json({
                message: 'Organization not found. Please contact support.'
            });
        }

        if (organization.subscription.currentJobPostings >= organization.subscription.maxJobPostings) {
            return res.status(400).json({
                message: 'Job posting limit reached. Please upgrade your plan or close existing jobs.'
            });
        }

        const job = new Job({
            ...req.body,
            recruiterId: req.user._id,
            organizationId: req.user.organizationId
        });

        const savedJob = await job.save();

        // Update organization job count
        await Organization.findByIdAndUpdate(req.user.organizationId, {
            $inc: { 'subscription.currentJobPostings': 1 }
        });

        res.status(201).json(savedJob);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get job details
router.get('/jobs/:id', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const job = await Job.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json(job);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update job
router.put('/jobs/:id', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const job = await Job.findOneAndUpdate(
            {
                _id: req.params.id,
                organizationId: req.user.organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json(job);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete job
router.delete('/jobs/:id', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const job = await Job.findOneAndDelete({
            _id: req.params.id,
            organizationId: req.user.organizationId
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Update organization job count
        await Organization.findByIdAndUpdate(req.user.organizationId, {
            $inc: { 'subscription.currentJobPostings': -1 }
        });

        res.json({ message: 'Job deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==================== RESUME ROUTES ====================

// Get all resumes
router.get('/resumes', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;

        const query = { organizationId: req.user.organizationId };
        if (status) query.status = status;

        const resumes = await Resume.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Resume.countDocuments(query);

        res.json({
            resumes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Upload resume (with file parsing) - Auto creates candidate user
const upload = require('../middleware/upload');
const { parseResume, extractBasicInfo } = require('../utils/resumeParser');
const path = require('path');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateRandomPassword } = require('../utils/passwordUtils');
const { sendCandidateCredentialsEmail } = require('../services/emailService');
const InterviewTemplate = require('../models/InterviewTemplate');

router.post('/resumes/upload', verifyToken, checkRole(['recruiter']), upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { candidateName, candidateEmail, candidatePhone, jobId } = req.body;

        // Validate candidate email is required
        if (!candidateEmail) {
            return res.status(400).json({ message: 'Candidate email is required' });
        }

        // Parse the resume file
        const fileType = path.extname(req.file.originalname).substring(1);
        let parsedText = '';
        let extractedInfo = {};

        try {
            parsedText = await parseResume(req.file.path, fileType);
            extractedInfo = extractBasicInfo(parsedText);
        } catch (parseError) {
            console.error('Error parsing resume:', parseError);
            // Continue even if parsing fails
        }

        // Create resume record
        const resume = new Resume({
            organizationId: req.user.organizationId,
            uploadedBy: req.user._id,
            candidateInfo: {
                name: candidateName || 'Unknown',
                email: candidateEmail,
                phone: candidatePhone || extractedInfo.phone || ''
            },
            resumeFile: {
                originalName: req.file.originalname,
                fileUrl: `/uploads/resumes/${req.file.filename}`,
                fileType: fileType,
                fileSize: req.file.size
            },
            parsedData: {
                rawText: parsedText,
                skills: extractedInfo.skills || []
            },
            source: 'upload'
        });

        const savedResume = await resume.save();

        // Generate random password for candidate
        const plainPassword = generateRandomPassword(12);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        // Check if candidate user already exists
        let candidateUser = await User.findOne({ email: candidateEmail.toLowerCase() });

        if (!candidateUser) {
            // Create new candidate user
            candidateUser = new User({
                email: candidateEmail.toLowerCase(),
                username: candidateEmail.split('@')[0] + '_' + Date.now(),
                password: hashedPassword,
                role: 'candidate',
                status: 'active',
                profile: {
                    firstName: candidateName ? candidateName.split(' ')[0] : '',
                    lastName: candidateName ? candidateName.split(' ').slice(1).join(' ') : ''
                },
                resumeId: savedResume._id,
                mustChangePassword: false
            });
            await candidateUser.save();
            console.log(`✅ Created candidate user: ${candidateEmail}`);
        } else {
            // Update existing user's password and resume
            candidateUser.password = hashedPassword;
            candidateUser.resumeId = savedResume._id;
            await candidateUser.save();
            console.log(`✅ Updated existing candidate user: ${candidateEmail}`);
        }

        // Create interview with 3 day expiration
        const accessToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 3); // 3 days expiration

        // Get default job or use provided jobId
        let job = null;
        let jobTitle = 'Open Position';
        if (jobId) {
            job = await Job.findById(jobId);
            if (job) jobTitle = job.title;
        }

        // Create interview record
        const interview = new Interview({
            candidateId: savedResume._id,
            candidateName: candidateName || 'Candidate',
            candidateEmail: candidateEmail,
            jobId: jobId || null,
            jobMatchId: null, // No match yet
            organizationId: req.user.organizationId,
            invitedBy: req.user._id,
            accessToken: accessToken,
            invitationSentAt: new Date(),
            expiresAt: expiresAt,
            status: 'invited',
            questions: []
        });

        // Only save interview if we have a jobId
        let savedInterview = null;
        if (jobId) {
            savedInterview = await interview.save();

            // Update candidate user with interview reference
            candidateUser.interviewId = savedInterview._id;
            await candidateUser.save();
        }

        // Send credentials email with interview link
        try {
            await sendCandidateCredentialsEmail(
                candidateEmail,
                candidateName || 'Candidate',
                plainPassword,
                accessToken,
                jobTitle,
                expiresAt
            );
            console.log(`📧 Credentials email sent to: ${candidateEmail}`);
        } catch (emailError) {
            console.error('Failed to send credentials email:', emailError);
        }

        res.status(201).json({
            resume: savedResume,
            candidate: {
                id: candidateUser._id,
                email: candidateEmail,
                passwordSent: true
            },
            interview: savedInterview ? {
                id: savedInterview._id,
                accessToken: accessToken,
                expiresAt: expiresAt
            } : null,
            message: 'Resume uploaded, candidate created, and credentials sent via email'
        });
    } catch (err) {
        console.error('Resume upload error:', err);
        res.status(400).json({ message: err.message });
    }
});

// Bulk upload resumes
router.post('/resumes/bulk-upload', verifyToken, checkRole(['recruiter']), upload.array('resumes', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const results = {
            successful: [],
            failed: []
        };

        for (const file of req.files) {
            try {
                const fileType = path.extname(file.originalname).substring(1);
                let parsedText = '';
                let extractedInfo = {};

                try {
                    parsedText = await parseResume(file.path, fileType);
                    extractedInfo = extractBasicInfo(parsedText);
                } catch (parseError) {
                    console.error('Error parsing resume:', parseError);
                }

                const resume = new Resume({
                    organizationId: req.user.organizationId,
                    uploadedBy: req.user._id,
                    candidateInfo: {
                        name: extractedInfo.name || 'Unknown',
                        email: extractedInfo.email || '',
                        phone: extractedInfo.phone || ''
                    },
                    resumeFile: {
                        originalName: file.originalname,
                        fileUrl: `/uploads/resumes/${file.filename}`,
                        fileType: fileType,
                        fileSize: file.size
                    },
                    parsedData: {
                        rawText: parsedText,
                        skills: extractedInfo.skills || []
                    },
                    source: 'upload'
                });

                const savedResume = await resume.save();
                results.successful.push({
                    filename: file.originalname,
                    resumeId: savedResume._id
                });
            } catch (error) {
                results.failed.push({
                    filename: file.originalname,
                    error: error.message
                });
            }
        }

        res.json(results);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Paste resume text
router.post('/resumes/paste', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const { candidateInfo, rawText } = req.body;

        const extractedInfo = extractBasicInfo(rawText);

        const resume = new Resume({
            organizationId: req.user.organizationId,
            uploadedBy: req.user._id,
            candidateInfo: {
                name: candidateInfo?.name || 'Unknown',
                email: candidateInfo?.email || extractedInfo.email || '',
                phone: candidateInfo?.phone || extractedInfo.phone || ''
            },
            parsedData: {
                rawText,
                skills: extractedInfo.skills || []
            },
            source: 'paste'
        });

        const savedResume = await resume.save();
        res.status(201).json(savedResume);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get resume details
router.get('/resumes/:id', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const resume = await Resume.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        }).populate('uploadedBy', 'username email');

        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        res.json(resume);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete resume
router.delete('/resumes/:id', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const resume = await Resume.findOneAndDelete({
            _id: req.params.id,
            organizationId: req.user.organizationId
        });

        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        res.json({ message: 'Resume deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==================== MATCHING ROUTES ====================

const { calculateMatchScore } = require('../services/aiService');
const MatchingConfig = require('../models/MatchingConfig');

// Match job with resumes
router.post('/match', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const { jobId, resumeIds } = req.body;

        // Verify job belongs to recruiter's organization
        const job = await Job.findOne({
            _id: jobId,
            organizationId: req.user.organizationId
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Get matching configuration
        let config = await MatchingConfig.findOne({
            organizationId: req.user.organizationId
        });

        if (!config) {
            // Create default config if not exists
            config = new MatchingConfig({
                organizationId: req.user.organizationId
            });
            await config.save();
        }

        const matches = [];
        for (const resumeId of resumeIds) {
            const resume = await Resume.findOne({
                _id: resumeId,
                organizationId: req.user.organizationId
            });

            if (resume) {
                // Use AI to calculate match score
                const matchAnalysis = await calculateMatchScore(job, resume);

                // Apply custom weights from config
                const weightedScore = (
                    matchAnalysis.skillMatch.score * config.weights.skillMatch +
                    matchAnalysis.experienceMatch.score * config.weights.experienceMatch +
                    matchAnalysis.educationMatch.score * config.weights.educationMatch +
                    matchAnalysis.cultureFit.score * config.weights.cultureFit
                );

                const match = new JobMatch({
                    jobId,
                    candidateId: resumeId,
                    organizationId: req.user.organizationId,
                    matchScore: Math.round(weightedScore),
                    matchDetails: {
                        skillMatch: matchAnalysis.skillMatch,
                        experienceMatch: matchAnalysis.experienceMatch,
                        educationMatch: matchAnalysis.educationMatch,
                        cultureFit: matchAnalysis.cultureFit,
                        overallFit: Math.round(weightedScore)
                    },
                    skillGaps: matchAnalysis.skillMatch.missing || [],
                    strengths: matchAnalysis.skillMatch.matched || [],
                    aiRecommendation: {
                        decision: matchAnalysis.recommendation,
                        reasoning: matchAnalysis.reasoning,
                        confidence: matchAnalysis.confidence
                    }
                });

                // Auto-reject if below threshold
                if (config.autoMatchingEnabled &&
                    weightedScore < config.thresholds.autoRejectScore) {
                    match.recruiterReview.status = 'rejected';
                    match.recruiterReview.notes = 'Auto-rejected: Below minimum threshold';
                }

                const savedMatch = await match.save();
                matches.push(savedMatch);

                // Update resume status
                if (weightedScore >= config.thresholds.minimumMatchScore) {
                    await Resume.findByIdAndUpdate(resumeId, { status: 'matched' });
                }
            }
        }

        res.json({ matches, count: matches.length });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get matches for a job
router.get('/matches/:jobId', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const matches = await JobMatch.find({
            jobId: req.params.jobId,
            organizationId: req.user.organizationId
        })
            .populate('candidateId')
            .sort({ matchScore: -1 });

        res.json(matches);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Review match (approve/reject)
router.put('/matches/:id/review', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const { status, notes } = req.body;

        const match = await JobMatch.findOneAndUpdate(
            {
                _id: req.params.id,
                organizationId: req.user.organizationId
            },
            {
                'recruiterReview.status': status,
                'recruiterReview.notes': notes,
                'recruiterReview.reviewedBy': req.user._id,
                'recruiterReview.reviewedAt': new Date()
            },
            { new: true }
        );

        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        res.json(match);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ==================== INTERVIEW ROUTES ====================

// Send interview invitation
// Send interview invitation
router.post('/interviews/invite', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const { matchId, templateId, expiresInDays = 7 } = req.body;

        const match = await JobMatch.findOne({
            _id: matchId,
            organizationId: req.user.organizationId
        })
            .populate('candidateId') // Populate resume to get email
            .populate('jobId');      // Populate job to get title

        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        // Generate unique access token
        const crypto = require('crypto');
        const accessToken = crypto.randomBytes(32).toString('hex');

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const interview = new Interview({
            jobMatchId: matchId,
            candidateId: match.candidateId._id,
            jobId: match.jobId._id,
            organizationId: req.user.organizationId,
            invitedBy: req.user._id,
            templateId,
            accessToken,
            invitationSentAt: new Date(),
            expiresAt,
            questions: [] // Will be populated from template
        });

        const savedInterview = await interview.save();

        // Update match
        await JobMatch.findByIdAndUpdate(matchId, {
            interviewScheduled: true,
            interviewId: savedInterview._id
        });

        // Send email to candidate
        const candidateEmail = match.candidateId.candidateInfo.email;
        const candidateName = match.candidateId.candidateInfo.name || 'Candidate';
        const jobTitle = match.jobId.title;

        // Use configured frontend URL or default to localhost:3001
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const interviewLink = `${frontendUrl}/interview/${accessToken}`;

        if (candidateEmail) {
            const emailHtml = `
                <h2>Interview Invitation</h2>
                <p>Dear ${candidateName},</p>
                <p>You have been invited to an interview for the position of <strong>${jobTitle}</strong>.</p>
                <p>Please click the link below to start your interview:</p>
                <p><a href="${interviewLink}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Start Interview</a></p>
                <p>Or copy this link: ${interviewLink}</p>
                <p>This link will expire on ${expiresAt.toLocaleDateString()}.</p>
                <br>
                <p>Best regards,</p>
                <p>Recruiting Team</p>
            `;

            await sendEmail(candidateEmail, `Interview Invitation: ${jobTitle}`, emailHtml);
        }

        res.status(201).json(savedInterview);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get all interviews
router.get('/interviews', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const query = { organizationId: req.user.organizationId };
        if (status) query.status = status;

        const interviews = await Interview.find(query)
            .populate('candidateId', 'candidateInfo')
            .populate('jobId', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Interview.countDocuments(query);

        res.json({
            interviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get interview results
router.get('/interviews/:id', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const interview = await Interview.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        })
            .populate('candidateId')
            .populate('jobId')
            .populate('invitedBy', 'username email');

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        res.json(interview);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Send interview feedback
const { sendEmail } = require('../services/emailService');

router.post('/interviews/:id/feedback', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const { feedback, rating } = req.body;

        const interview = await Interview.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        }).populate('candidateId'); // To get candidate email

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        // Update interview with feedback
        interview.feedback = {
            candidateRating: rating,
            candidateComments: feedback,
            submittedAt: new Date()
        };
        await interview.save();

        // Send email to candidate
        const candidateEmail = interview.candidateEmail || interview.candidateId?.candidateInfo?.email;
        const candidateName = interview.candidateName || interview.candidateId?.candidateInfo?.name || 'Candidate';

        if (candidateEmail) {
            const emailHtml = `
                <h2>Interview Feedback</h2>
                <p>Dear ${candidateName},</p>
                <p>Thank you for completing the interview for ${interview.jobId.title}.</p>
                <p><strong>Recruiter Feedback:</strong></p>
                <p>${feedback}</p>
                <p><strong>Rating:</strong> ${rating}/5</p>
                <br>
                <p>Best regards,</p>
                <p>Recruiting Team</p>
            `;

            await sendEmail(candidateEmail, 'Interview Feedback', emailHtml);
        }

        res.json({ message: 'Feedback sent successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
