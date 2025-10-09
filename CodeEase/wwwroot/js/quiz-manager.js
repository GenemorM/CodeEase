// Quiz Manager Module for Teacher Dashboard
class QuizManager {
    constructor() {
        this.quizzes = [];
        this.filteredQuizzes = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.loadQuizzes();
        });
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('quizSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndRenderQuizzes();
            });
        }

        // Filter functionality
        document.querySelectorAll('[data-filter]').forEach(filterBtn => {
            filterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentFilter = e.target.dataset.filter;
                this.filterAndRenderQuizzes();
            });
        });

        // Tab switch event
        const quizzesTab = document.getElementById('quizzes-tab');
        if (quizzesTab) {
            quizzesTab.addEventListener('shown.bs.tab', () => {
                this.loadQuizzes();
            });
        }
    }

    async loadQuizzes() {
        try {
            const response = await makeAuthenticatedRequest('/api/teacher/quizzes', 'GET');
            if (response.ok) {
                this.quizzes = await response.json();
                this.filterAndRenderQuizzes();
            } else {
                console.error('Failed to load quizzes');
                this.renderEmptyState('Failed to load quizzes');
            }
        } catch (error) {
            console.error('Error loading quizzes:', error);
            this.renderEmptyState('Error loading quizzes');
        }
    }

    filterAndRenderQuizzes() {
        this.filteredQuizzes = this.quizzes.filter(quiz => {
            // Apply search filter
            const matchesSearch = !this.searchTerm || 
                quiz.title.toLowerCase().includes(this.searchTerm) ||
                quiz.description?.toLowerCase().includes(this.searchTerm);

            // Apply status filter
            const matchesFilter = this.currentFilter === 'all' || 
                (this.currentFilter === 'published' && quiz.isPublished) ||
                (this.currentFilter === 'draft' && !quiz.isPublished) ||
                (this.currentFilter === 'archived' && quiz.isArchived);

            return matchesSearch && matchesFilter;
        });

        this.renderQuizzes();
    }

    renderQuizzes() {
        const container = document.getElementById('quizzesContainer');
        if (!container) return;

        if (this.filteredQuizzes.length === 0) {
            this.renderEmptyState();
            return;
        }

        container.innerHTML = this.filteredQuizzes.map(quiz => this.renderQuizCard(quiz)).join('');
    }

    renderQuizCard(quiz) {
        const statusBadge = quiz.isPublished 
            ? '<span class="badge bg-success">Published</span>'
            : '<span class="badge bg-warning">Draft</span>';

        const questionsCount = quiz.questions?.length || 0;
        const totalPoints = quiz.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0;

        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 quiz-card" data-quiz-id="${quiz.id}">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-question-circle text-primary me-2"></i>
                            <span class="fw-bold">${quiz.title}</span>
                        </div>
                        ${statusBadge}
                    </div>
                    <div class="card-body">
                        ${quiz.description ? `<p class="text-muted small mb-2">${quiz.description}</p>` : ''}
                        
                        <div class="row text-center mb-3">
                            <div class="col-4">
                                <div class="text-primary fw-bold">${questionsCount}</div>
                                <small class="text-muted">Questions</small>
                            </div>
                            <div class="col-4">
                                <div class="text-success fw-bold">${totalPoints}</div>
                                <small class="text-muted">Points</small>
                            </div>
                            <div class="col-4">
                                <div class="text-info fw-bold">${quiz.timeLimit}m</div>
                                <small class="text-muted">Time Limit</small>
                            </div>
                        </div>

                        ${quiz.lesson ? `
                            <div class="mb-2">
                                <small class="text-muted">
                                    <i class="fas fa-book me-1"></i>
                                    ${quiz.lesson.title}
                                </small>
                            </div>
                        ` : ''}

                        <div class="mb-2">
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>
                                Created ${new Date(quiz.createdAt).toLocaleDateString()}
                            </small>
                        </div>

                        ${quiz.attempts && quiz.attempts.length > 0 ? `
                            <div class="mb-2">
                                <small class="text-success">
                                    <i class="fas fa-users me-1"></i>
                                    ${quiz.attempts.length} student${quiz.attempts.length !== 1 ? 's' : ''} attempted
                                </small>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="btn-group w-100" role="group">
                            <button type="button" class="btn btn-sm btn-outline-primary" onclick="quizManager.editQuiz('${quiz.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-info" onclick="quizManager.previewQuiz('${quiz.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-success" onclick="quizManager.duplicateQuiz('${quiz.id}')">
                                <i class="fas fa-copy"></i>
                            </button>
                            ${quiz.isPublished ? `
                                <button type="button" class="btn btn-sm btn-outline-warning" onclick="quizManager.unpublishQuiz('${quiz.id}')">
                                    <i class="fas fa-eye-slash"></i>
                                </button>
                            ` : `
                                <button type="button" class="btn btn-sm btn-outline-success" onclick="quizManager.publishQuiz('${quiz.id}')">
                                    <i class="fas fa-share"></i>
                                </button>
                            `}
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="quizManager.deleteQuiz('${quiz.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderEmptyState(message = null) {
        const container = document.getElementById('quizzesContainer');
        if (!container) return;

        const defaultMessage = this.searchTerm || this.currentFilter !== 'all' 
            ? 'No quizzes match your current filters'
            : 'No quizzes created yet';

        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas fa-question-circle fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">${message || defaultMessage}</h5>
                    ${!this.searchTerm && this.currentFilter === 'all' ? `
                        <p class="text-muted mb-3">Create your first quiz to get started!</p>
                        <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#quizCreationModal">
                            <i class="fas fa-plus me-2"></i>Create Quiz
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async editQuiz(quizId) {
        try {
            const response = await makeAuthenticatedRequest(`/api/teacher/quiz/${quizId}`, 'GET');
            if (response.ok) {
                const quiz = await response.json();
                
                // Populate the quiz creation modal with existing data
                if (typeof quizCreator !== 'undefined') {
                    quizCreator.loadQuizForEditing(quiz);
                    
                    // Show the modal
                    const modal = new bootstrap.Modal(document.getElementById('quizCreationModal'));
                    modal.show();
                } else {
                    showToast('Quiz editor not available', 'error');
                }
            } else {
                showToast('Failed to load quiz for editing', 'error');
            }
        } catch (error) {
            console.error('Error loading quiz for editing:', error);
            showToast('Error loading quiz', 'error');
        }
    }

    async previewQuiz(quizId) {
        try {
            const response = await makeAuthenticatedRequest(`/api/teacher/quiz/${quizId}`, 'GET');
            if (response.ok) {
                const quiz = await response.json();
                
                if (typeof quizCreator !== 'undefined') {
                    quizCreator.showQuizPreview(quiz);
                } else {
                    showToast('Quiz preview not available', 'error');
                }
            } else {
                showToast('Failed to load quiz for preview', 'error');
            }
        } catch (error) {
            console.error('Error loading quiz for preview:', error);
            showToast('Error loading quiz', 'error');
        }
    }

    async duplicateQuiz(quizId) {
        try {
            const response = await makeAuthenticatedRequest(`/api/teacher/quiz/${quizId}/duplicate`, 'POST');
            if (response.ok) {
                showToast('Quiz duplicated successfully!', 'success');
                this.loadQuizzes(); // Refresh the list
            } else {
                const error = await response.text();
                showToast(`Failed to duplicate quiz: ${error}`, 'error');
            }
        } catch (error) {
            console.error('Error duplicating quiz:', error);
            showToast('Error duplicating quiz', 'error');
        }
    }

    async publishQuiz(quizId) {
        if (!confirm('Are you sure you want to publish this quiz? Students will be able to take it once published.')) {
            return;
        }

        try {
            const response = await makeAuthenticatedRequest(`/api/teacher/quiz/${quizId}/publish`, 'POST');
            if (response.ok) {
                showToast('Quiz published successfully!', 'success');
                this.loadQuizzes(); // Refresh the list
            } else {
                const error = await response.text();
                showToast(`Failed to publish quiz: ${error}`, 'error');
            }
        } catch (error) {
            console.error('Error publishing quiz:', error);
            showToast('Error publishing quiz', 'error');
        }
    }

    async unpublishQuiz(quizId) {
        if (!confirm('Are you sure you want to unpublish this quiz? Students will no longer be able to take it.')) {
            return;
        }

        try {
            const response = await makeAuthenticatedRequest(`/api/teacher/quiz/${quizId}/unpublish`, 'POST');
            if (response.ok) {
                showToast('Quiz unpublished successfully!', 'success');
                this.loadQuizzes(); // Refresh the list
            } else {
                const error = await response.text();
                showToast(`Failed to unpublish quiz: ${error}`, 'error');
            }
        } catch (error) {
            console.error('Error unpublishing quiz:', error);
            showToast('Error unpublishing quiz', 'error');
        }
    }

    async deleteQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) return;

        const hasAttempts = quiz.attempts && quiz.attempts.length > 0;
        const confirmMessage = hasAttempts 
            ? `Are you sure you want to delete "${quiz.title}"? This quiz has ${quiz.attempts.length} student attempt(s) and cannot be recovered.`
            : `Are you sure you want to delete "${quiz.title}"? This action cannot be undone.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await makeAuthenticatedRequest(`/api/teacher/quiz/${quizId}`, 'DELETE');
            if (response.ok) {
                showToast('Quiz deleted successfully!', 'success');
                this.loadQuizzes(); // Refresh the list
            } else {
                const error = await response.text();
                showToast(`Failed to delete quiz: ${error}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting quiz:', error);
            showToast('Error deleting quiz', 'error');
        }
    }

    async getQuizAnalytics(quizId) {
        try {
            const response = await makeAuthenticatedRequest(`/api/teacher/quiz/${quizId}/analytics`, 'GET');
            if (response.ok) {
                const analytics = await response.json();
                this.showAnalyticsModal(analytics);
            } else {
                showToast('Failed to load quiz analytics', 'error');
            }
        } catch (error) {
            console.error('Error loading quiz analytics:', error);
            showToast('Error loading analytics', 'error');
        }
    }

    showAnalyticsModal(analytics) {
        // Create analytics modal HTML
        const modalHtml = `
            <div class="modal fade" id="quizAnalyticsModal" tabindex="-1" aria-labelledby="quizAnalyticsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="quizAnalyticsModalLabel">
                                <i class="fas fa-chart-bar me-2"></i>Quiz Analytics: ${analytics.quizTitle}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Overview Cards -->
                            <div class="row mb-4">
                                <div class="col-md-3">
                                    <div class="card bg-primary text-white">
                                        <div class="card-body text-center">
                                            <h3>${analytics.totalAttempts}</h3>
                                            <p class="mb-0">Total Attempts</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card bg-success text-white">
                                        <div class="card-body text-center">
                                            <h3>${analytics.completedAttempts}</h3>
                                            <p class="mb-0">Completed</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card bg-info text-white">
                                        <div class="card-body text-center">
                                            <h3>${analytics.uniqueStudents}</h3>
                                            <p class="mb-0">Unique Students</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card bg-warning text-white">
                                        <div class="card-body text-center">
                                            <h3>${analytics.averageScore.toFixed(1)}%</h3>
                                            <p class="mb-0">Average Score</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Score Distribution -->
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6 class="mb-0">Score Statistics</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between mb-2">
                                                <span>Highest Score:</span>
                                                <strong>${analytics.highestScore.toFixed(1)}%</strong>
                                            </div>
                                            <div class="d-flex justify-content-between mb-2">
                                                <span>Average Score:</span>
                                                <strong>${analytics.averageScore.toFixed(1)}%</strong>
                                            </div>
                                            <div class="d-flex justify-content-between mb-2">
                                                <span>Lowest Score:</span>
                                                <strong>${analytics.lowestScore.toFixed(1)}%</strong>
                                            </div>
                                            <div class="d-flex justify-content-between">
                                                <span>Avg. Time Spent:</span>
                                                <strong>${analytics.averageTimeSpent.toFixed(1)} min</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6 class="mb-0">Completion Rate</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="progress mb-2" style="height: 25px;">
                                                <div class="progress-bar bg-success" role="progressbar" 
                                                     style="width: ${(analytics.completedAttempts / analytics.totalAttempts * 100).toFixed(1)}%">
                                                    ${(analytics.completedAttempts / analytics.totalAttempts * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                            <small class="text-muted">
                                                ${analytics.completedAttempts} of ${analytics.totalAttempts} attempts completed
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Student Performance Table -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">Student Performance</h6>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table class="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>Student</th>
                                                    <th>Attempts</th>
                                                    <th>Best Score</th>
                                                    <th>Latest Score</th>
                                                    <th>Avg. Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${analytics.studentPerformances.map(student => `
                                                    <tr>
                                                        <td>${student.studentName}</td>
                                                        <td>${student.attemptCount}</td>
                                                        <td><span class="badge bg-success">${student.bestScore.toFixed(1)}%</span></td>
                                                        <td><span class="badge bg-primary">${student.latestScore.toFixed(1)}%</span></td>
                                                        <td>${student.timeSpent.toFixed(1)} min</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <!-- Question Analytics -->
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Question Performance</h6>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table class="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>Question</th>
                                                    <th>Type</th>
                                                    <th>Total Answers</th>
                                                    <th>Correct Answers</th>
                                                    <th>Success Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${analytics.questionAnalytics.map((question, index) => `
                                                    <tr>
                                                        <td>
                                                            <div class="text-truncate" style="max-width: 300px;" title="${question.questionText}">
                                                                Q${index + 1}: ${question.questionText}
                                                            </div>
                                                        </td>
                                                        <td><span class="badge bg-secondary">${question.questionType}</span></td>
                                                        <td>${question.totalAnswers}</td>
                                                        <td>${question.correctAnswers}</td>
                                                        <td>
                                                            <div class="d-flex align-items-center">
                                                                <div class="progress me-2" style="width: 100px; height: 20px;">
                                                                    <div class="progress-bar ${question.successRate >= 70 ? 'bg-success' : question.successRate >= 50 ? 'bg-warning' : 'bg-danger'}" 
                                                                         style="width: ${question.successRate}%"></div>
                                                                </div>
                                                                <span class="small">${question.successRate.toFixed(1)}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="window.print()">
                                <i class="fas fa-print me-1"></i>Print Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('quizAnalyticsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('quizAnalyticsModal'));
        modal.show();

        // Clean up modal when hidden
        document.getElementById('quizAnalyticsModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }
}

// Initialize quiz manager
const quizManager = new QuizManager();