const API_KEY = 'AIzaSyDFOQ-4WMrl6xp27xPveLLfJnc24-uhOiE';
const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=' + API_KEY;

let currentQuestion = null;
let score = 0;
let questionCount = 0;
let timer = null;
let timeLeft = 30;

// Track asked questions by their content (use a JSON string of the question for comparison)
let askedQuestions = [];

const fallbackQuestions = {
    generalKnowledge: [
        { question: "What is the capital of France?", options: ["Paris", "London", "Berlin", "Madrid"], correctIndex: 0 },
        { question: "What is the largest ocean on Earth?", options: ["Pacific", "Atlantic", "Indian", "Arctic"], correctIndex: 0 },
    ],
    science: [
        { question: "What is the chemical symbol for water?", options: ["H2O", "O2", "CO2", "H2"], correctIndex: 0 },
        { question: "What planet is known as the Red Planet?", options: ["Mars", "Venus", "Jupiter", "Saturn"], correctIndex: 0 },
    ],
    history: [
        { question: "Who was the first president of the United States?", options: ["George Washington", "Abraham Lincoln", "Thomas Jefferson", "John Adams"], correctIndex: 0 },
        { question: "In which year did World War II end?", options: ["1945", "1918", "1939", "1960"], correctIndex: 0 },
    ],
    tech: [
        { question: "Who is the co-founder of Microsoft?", options: ["Bill Gates", "Steve Jobs", "Mark Zuckerberg", "Elon Musk"], correctIndex: 0 },
        { question: "What programming language is used primarily for web development?", options: ["JavaScript", "Python", "C#", "Java"], correctIndex: 0 },
    ],
    sports: [
        { question: "Which country won the FIFA World Cup in 2018?", options: ["France", "Brazil", "Germany", "Argentina"], correctIndex: 0 },
        { question: "How many players are there on a standard basketball team?", options: ["5", "6", "7", "8"], correctIndex: 0 },
    ],
};

let retryAttempts = 0;

const startScreen = document.querySelector('.start-screen');
const quizContainer = document.querySelector('.quiz-container');
const resultScreen = document.querySelector('.result-screen');
const questionElement = document.getElementById('question');
const optionsContainer = document.querySelector('.options-container');
const options = document.querySelectorAll('.option');
const nextButton = document.getElementById('next-btn');
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');
const finalScoreElement = document.getElementById('final-score');
const loadingSpinner = document.querySelector('.loading-spinner');

document.getElementById('start-btn').addEventListener('click', startQuiz);
document.getElementById('restart-btn').addEventListener('click', restartQuiz);
nextButton.addEventListener('click', loadNextQuestion);

async function generateQuestion(category) {
    const prompt = `Generate a multiple choice question about ${category} with 4 options. 
    Return it in the following JSON format without any additional text or explanation:
    {
        "question": "the question text",
        "options": ["option1", "option2", "option3", "option4"],
        "correctIndex": 0
    }`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const questionData = JSON.parse(data.candidates[0].content.parts[0].text);
            return questionData;
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error generating question:', error);

        if (retryAttempts < 50) {
            retryAttempts++;
            return await generateQuestion(category);
        }

        const categoryQuestions = fallbackQuestions[category] || fallbackQuestions.generalKnowledge;
        const randomQuestion = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
        return randomQuestion;
    }
}

function startQuiz() {
    score = 0;
    questionCount = 0;
    retryAttempts = 0;
    scoreElement.textContent = '0';
    askedQuestions = []; // Clear asked questions when starting a new quiz
    startScreen.style.display = 'none';
    quizContainer.style.display = 'block';
    loadNextQuestion();
}

function restartQuiz() {
    resultScreen.style.display = 'none';
    startScreen.style.display = 'block';
    score = 0;
    questionCount = 0;
    retryAttempts = 0;
    scoreElement.textContent = '0';
    askedQuestions = []; // Clear asked questions when restarting
}

async function loadNextQuestion() {
    if (questionCount >= 5) {
        showResults();
        return;
    }

    const category = document.getElementById('category').value;
    nextButton.style.display = 'none';
    loadingSpinner.style.display = 'flex';
    questionElement.style.display = 'none';
    optionsContainer.style.display = 'none';

    options.forEach(option => {
        option.className = 'option';
        option.disabled = false;
    });

    clearInterval(timer);
    timeLeft = 30;
    timeElement.textContent = timeLeft;

    try {
        let newQuestion;
        let retries = 0;

        // Try to fetch a new, unique question
        while (true) {
            newQuestion = await generateQuestion(category);

            // Ensure the question hasn't been asked before
            const isDuplicate = askedQuestions.some(q => JSON.stringify(q) === JSON.stringify(newQuestion));
            if (!isDuplicate) {
                askedQuestions.push(newQuestion); // Add to the list of asked questions
                break;
            }

            retries++;
            if (retries >= 5) {
                throw new Error('Unable to fetch unique question after several attempts');
            }
        }

        currentQuestion = newQuestion;

        questionElement.textContent = currentQuestion.question;
        currentQuestion.options.forEach((option, index) => {
            options[index].textContent = option;
        });

        questionElement.style.display = 'block';
        optionsContainer.style.display = 'block';
        loadingSpinner.style.display = 'none';
        startTimer();
        questionCount++;
    } catch (error) {
        console.error('Error:', error);
        questionElement.textContent = 'Error loading question. Please try again.';
        questionElement.style.display = 'block';
        loadingSpinner.style.display = 'none';
    }
}

function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        timeElement.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timer);
            handleTimeout();
        }
    }, 1000);
}

function handleTimeout() {
    options.forEach(option => option.disabled = true);
    options[currentQuestion.correctIndex].classList.add('correct');
    nextButton.style.display = 'block';
}

options.forEach(option => {
    option.addEventListener('click', () => {
        clearInterval(timer);
        const selectedIndex = parseInt(option.dataset.index);

        options.forEach(opt => opt.disabled = true);

        if (selectedIndex === currentQuestion.correctIndex) {
            option.classList.add('correct');
            score += Math.ceil(timeLeft / 3);
            scoreElement.textContent = score;
        } else {
            option.classList.add('wrong');
            options[currentQuestion.correctIndex].classList.add('correct');
        }

        nextButton.style.display = 'block';
    });
});

function showResults() {
    quizContainer.style.display = 'none';
    resultScreen.style.display = 'block';
    finalScoreElement.textContent = score;

    setTimeout(() => {
        restartQuiz();
    }, 5000);
}

window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
    return false;
};
