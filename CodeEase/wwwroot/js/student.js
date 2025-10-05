// Student Dashboard JavaScript
class StudentDashboard {
    constructor() {
        this.currentTab = 'dashboard';
        this.currentLessonId = null;
        this.currentQuizId = null;
        this.currentAttemptId = null;
        this.quizTimer = null;
        this.timeRemaining = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
    }

    setupEventListeners() {
        // Tab navigation
        document.getElementById('dashboardTab').addEventListener('click', () => this.switchTab('dashboard'));
        document.getElementById('lessonsTab').addEventListener('click', () => this.switchTab('lessons'));
        document.getElementById('progressTab').addEventListener('click', () => this.switchTab('progress'));
        document.getElementById('quizzesTab').addEventListener('click', () => this.switchTab('quizzes'));

        // Lesson search
        document.getElementById('lessonSearch').addEventListener('input', (e) => this.filterLessons(e.target.value));

        // Modal buttons
        document.getElementById('markCompleteBtn').addEventListener('click', () => this.markLessonComplete());
        document.getElementById('takeQuizBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('submitQuizBtn').addEventListener('click', () => this.submitQuiz());
    }

    switchTab(tabName) {
        // Update button states
        document.querySelectorAll('.btn-group .btn').forEach(btn => {
            btn.classList.remove('active');
            btn.classList.add('btn-outline-primary');
            btn.classList.remove('btn-primary');
        });
        
        document.getElementById(tabName + 'Tab').classList.add('active', 'btn-primary');
        document.getElementById(tabName + 'Tab').classList.remove('btn-outline-primary');

        // Hide all content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });

        // Show selected content
        document.getElementById(tabName + 'Content').style.display = 'block';
        this.currentTab = tabName;

        // Load content based on tab
        switch(tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'lessons':
                this.loadLessons();
                break;
            case 'progress':
                this.loadProgress();
                break;
            case 'quizzes':
                this.loadQuizHistory();
                break;
        }
    }

    async loadDashboard() {
        try {
            this.showLoading();
            const response = await fetch('/api/student/dashboard', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load dashboard');

            const data = await response.json();
            this.updateDashboardStats(data);
            this.hideLoading();
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateDashboardStats(data) {
        document.getElementById('totalLessons').textContent = data.totalLessons;
        document.getElementById('completedLessons').textContent = data.completedLessons;
        document.getElementById('progressPercentage').textContent = Math.round(data.progressPercentage) + '%';
        document.getElementById('recentQuizzes').textContent = data.recentQuizAttempts.length;

        // Update recent progress
        const recentProgressHtml = data.recentProgress.map(progress => `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${progress.lesson.title}</h6>
                    <small class="text-muted">Last accessed: ${new Date(progress.lastAccessedAt).toLocaleDateString()}</small>
                </div>
                <span class="badge bg-${this.getStatusColor(progress.status)} rounded-pill">
                    ${this.getStatusText(progress.status)}
                </span>
            </div>
        `).join('');
        document.getElementById('recentProgress').innerHTML = recentProgressHtml || '<p class="text-muted">No recent activity</p>';

        // Update recent quiz results
        const recentQuizzesHtml = data.recentQuizAttempts.map(attempt => `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${attempt.quiz.title}</h6>
                    <small class="text-muted">Completed: ${new Date(attempt.completedAt).toLocaleDateString()}</small>
                </div>
                <span class="badge bg-${attempt.percentage >= 70 ? 'success' : 'warning'} rounded-pill">
                    ${Math.round(attempt.percentage)}%
                </span>
            </div>
        `).join('');
        document.getElementById('recentQuizResults').innerHTML = recentQuizzesHtml || '<p class="text-muted">No quiz attempts yet</p>';
    }

    async loadLessons() {
        try {
            this.showLoading();
            const response = await fetch('/api/student/lessons', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load lessons');

            const lessons = await response.json();
            this.displayLessons(lessons);
            this.hideLoading();
        } catch (error) {
            console.error('Error loading lessons:', error);
            this.showError('Failed to load lessons');
        }
    }

    displayLessons(lessons) {
        const lessonsHtml = lessons.map(lesson => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card lesson-card h-100" onclick="studentDashboard.openLesson('${lesson.id}')">
                    <div class="card-body">
                        <h5 class="card-title">${lesson.title}</h5>
                        <p class="card-text">${lesson.description || 'No description available'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-${this.getDifficultyColor(lesson.difficulty)}">
                                ${this.getDifficultyText(lesson.difficulty)}
                            </span>
                            <small class="text-muted">Order: ${lesson.orderIndex}</small>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('lessonsList').innerHTML = lessonsHtml || '<p class="text-muted">No lessons available</p>';
    }

    async openLesson(lessonId) {
        try {
            this.currentLessonId = lessonId;
            const response = await fetch(`/api/student/lessons/${lessonId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load lesson');

            const lesson = await response.json();
            this.displayLessonModal(lesson);
        } catch (error) {
            console.error('Error loading lesson:', error);
            this.showError('Failed to load lesson');
        }
    }

    displayLessonModal(lesson) {
        document.getElementById('lessonModalTitle').textContent = lesson.title;
        document.getElementById('lessonContent').innerHTML = `
            <div class="lesson-content">
                <div class="mb-3">
                    <h6>Description:</h6>
                    <p>${lesson.description || 'No description available'}</p>
                </div>
                <div class="mb-3">
                    <h6>Content:</h6>
                    <div class="border p-3 rounded">${lesson.content}</div>
                </div>
                ${lesson.codeExamples ? `
                    <div class="mb-3">
                        <h6>Code Examples:</h6>
                        <pre class="bg-light p-3 rounded"><code>${lesson.codeExamples}</code></pre>
                    </div>
                ` : ''}
            </div>
        `;

        // Show/hide quiz button
        const takeQuizBtn = document.getElementById('takeQuizBtn');
        if (lesson.quizzes && lesson.quizzes.length > 0) {
            takeQuizBtn.style.display = 'inline-block';
            this.currentQuizId = lesson.quizzes[0].id;
        } else {
            takeQuizBtn.style.display = 'none';
        }

        const modal = new bootstrap.Modal(document.getElementById('lessonModal'));
        modal.show();
    }

    async markLessonComplete() {
        try {
            const response = await fetch(`/api/student/progress/${this.currentLessonId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    status: 2, // Completed
                    completionPercentage: 100
                })
            });

            if (!response.ok) throw new Error('Failed to update progress');

            this.showSuccess('Lesson marked as complete!');
            bootstrap.Modal.getInstance(document.getElementById('lessonModal')).hide();
            
            if (this.currentTab === 'dashboard') {
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error updating progress:', error);
            this.showError('Failed to update progress');
        }
    }

    async startQuiz() {
        try {
            const response = await fetch(`/api/student/quizzes/${this.currentQuizId}/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to start quiz');

            const attempt = await response.json();
            this.currentAttemptId = attempt.id;
            
            bootstrap.Modal.getInstance(document.getElementById('lessonModal')).hide();
            this.loadQuiz();
        } catch (error) {
            console.error('Error starting quiz:', error);
            this.showError('Failed to start quiz');
        }
    }

    async loadQuiz() {
        try {
            const response = await fetch(`/api/student/quizzes/${this.currentQuizId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load quiz');

            const quiz = await response.json();
            this.displayQuizModal(quiz);
        } catch (error) {
            console.error('Error loading quiz:', error);
            this.showError('Failed to load quiz');
        }
    }

    displayQuizModal(quiz) {
        document.getElementById('quizModalTitle').textContent = quiz.title;
        
        // Setup timer if quiz has time limit
        if (quiz.timeLimit > 0) {
            this.timeRemaining = quiz.timeLimit * 60; // Convert to seconds
            document.getElementById('quizTimer').style.display = 'inline-block';
            this.startQuizTimer();
        }

        const questionsHtml = quiz.questions.map((question, index) => `
            <div class="quiz-question mb-4" data-question-id="${question.id}">
                <h6>Question ${index + 1} (${question.points} points)</h6>
                <p>${question.questionText}</p>
                ${question.codeSnippet ? `<pre class="bg-light p-2 rounded"><code>${question.codeSnippet}</code></pre>` : ''}
                
                ${this.renderQuestionOptions(question)}
            </div>
        `).join('');

        document.getElementById('quizContent').innerHTML = questionsHtml;

        const modal = new bootstrap.Modal(document.getElementById('quizModal'));
        modal.show();
    }

    renderQuestionOptions(question) {
        if (question.type === 1 || question.type === 2) { // Multiple Choice or True/False
            return question.options.map(option => `
                <div class="quiz-option" onclick="studentDashboard.selectOption('${question.id}', '${option.id}')">
                    <input type="radio" name="question_${question.id}" value="${option.id}" id="option_${option.id}">
                    <label for="option_${option.id}" class="ms-2">${option.optionText}</label>
                </div>
            `).join('');
        } else if (question.type === 4) { // Short Answer
            return `
                <textarea class="form-control" rows="3" placeholder="Enter your answer..." 
                         onchange="studentDashboard.setTextAnswer('${question.id}', this.value)"></textarea>
            `;
        }
        return '';
    }

    selectOption(questionId, optionId) {
        // Update UI
        document.querySelectorAll(`[data-question-id="${questionId}"] .quiz-option`).forEach(opt => {
            opt.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        // Submit answer
        this.submitAnswer(questionId, null, optionId);
    }

    setTextAnswer(questionId, answerText) {
        this.submitAnswer(questionId, answerText, null);
    }

    async submitAnswer(questionId, answerText, selectedOptionId) {
        try {
            const response = await fetch(`/api/student/quiz-attempts/${this.currentAttemptId}/answers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    questionId: questionId,
                    answerText: answerText,
                    selectedOptionId: selectedOptionId
                })
            });

            if (!response.ok) throw new Error('Failed to submit answer');
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    }

    async submitQuiz() {
        try {
            const response = await fetch(`/api/student/quiz-attempts/${this.currentAttemptId}/complete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to submit quiz');

            const result = await response.json();
            
            if (this.quizTimer) {
                clearInterval(this.quizTimer);
            }

            this.showQuizResults(result);
            bootstrap.Modal.getInstance(document.getElementById('quizModal')).hide();
        } catch (error) {
            console.error('Error submitting quiz:', error);
            this.showError('Failed to submit quiz');
        }
    }

    showQuizResults(result) {
        const percentage = Math.round(result.percentage);
        const passed = percentage >= 70;
        
        this.showSuccess(`Quiz completed! Score: ${result.score}/${result.maxScore} (${percentage}%) - ${passed ? 'Passed' : 'Failed'}`);
    }

    startQuizTimer() {
        this.quizTimer = setInterval(() => {
            this.timeRemaining--;
            
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            
            document.getElementById('timeRemaining').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.quizTimer);
                this.submitQuiz();
            }
        }, 1000);
    }

    async loadProgress() {
        try {
            this.showLoading();
            const response = await fetch('/api/student/progress', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load progress');

            const progress = await response.json();
            this.displayProgress(progress);
            this.hideLoading();
        } catch (error) {
            console.error('Error loading progress:', error);
            this.showError('Failed to load progress');
        }
    }

    displayProgress(progressList) {
        const progressHtml = progressList.map(progress => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">${progress.lesson.title}</h6>
                        <span class="badge bg-${this.getStatusColor(progress.status)}">
                            ${this.getStatusText(progress.status)}
                        </span>
                    </div>
                    <div class="progress mb-2">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${progress.completionPercentage}%"
                             aria-valuenow="${progress.completionPercentage}" 
                             aria-valuemin="0" aria-valuemax="100">
                            ${Math.round(progress.completionPercentage)}%
                        </div>
                    </div>
                    <small class="text-muted">
                        Started: ${new Date(progress.startedAt).toLocaleDateString()} | 
                        Time spent: ${progress.timeSpentMinutes} minutes
                        ${progress.completedAt ? ` | Completed: ${new Date(progress.completedAt).toLocaleDateString()}` : ''}
                    </small>
                </div>
            </div>
        `).join('');
        
        document.getElementById('progressList').innerHTML = progressHtml || '<p class="text-muted">No progress data available</p>';
    }

    async loadQuizHistory() {
        try {
            this.showLoading();
            const response = await fetch('/api/student/quiz-attempts', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load quiz history');

            const attempts = await response.json();
            this.displayQuizHistory(attempts);
            this.hideLoading();
        } catch (error) {
            console.error('Error loading quiz history:', error);
            this.showError('Failed to load quiz history');
        }
    }

    displayQuizHistory(attempts) {
        const historyHtml = attempts.map(attempt => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${attempt.quiz.title}</h6>
                            <p class="mb-1">Attempt #${attempt.attemptNumber}</p>
                            <small class="text-muted">
                                Started: ${new Date(attempt.startedAt).toLocaleDateString()}
                                ${attempt.completedAt ? ` | Completed: ${new Date(attempt.completedAt).toLocaleDateString()}` : ' | In Progress'}
                            </small>
                        </div>
                        <div class="text-end">
                            <h5 class="mb-0">
                                <span class="badge bg-${attempt.percentage >= 70 ? 'success' : 'warning'}">
                                    ${attempt.score}/${attempt.maxScore} (${Math.round(attempt.percentage)}%)
                                </span>
                            </h5>
                            ${attempt.isCompleted ? 
                                `<small class="text-${attempt.percentage >= 70 ? 'success' : 'danger'}">
                                    ${attempt.percentage >= 70 ? 'Passed' : 'Failed'}
                                </small>` : 
                                '<small class="text-warning">In Progress</small>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('quizHistory').innerHTML = historyHtml || '<p class="text-muted">No quiz attempts yet</p>';
    }

    filterLessons(searchTerm) {
        const lessonCards = document.querySelectorAll('#lessonsList .lesson-card');
        lessonCards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const description = card.querySelector('.card-text').textContent.toLowerCase();
            const matches = title.includes(searchTerm.toLowerCase()) || description.includes(searchTerm.toLowerCase());
            card.parentElement.style.display = matches ? 'block' : 'none';
        });
    }

    // Utility methods
    getStatusColor(status) {
        const colors = { 0: 'secondary', 1: 'warning', 2: 'success', 3: 'info' };
        return colors[status] || 'secondary';
    }

    getStatusText(status) {
        const texts = { 0: 'Not Started', 1: 'In Progress', 2: 'Completed', 3: 'Paused' };
        return texts[status] || 'Unknown';
    }

    getDifficultyColor(difficulty) {
        const colors = { 1: 'success', 2: 'warning', 3: 'danger' };
        return colors[difficulty] || 'secondary';
    }

    getDifficultyText(difficulty) {
        const texts = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
        return texts[difficulty] || 'Unknown';
    }

    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    showSuccess(message) {
        // You can implement a toast notification system here
        alert(message);
    }

    showError(message) {
        // You can implement a toast notification system here
        alert('Error: ' + message);
    }
}

// Initialize the dashboard when the page loads
let studentDashboard;
document.addEventListener('DOMContentLoaded', function() {
    studentDashboard = new StudentDashboard();
});