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
        // This would show a modal with quiz analytics
        // Implementation depends on the analytics data structure
        console.log('Quiz Analytics:', analytics);
        showToast('Analytics feature coming soon!', 'info');
    }
}

// Initialize quiz manager
const quizManager = new QuizManager();