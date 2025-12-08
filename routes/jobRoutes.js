const router = require('express').Router();
const Job = require('../models/Job');

// Get all public jobs
router.get('/', async (req, res) => {
    try {
        const { search, type, location } = req.query;
        const query = { status: 'active' };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'requirements.skills': { $regex: search, $options: 'i' } }
            ];
        }

        if (type) {
            query.employmentType = type;
        }

        if (location) {
            query['location.city'] = { $regex: location, $options: 'i' };
        }

        const jobs = await Job.find(query)
            .select('-applications -stats') // Exclude sensitive data
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ jobs });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single job details
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findOne({ _id: req.params.id, status: 'active' })
            .select('-applications -stats');

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json(job);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
