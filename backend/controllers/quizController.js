const pool = require('../config/database');

/**
 * Helper function to parse options from various formats
 */
const parseOptions = (optionText) => {
    let options = [];
    const text = optionText || '';

    try {
        options = JSON.parse(text);
    } catch (e) {
        if (text.match(/[a-d]\)/i)) {
            const matches = text.match(/[a-d]\)\s*[^a-d)]+/gi);
            if (matches) {
                options = matches.map(opt => opt.trim());
            }
        } else {
            options = text.split(/[,|;]/).map(opt => opt.trim()).filter(opt => opt);
        }
    }

    if (options.length === 0 && text) {
        options = [text];
    }

    return options;
};

/**
 * Generate a unique paper ID (numeric, fits in INT)
 */
const generatePaperId = () => {
    // Generate ID that fits in INT range (max ~2 billion)
    // Use last 6 digits of timestamp + 3 digit random = max 9 digits
    const timestamp = Date.now() % 1000000; // Last 6 digits
    const random = Math.floor(Math.random() * 1000); // 3 digits
    return timestamp * 1000 + random; // Max: 999999999 (fits in INT)
};

/**
 * Get balanced initial diagnostic quiz (50 questions)
 * Distribution: 40-40-20 difficulty across 3 domains
 * - Analytical Thinking (16): 7 Easy, 6 Medium, 3 Hard
 * - Computational Thinking (17): 7 Easy, 7 Medium, 3 Hard
 * - Programming (17): 6 Easy, 7 Medium, 4 Hard
 */
const getInitialQuiz = async (req, res) => {
    try {
        const userId = req.user.id;

        // Define the balanced distribution
        const distribution = [
            { category: 'Analytical Thinking', difficulty: 'Easy', count: 7 },
            { category: 'Analytical Thinking', difficulty: 'Moderate', count: 6 },
            { category: 'Analytical Thinking', difficulty: 'Hard', count: 3 },
            { category: 'Computational Thinking', difficulty: 'Easy', count: 7 },
            { category: 'Computational Thinking', difficulty: 'Moderate', count: 7 },
            { category: 'Computational Thinking', difficulty: 'Hard', count: 3 },
            { category: 'Programming', difficulty: 'Easy', count: 6 },
            { category: 'Programming', difficulty: 'Moderate', count: 7 },
            { category: 'Programming', difficulty: 'Hard', count: 4 },
        ];

        let allQuestions = [];

        // Fetch questions for each category/difficulty combination
        for (const dist of distribution) {
            // Note: LIMIT cannot be parameterized in MySQL prepared statements
            const [questions] = await pool.execute(
                `SELECT q_ID, question, option_text, correct_answer, category, difficulty_rate 
                 FROM quiz_bank 
                 WHERE category = ? AND TRIM(difficulty_rate) = ?
                 ORDER BY RAND() 
                 LIMIT ${parseInt(dist.count)}`,
                [dist.category, dist.difficulty]
            );
            allQuestions = allQuestions.concat(questions);
        }

        if (allQuestions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No questions found in quiz bank'
            });
        }

        // Shuffle all questions to avoid sequential bias
        const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);

        // Generate unique paper ID
        const paperId = generatePaperId();

        // Store questions in initial_question_paper table
        for (const q of shuffledQuestions) {
            await pool.execute(
                `INSERT INTO initial_question_paper (paper_ID, q_ID, student_ID, response) 
                 VALUES (?, ?, ?, NULL)`,
                [paperId, q.q_ID, userId]
            );
        }

        // Format questions for frontend
        const formattedQuestions = shuffledQuestions.map(q => {
            const options = parseOptions(q.option_text);

            // Validate: must have exactly 4 options
            if (options.length !== 4) {
                console.warn(`Question ${q.q_ID} has ${options.length} options instead of 4`);
            }

            return {
                id: q.q_ID,
                category: q.category,
                difficulty: q.difficulty_rate?.trim(),
                question: q.question?.trim(),
                options: options,
                correctAnswer: q.correct_answer?.trim()
            };
        });

        // Verify distribution
        const categoryCounts = {
            'Analytical Thinking': formattedQuestions.filter(q => q.category === 'Analytical Thinking').length,
            'Computational Thinking': formattedQuestions.filter(q => q.category === 'Computational Thinking').length,
            'Programming': formattedQuestions.filter(q => q.category === 'Programming').length
        };

        res.json({
            success: true,
            paperId: paperId,
            totalQuestions: formattedQuestions.length,
            distribution: categoryCounts,
            questions: formattedQuestions
        });
    } catch (error) {
        console.error('Get initial quiz error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

/**
 * Submit answer for a question
 */
const submitAnswer = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paperId, questionId, response } = req.body;

        // Update the response in initial_question_paper
        await pool.execute(
            `UPDATE initial_question_paper 
             SET response = ? 
             WHERE paper_ID = ? AND q_ID = ? AND student_ID = ?`,
            [response, paperId, questionId, userId]
        );

        res.json({
            success: true,
            message: 'Answer saved'
        });
    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

/**
 * Complete the initial quiz and update user status
 */
const completeQuiz = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paperId, answers } = req.body;

        // If answers array is provided, save all responses
        if (answers && Array.isArray(answers)) {
            for (const answer of answers) {
                await pool.execute(
                    `UPDATE initial_question_paper 
                     SET response = ? 
                     WHERE paper_ID = ? AND q_ID = ? AND student_ID = ?`,
                    [answer.response, paperId, answer.questionId, userId]
                );
            }
        }

        // Update student status to 1 (quiz completed)
        await pool.execute(
            'UPDATE student SET status = 1 WHERE student_ID = ?',
            [userId]
        );

        // Get updated user data
        const [rows] = await pool.execute(
            'SELECT student_ID, name, email, profile_pic, status, level FROM student WHERE student_ID = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = rows[0];

        res.json({
            success: true,
            message: 'Quiz completed successfully!',
            user: {
                id: user.student_ID,
                email: user.email,
                name: user.name,
                level: user.level,
                status: user.status,
                profilePic: user.profile_pic
            }
        });
    } catch (error) {
        console.error('Complete quiz error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

module.exports = { getInitialQuiz, submitAnswer, completeQuiz };
