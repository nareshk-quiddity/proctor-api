const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;

/**
 * Parse resume file based on file type
 * @param {string} filePath - Path to the resume file
 * @param {string} fileType - Type of file (pdf, doc, docx, txt)
 * @returns {Promise<string>} - Extracted text from the resume
 */
async function parseResume(filePath, fileType) {
    try {
        let text = '';

        switch (fileType.toLowerCase()) {
            case 'pdf':
                const dataBuffer = await fs.readFile(filePath);
                const pdfData = await pdfParse(dataBuffer);
                text = pdfData.text;
                break;

            case 'doc':
            case 'docx':
                const result = await mammoth.extractRawText({ path: filePath });
                text = result.value;
                break;

            case 'txt':
                text = await fs.readFile(filePath, 'utf8');
                break;

            default:
                throw new Error('Unsupported file type');
        }

        return text;
    } catch (error) {
        console.error('Error parsing resume:', error);
        throw error;
    }
}

/**
 * Extract basic information from resume text
 * This is a simple extraction - in production, you'd use AI/NLP
 * @param {string} text - Resume text
 * @returns {Object} - Extracted information
 */
function extractBasicInfo(text) {
    const extracted = {
        skills: [],
        experience: [],
        education: [],
        languages: []
    };

    // Simple skill extraction (looking for common tech skills)
    const commonSkills = [
        'JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'Angular', 'Vue',
        'SQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes', 'Git', 'TypeScript',
        'HTML', 'CSS', 'Express', 'Django', 'Flask', 'Spring', 'PostgreSQL'
    ];

    commonSkills.forEach(skill => {
        if (text.toLowerCase().includes(skill.toLowerCase())) {
            extracted.skills.push(skill);
        }
    });

    // Extract email
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
        extracted.email = emailMatch[0];
    }

    // Extract phone
    const phoneMatch = text.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
        extracted.phone = phoneMatch[0];
    }

    return extracted;
}

module.exports = {
    parseResume,
    extractBasicInfo
};
