const mongoose = require('mongoose');

/**
 * Performance optimization utilities
 */

// Add indexes to frequently queried fields
async function optimizeIndexes() {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();

        console.log('Optimizing database indexes...');

        // User indexes
        await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
        await mongoose.connection.collection('users').createIndex({ organizationId: 1, role: 1 });

        // Job indexes
        await mongoose.connection.collection('jobs').createIndex({ organizationId: 1, status: 1 });
        await mongoose.connection.collection('jobs').createIndex({ postedBy: 1 });
        await mongoose.connection.collection('jobs').createIndex({ 'requirements.skills': 1 });

        // Resume indexes
        await mongoose.connection.collection('resumes').createIndex({ organizationId: 1, status: 1 });
        await mongoose.connection.collection('resumes').createIndex({ uploadedBy: 1 });
        await mongoose.connection.collection('resumes').createIndex({ 'parsedData.skills': 1 });

        // JobMatch indexes
        await mongoose.connection.collection('jobmatches').createIndex({ jobId: 1, matchScore: -1 });
        await mongoose.connection.collection('jobmatches').createIndex({ organizationId: 1, matchScore: -1 });

        // Interview indexes
        await mongoose.connection.collection('interviews').createIndex({ accessToken: 1 }, { unique: true });
        await mongoose.connection.collection('interviews').createIndex({ candidateId: 1 });
        await mongoose.connection.collection('interviews').createIndex({ jobId: 1, status: 1 });

        // Notification indexes
        await mongoose.connection.collection('notifications').createIndex({ userId: 1, read: 1 });
        await mongoose.connection.collection('notifications').createIndex({ createdAt: -1 });

        console.log('Database indexes optimized successfully');
    } catch (error) {
        console.error('Error optimizing indexes:', error);
    }
}

/**
 * Clean up old data
 */
async function cleanupOldData() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Delete old read notifications
        const deletedNotifications = await mongoose.connection.collection('notifications').deleteMany({
            read: true,
            readAt: { $lt: thirtyDaysAgo }
        });

        console.log(`Deleted ${deletedNotifications.deletedCount} old notifications`);

        // Mark expired interviews
        const expiredInterviews = await mongoose.connection.collection('interviews').updateMany(
            {
                status: { $in: ['invited', 'in_progress'] },
                expiresAt: { $lt: new Date() }
            },
            {
                $set: { status: 'expired' }
            }
        );

        console.log(`Marked ${expiredInterviews.modifiedCount} interviews as expired`);
    } catch (error) {
        console.error('Error cleaning up old data:', error);
    }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
    try {
        const stats = await mongoose.connection.db.stats();

        return {
            collections: stats.collections,
            dataSize: (stats.dataSize / 1024 / 1024).toFixed(2) + ' MB',
            storageSize: (stats.storageSize / 1024 / 1024).toFixed(2) + ' MB',
            indexes: stats.indexes,
            indexSize: (stats.indexSize / 1024 / 1024).toFixed(2) + ' MB'
        };
    } catch (error) {
        console.error('Error getting database stats:', error);
        return null;
    }
}

module.exports = {
    optimizeIndexes,
    cleanupOldData,
    getDatabaseStats
};
