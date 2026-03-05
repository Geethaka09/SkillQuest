const pool = require('./config/database');
pool.execute('SELECT week_number,step_ID,step_name,step_status,LENGTH(learning_content) as content_length,question,gen_QID FROM study_plan WHERE student_ID="S0001" ORDER BY week_number,step_ID,gen_QID')
    .then(([r]) => {
        const steps = {};
        for (const row of r) {
            const k = 'W' + row.week_number + 'S' + row.step_ID;
            if (!steps[k]) {
                steps[k] = { topic: row.step_name, questions: 0, hasContent: false };
            }
            steps[k].questions++;
            if (row.content_length > 0) steps[k].hasContent = true;
        }
        console.log(JSON.stringify(steps, null, 2));
        process.exit(0);
    })
    .catch(e => {
        console.error(e.message);
        process.exit(1);
    });
