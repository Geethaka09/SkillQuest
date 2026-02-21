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
            // Split by option prefixes (a), b), c), d))
            // This regex matches a) b) c) d) case-insensitive, ensuring they are preceded by start-of-line or whitespace
            // to avoid matching "word)" inside text
            const parts = text.split(/(?:^|\s)[a-d]\)/i);
            // Filter out empty strings (usually the part before 'a)')
            options = parts.map(opt => opt.trim()).filter(opt => opt.length > 0);
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

        // Verify user exists
        const [userCheck] = await pool.execute(
            'SELECT student_ID FROM student WHERE student_ID = ?',
            [userId]
        );
        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Check if user already has an active or completed quiz paper
        const [existingPapers] = await pool.execute(
            'SELECT DISTINCT paper_ID FROM initial_question_paper WHERE student_ID = ? ORDER BY paper_ID DESC LIMIT 1',
            [userId]
        );

        let paperId;
        let questionsData = [];

        if (existingPapers.length > 0) {
            // Resume existing paper
            paperId = existingPapers[0].paper_ID;

            // Fetch existing questions
            const [existingQuestions] = await pool.execute(
                `SELECT iqp.q_ID, qb.question, qb.option_text, qb.correct_answer, qb.category, qb.difficulty_rate, iqp.response
                 FROM initial_question_paper iqp
                 JOIN quiz_bank qb ON iqp.q_ID = qb.q_ID
                 WHERE iqp.paper_ID = ? AND iqp.student_ID = ?`,
                [paperId, userId]
            );
            questionsData = existingQuestions;
        } else {
            // Create new paper with sequential ID
            const [maxIdResult] = await pool.execute('SELECT MAX(paper_ID) as maxId FROM initial_question_paper');
            const nextId = (maxIdResult[0].maxId || 0) + 1;
            paperId = nextId;

            // Define the balanced distribution
            // Define the balanced distribution (Total: 20 questions)
            const distribution = [
                { category: 'Analytical Thinking', difficulty: 'Easy', count: 3 },
                { category: 'Analytical Thinking', difficulty: 'Moderate', count: 2 },
                { category: 'Analytical Thinking', difficulty: 'Hard', count: 2 },
                { category: 'Computational Thinking', difficulty: 'Easy', count: 3 },
                { category: 'Computational Thinking', difficulty: 'Moderate', count: 2 },
                { category: 'Computational Thinking', difficulty: 'Hard', count: 2 },
                { category: 'Programming', difficulty: 'Easy', count: 2 },
                { category: 'Programming', difficulty: 'Moderate', count: 2 },
                { category: 'Programming', difficulty: 'Hard', count: 2 },
            ];

            let allQuestions = [];

            // Fetch questions for each category/difficulty combination
            for (const dist of distribution) {
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

            // Shuffle questions
            const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
            questionsData = shuffledQuestions;

            // Store questions
            for (const q of shuffledQuestions) {
                await pool.execute(
                    `INSERT INTO initial_question_paper (paper_ID, q_ID, student_ID, response) 
                 VALUES (?, ?, ?, NULL)`,
                    [paperId, q.q_ID, userId]
                );
            }
        }

        // Format questions for frontend
        const formattedQuestions = questionsData.map(q => {
            const options = parseOptions(q.option_text);

            return {
                id: q.q_ID, // Use q_ID from DB
                category: q.category,
                difficulty: q.difficulty_rate?.trim(),
                question: q.question?.trim(),
                options: options,
                correctAnswer: q.correct_answer?.trim(),
                savedResponse: q.response || null // Previously saved answer for resume
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

        // Verify user exists
        const [userCheck] = await pool.execute(
            'SELECT student_ID FROM student WHERE student_ID = ?',
            [userId]
        );
        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

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

        // Verify user exists
        const [userCheck] = await pool.execute(
            'SELECT student_ID FROM student WHERE student_ID = ?',
            [userId]
        );
        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

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

        // Calculate scores
        const [results] = await pool.execute(
            `SELECT 
                iqp.response,
                qb.correct_answer,
                qb.category
             FROM initial_question_paper iqp
             JOIN quiz_bank qb ON iqp.q_ID = qb.q_ID
             WHERE iqp.paper_ID = ? AND iqp.student_ID = ?`,
            [paperId, userId]
        );

        let at_score = 0;
        let ct_score = 0;
        let p_score = 0;

        for (const row of results) {
            // Normalize strings for comparison
            const userAns = (row.response || '').trim().toLowerCase();
            const correctAns = (row.correct_answer || '').trim().toLowerCase();

            // Check if answer is correct
            const isMatch = userAns === correctAns ||
                (userAns.length > 1 && correctAns.includes(userAns)) ||
                (correctAns.length > 1 && userAns.includes(correctAns));

            if (userAns && isMatch) {
                if (row.category === 'Analytical Thinking') at_score++;
                else if (row.category === 'Computational Thinking') ct_score++;
                else if (row.category === 'Programming') p_score++;
            }
        }

        const total_score = at_score + ct_score + p_score;

        // Update student status to 1 (quiz completed) and save scores
        await pool.execute(
            `UPDATE student 
             SET status = 1, at_score = ?, ct_score = ?, p_score = ? 
             WHERE student_ID = ?`,
            [at_score, ct_score, p_score, userId]
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
            results: {
                at_score,
                ct_score,
                p_score,
                total_score
            },
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
